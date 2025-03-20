import { fetchAuthSession } from 'aws-amplify/auth';

export interface FileUpdateMessage {
  type: string;
  data: {
    fileId?: string;
    parentFolderId?: string;
    fileName?: string;
    filePath?: string;
    uploadedBy?: string;
    userEmail?: string;
    timestamp?: string;
    operation?: string;
    sourceId?: string;
    destinationId?: string;
    [key: string]: any;
  };
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private messageHandlers: ((message: FileUpdateMessage) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private currentDataroomId: string | null = null;
  private isConnecting = false;
  private connectionRefs = 0;

  async connect(dataroomId: string) {
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
      const wsUrl = `wss://${process.env.NEXT_PUBLIC_FILE_TRACKING_API_CODE}.execute-api.${process.env.NEXT_PUBLIC_REGION}.amazonaws.com/prod?idToken=${idToken}&dataroomId=${dataroomId}`;
      
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
