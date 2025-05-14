import { fetchAuthSession } from 'aws-amplify/auth';

// Shared Message Types
export interface ThoughtStep {
  number: number;
  content: string;
}

export interface Citation {
  id: string;
  stepNumber: string;
  fileKey: string;
  chunkText: string;
  position: number;
}

export interface MessageBatch {
  stepNumber: number;
  totalSteps: number;
  description: string;
  sources: Record<string, string>;
  isActive: boolean;
}

export interface Message {
  type: 'question' | 'answer' | 'error';
  content: string;
  sources?: any[];
  steps?: ThoughtStep[];
  progressText?: string;
  sourcingSteps?: string[];
  subSources?: Record<string, any>;
  citations?: Citation[];
  batches?: MessageBatch[];
  timestamp?: number;
}

export interface FileUpdateMessage {
  type: 'response' | 'complete' | 'progress' | 'batch' | 'status' | 'error';
  response?: string;
  thread_id?: string;
  sources?: Record<string, {
    page?: number;
    bounding_box?: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
    chunk_title?: string;
    is_secondary?: boolean;
    kg_properties?: any;
    page_num?: number;
  }>;
  step?: string;
  message?: string;
  items?: Array<{
    type: string;
    step_number?: number;
    total_steps?: number;
    description?: string;
  }>;
  error?: string;
  code?: number;
}

export interface MessageState {
  messages: Message[];
  currentThreadId: string;
  lastQuery: string;
}

type MessageStateListener = (state: MessageState) => void;

class StreamManager {
  private eventSource: EventSource | null = null;
  private messageHandlers: ((message: FileUpdateMessage) => void)[] = [];
  private stateListeners: MessageStateListener[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 30000; // 30 seconds
  private currentDataroomId: string | null = null;
  private isConnecting = false;
  private connectionRefs = 0;
  private pendingMessages: any[] = [];
  private baseUrl = process.env.NEXT_PUBLIC_SEARCH_API_URL || 'https://dev.fynopsis.ai';
  // Add a message log for debugging
  private messageLog: any[] = [];

  // State management
  private messageState: MessageState = {
    messages: [],
    currentThreadId: '',
    lastQuery: ''
  };

  constructor() {
    // Check if we need to reconnect on page load
    if (typeof window !== 'undefined') {
      const savedState = sessionStorage.getItem('stream_state');
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          if (state.dataroomId) {
            console.log('Restoring previous stream session state');

            // Restore message state if available
            if (state.messageState) {
              this.messageState = state.messageState;
            }

            // Note: We don't automatically reconnect since SSE connections are request-based
          }
        } catch (e) {
          console.error('Error parsing saved stream state', e);
          sessionStorage.removeItem('stream_state');
        }
      }
    }
  }

  // Message state management
  getMessageState(): MessageState {
    return { ...this.messageState };
  }

  addStateListener(listener: MessageStateListener) {
    this.stateListeners.push(listener);
    // Immediately notify new listener of current state
    listener(this.getMessageState());
  }

  removeStateListener(listener: MessageStateListener) {
    this.stateListeners = this.stateListeners.filter(l => l !== listener);
  }

  private notifyStateListeners() {
    const state = this.getMessageState();
    this.stateListeners.forEach(listener => listener(state));

    // Update session storage with latest state
    if (typeof window !== 'undefined' && this.currentDataroomId) {
      sessionStorage.setItem('stream_state', JSON.stringify({
        dataroomId: this.currentDataroomId,
        messageState: this.messageState
      }));
    }
  }

  // Message State Mutators
  setMessages(messages: Message[]) {
    this.messageState.messages = [...messages];
    this.notifyStateListeners();
  }

  addMessage(message: Message) {
    this.messageState.messages = [...this.messageState.messages, { ...message, timestamp: Date.now() }];
    this.notifyStateListeners();
  }

  updateLastMessage(update: Partial<Message>) {
    if (this.messageState.messages.length === 0) return;

    const messages = [...this.messageState.messages];
    const lastIndex = messages.length - 1;
    messages[lastIndex] = { ...messages[lastIndex], ...update };

    this.messageState.messages = messages;
    this.notifyStateListeners();
  }

  clearMessages() {
    this.messageState.messages = [];
    this.notifyStateListeners();
  }

  setCurrentThreadId(threadId: string) {
    this.messageState.currentThreadId = threadId;
    this.notifyStateListeners();
  }

  setLastQuery(query: string) {
    this.messageState.lastQuery = query;
    this.notifyStateListeners();
  }

  async connect(dataroomId: string) {
    // For SSE, we don't establish a persistent connection until query
    // We just store the dataroomId for future use
    this.currentDataroomId = dataroomId;
    this.connectionRefs = 1;

    // Save active dataroom ID to session storage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('stream_state', JSON.stringify({
        dataroomId,
        messageState: this.messageState
      }));
    }

    console.log('Stream manager initialized for dataroom:', dataroomId);
  }

  // This method starts a new SSE connection for a specific query
  async sendMessage(message: any) {
    // Close any existing connection
    this.disconnect();

    // Clear message log for new request
    this.messageLog = [];

    if (!this.currentDataroomId) {
      console.error('Cannot send message: No dataroom ID set');
      this.messageHandlers.forEach(handler =>
        handler({ type: 'error', error: 'No dataroom ID set' })
      );
      return;
    }

    try {
      this.isConnecting = true;
      console.log('Starting stream connection for query:', message);

      // Get the auth session
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      if (!idToken) {
        throw new Error('No ID token available');
      }

      // Prepare query parameters
      const queryParams = {
        collection_name: this.currentDataroomId,
        query: message.data.query,
        thread_id: message.data.thread_id || undefined,
        file_keys: message.data.file_keys || [],
        use_reasoning: message.data.use_reasoning || false,
        use_planning: message.data.use_planning || false,
        use_deep_search: message.data.use_deep_search || false,
        code_execution: false,
        web_search: false,
        format_params: {}
      };

      // Create a headers object with the Authorization token
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
        'Accept': 'text/event-stream'
      });

      // Create the request with credentials
      const request = new Request(`${this.baseUrl}/query/stream`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(queryParams),
        mode: 'cors',
        // credentials: 'include'
      });

      console.log('Sending stream request to:', `${this.baseUrl}/query/stream`);
      console.log('With headers:', JSON.stringify(Array.from(headers.entries())));
      console.log('With body:', JSON.stringify(queryParams));

      // Create an abort controller to timeout the connection if it doesn't connect in 3 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error('Stream connection timed out after 3 seconds');
        controller.abort();
      }, 3000);

      // Start the fetch request but don't await it, passing the abort signal
      fetch(request, { signal: controller.signal })
        .then(response => {
          clearTimeout(timeoutId);
          if (!response.ok) {
            console.error(`Stream response not OK: ${response.status} ${response.statusText}`);
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          console.log('Stream response headers:', JSON.stringify(Array.from(response.headers.entries())));
          console.log('Stream connected with status:', response.status);

          // Create a new ReadableStream from the response body
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Response body reader could not be created');
          }

          // Set up a text decoder
          const decoder = new TextDecoder();
          let buffer = '';

          // Function to process chunks
          const processChunks = async () => {
            try {
              while (true) {
                const { value, done } = await reader.read();

                if (done) {
                  console.log('Stream reader done, processing remaining buffer:', buffer);
                  // Process any remaining data in the buffer
                  if (buffer.trim()) {
                    this.processEventData(buffer);
                  }

                  // Signal completion
                  this.messageHandlers.forEach(handler =>
                    handler({ type: 'complete' })
                  );

                  // Log all messages received during this stream
                  console.log('Complete message log:', JSON.stringify(this.messageLog));
                  break;
                }

                // Decode the chunk and add to buffer
                const chunk = decoder.decode(value, { stream: true });
                console.log('Raw chunk received:', chunk);
                console.log("_____________________________________________");

                // Split the chunk by 'data:' to handle multiple messages
                const messages = chunk.split('data:').filter(msg => msg.trim());
                
                for (const message of messages) {
                  try {
                    const jsonData = JSON.parse(message.trim());
                    console.log("Parsed JSON:", jsonData);
                    console.log("_____________________________________________");
                    this.messageHandlers.forEach(handler =>
                      handler(jsonData)
                    );
                  } catch (e) {
                    console.log("Failed to parse JSON:", message);
                    console.log("_____________________________________________");
                  }
                }
              }
            } catch (error) {
              console.error('Error processing stream:', error);
              this.messageHandlers.forEach(handler =>
                handler({
                  type: 'error',
                  error: `Stream processing error: ${error instanceof Error ? error.message : String(error)}`
                })
              );
            } finally {
              this.isConnecting = false;
            }
          };

          // Start processing chunks
          processChunks();
        })
        .catch(error => {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            console.error('Stream connection timed out');
            this.isConnecting = false;
            this.messageHandlers.forEach(handler =>
              handler({ type: 'error', error: 'Stream connection timed out' })
            );
            return;
          }
          console.error('Stream request error:', error);
          this.isConnecting = false;
          this.messageHandlers.forEach(handler =>
            handler({
              type: 'error',
              error: `Stream connection error: ${error instanceof Error ? error.message : String(error)}`
            })
          );
        });

    } catch (error) {
      this.isConnecting = false;
      console.error('Error setting up stream:', error);
      this.messageHandlers.forEach(handler =>
        handler({
          type: 'error',
          error: `Error setting up stream: ${error instanceof Error ? error.message : String(error)}`
        })
      );
    }
  }

  // Process incoming SSE data
  private processEventData(eventData: string) {
    // Split the event string by lines
    const lines = eventData.split('\n');
    let eventType = '';
    let data = '';

    // Parse the event
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        data = line.substring(5).trim();
      }
    }

    // Log the event components
    console.log('Event type:', eventType || 'none');
    console.log('Event data:', data || 'none');

    // If there's data, try to parse it
    if (data) {
      try {
        // Try to parse as JSON first
        const jsonData = JSON.parse(data);
        console.log('Parsed JSON data:', jsonData);

        // Add to message log
        this.messageLog.push({
          timestamp: new Date().toISOString(),
          eventType,
          data: jsonData
        });

        // Process based on event type if specified, otherwise process based on data.type
        if (eventType === 'complete') {
          this.messageHandlers.forEach(handler => handler({ type: 'complete' }));
        } else if (jsonData && typeof jsonData === 'object') {
          // Forward the message to all handlers
          this.messageHandlers.forEach(handler => handler(jsonData));
        }
      } catch (e) {
        // If not valid JSON, treat as raw text response
        console.log('Received non-JSON data:', data);

        // Add to message log
        this.messageLog.push({
          timestamp: new Date().toISOString(),
          eventType,
          rawData: data
        });

        // Forward as a response type message
        this.messageHandlers.forEach(handler =>
          handler({ type: 'response', response: data })
        );
      }
    } else {
      // Log empty events too
      this.messageLog.push({
        timestamp: new Date().toISOString(),
        eventType: eventType || 'unknown',
        empty: true
      });
    }
  }

  addMessageHandler(handler: (message: FileUpdateMessage) => void) {
    this.messageHandlers.push(handler);
  }

  removeMessageHandler(handler: (message: FileUpdateMessage) => void) {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  release() {
    if (this.connectionRefs > 0) {
      this.connectionRefs--;
      console.log(`Released stream connection, ref count: ${this.connectionRefs}`);
    }

    // Only disconnect when no more references
    if (this.connectionRefs === 0) {
      this.disconnect();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('stream_state');
      }
    }
  }

  disconnect() {
    // For SSE, we simply abort any ongoing requests
    if (this.eventSource) {
      console.log('Closing SSE connection');
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  // Check if we're connected to a specific dataroom
  isConnectedTo(dataroomId: string): boolean {
    // For SSE, we're "connected" if the dataroomId matches
    return this.currentDataroomId === dataroomId;
  }

  // Add method to get message log
  getMessageLog() {
    return [...this.messageLog];
  }
}

// Singleton instance
const streamManager = new StreamManager();
export default streamManager;