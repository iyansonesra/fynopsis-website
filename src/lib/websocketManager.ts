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

class WebSocketManager {
  private ws: WebSocket | null = null;
  private messageHandlers: ((message: FileUpdateMessage) => void)[] = [];
  private stateListeners: MessageStateListener[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private currentDataroomId: string | null = null;
  private isConnecting = false;
  private connectionRefs = 0;
  private pendingMessages: any[] = [];
  
  // State management
  private messageState: MessageState = {
    messages: [],
    currentThreadId: '',
    lastQuery: ''
  };

  constructor() {
    // Check if we need to reconnect on page load
    if (typeof window !== 'undefined') {
      const savedState = sessionStorage.getItem('websocket_state');
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          if (state.dataroomId) {
            console.log('Attempting to reconnect to previous WebSocket session');
            
            // Restore message state if available
            if (state.messageState) {
              this.messageState = state.messageState;
            }
            
            this.connect(state.dataroomId);
          }
        } catch (e) {
          console.error('Error parsing saved WebSocket state', e);
          sessionStorage.removeItem('websocket_state');
        }
      }
    }
  }

  // Message state management
  getMessageState(): MessageState {
    return {...this.messageState};
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
      sessionStorage.setItem('websocket_state', JSON.stringify({
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
    this.messageState.messages = [...this.messageState.messages, {...message, timestamp: Date.now()}];
    this.notifyStateListeners();
  }

  updateLastMessage(update: Partial<Message>) {
    if (this.messageState.messages.length === 0) return;
    
    const messages = [...this.messageState.messages];
    const lastIndex = messages.length - 1;
    messages[lastIndex] = {...messages[lastIndex], ...update};
    
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
    // Save active dataroom ID to session storage for reconnection after refresh
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('websocket_state', JSON.stringify({ 
        dataroomId,
        messageState: this.messageState
      }));
    }

    // If we're already connected to this dataroom, just increment the ref count
    if (this.currentDataroomId === dataroomId && 
       (this.ws?.readyState === WebSocket.OPEN || 
        this.ws?.readyState === WebSocket.CONNECTING || 
        this.isConnecting)) {
      this.connectionRefs++;
      console.log(`Already connected to dataroom ${dataroomId}, ref count: ${this.connectionRefs}`);
      return;
    }
    
    // If we're connecting to a different dataroom, disconnect first
    if (this.currentDataroomId && this.currentDataroomId !== dataroomId) {
      this.disconnect();
    }
    
    this.connectionRefs = 1;
    this.currentDataroomId = dataroomId;
    this.isConnecting = true;
    
    try {
      console.log('Connecting to WebSocket for dataroom:', dataroomId);
      
      // Get the auth session directly
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      
      if (!idToken) {
        throw new Error('No ID token available');
      }
      
      // Create WebSocket URL directly
      const wsUrl = `wss://${process.env.NEXT_PUBLIC_SEARCH_API_CODE}.execute-api.${process.env.NEXT_PUBLIC_REGION}.amazonaws.com/prod?idToken=${idToken}&dataroomId=${dataroomId}`;
      
      // Close existing connection if open
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        this.ws.close();
      }
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected to dataroom:', dataroomId);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Set up ping to keep connection alive every 50 seconds
        this.setupPingInterval();
        
        // Process any pending messages
        this.processPendingMessages();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as FileUpdateMessage;
          console.log('WebSocket message received:', message);
          this.messageHandlers.forEach(handler => handler(message));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        this.isConnecting = false;
        console.log(`WebSocket disconnected from dataroom: ${dataroomId}, code: ${event.code}, reason: ${event.reason || 'No reason provided'}`);
        this.clearPingInterval();
        
        // Only attempt to reconnect for non-normal closure or if we didn't initiate the close
        if (event.code !== 1000 && event.code !== 1001 && this.connectionRefs > 0) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        this.isConnecting = false;
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      this.isConnecting = false;
      console.error('Error connecting to WebSocket:', error);
    }
  }

  // Rest of the original WebSocketManager methods...
  private setupPingInterval() {
    this.clearPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ action: 'ping' }));
          console.log('Ping sent to keep connection alive');
        } catch (err) {
          console.error('Error sending ping:', err);
        }
      }
    }, 50000); // 50 seconds
  }

  private clearPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private processPendingMessages() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.pendingMessages.length > 0) {
      console.log(`Processing ${this.pendingMessages.length} pending messages`);
      
      while (this.pendingMessages.length > 0) {
        const message = this.pendingMessages.shift();
        this.sendMessage(message);
      }
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.currentDataroomId) {
      console.log('Max reconnect attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      console.log(`Reconnecting (attempt ${this.reconnectAttempts})...`);
      this.connect(this.currentDataroomId!);
    }, delay);
  }

  sendMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('Cannot send message: WebSocket not connected');
      // Store message to send when connection is established
      this.pendingMessages.push(message);
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
      console.log(`Released WebSocket connection, ref count: ${this.connectionRefs}`);
    }
    
    // Only disconnect when no more references
    if (this.connectionRefs === 0) {
      this.disconnect();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('websocket_state');
      }
    }
  }

  disconnect() {
    this.connectionRefs = 0;
    this.clearPingInterval();
    this.currentDataroomId = null;
    
    if (this.ws) {
      console.log('Disconnecting WebSocket');
      this.ws.close(1000, 'Disconnected by client');
      this.ws = null;
    }
  }

  // Check if we're connected to a specific dataroom
  isConnectedTo(dataroomId: string): boolean {
    return this.currentDataroomId === dataroomId && 
           this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
const websocketManager = new WebSocketManager();
export default websocketManager;