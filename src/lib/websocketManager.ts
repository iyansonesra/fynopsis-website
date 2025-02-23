import { fetchAuthSession } from 'aws-amplify/auth';

export type FileUpdateMessage = {
  type: 'FILE_UPLOADED' | 'FILE_DELETED' | 'FILE_MOVED' | 'FILE_UPDATED';
  data: {
    filePath: string;
    newPath: string;
    uploadedBy?: string;
    timestamp: string;
    metadata?: any;
    userEmail: string;
  };
};

class WebSocketManager {
  private ws: WebSocket | null = null;
  private messageHandlers: ((message: FileUpdateMessage) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async connect(dataroomId: string) {
    try {
      console.log('inside connect');
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      
      if (!idToken) {
        throw new Error('No ID token available');
      }

      // Replace with your WebSocket endpoint
      const wsUrl = `wss://${process.env.NEXT_PUBLIC_FILE_TRACKING_API_CODE}.execute-api.${process.env.NEXT_PUBLIC_REGION}.amazonaws.com/prod?idToken=${idToken}&dataroomId=${dataroomId}`;
      
      this.ws = new WebSocket(wsUrl);

      console.log("currently still trying to c");

      this.ws.onopen = () => {
        console.log('WebSocket connected to dataroom:', dataroomId);
        this.reconnectAttempts = 0;
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

      this.ws.onclose = () => {
        console.log('WebSocket disconnected from dataroom:', dataroomId);
        this.attemptReconnect(dataroomId);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }

  private attemptReconnect(dataroomId: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(dataroomId);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  addMessageHandler(handler: (message: FileUpdateMessage) => void) {
    this.messageHandlers.push(handler);
  }

  removeMessageHandler(handler: (message: FileUpdateMessage) => void) {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsManager = new WebSocketManager();
