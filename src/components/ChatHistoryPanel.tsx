import React, { useEffect, useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';
import { MessageSquare, Clock, ArrowLeft } from 'lucide-react';
import { get, post } from 'aws-amplify/api';
import { formatDistanceToNow } from 'date-fns';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';

interface ChatHistory {
  threadId: string;
  created: string;
  lastUpdated: string;
}

interface ChatMessage {
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

interface ChatHistoryPanelProps {
  bucketId: string;
  onThreadSelect?: (messages: ChatMessage[]) => void;
  onBack?: () => void;
}

export const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({ 
  bucketId, 
  onThreadSelect,
  onBack 
}) => {
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const fetchChatHistories = async () => {
    try {
      setIsLoading(true);
      const response = await get({
        apiName: 'S3_API',
        path: `/chat/${bucketId}/chat-history`,
        options: { withCredentials: true }
      }).response;
      
      const data = (await response.body.json() as unknown) as { chats: ChatHistory[] };
      if (data == null) {
        throw new Error('Failed to load chat history');
    }
      setChatHistories(data.chats);
      setError(null);
    } catch (err) {
      setError('Failed to load chat history');
      console.error('Error fetching chat histories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChatThread = async (threadId: string) => {
    try {
      setSelectedThreadId(threadId);
      const response = await post({
        apiName: 'S3_API',
        path: `/chat/${bucketId}/chat-thread`,
        options: {
          body: { threadId },
          withCredentials: true
        }
      }).response;
      
      const data = (await response.body.json() as unknown) as { messages: ChatMessage[] };
      if (data == null) {
        throw new Error('Failed to load chat thread');
      }
      if (onThreadSelect) {
        onThreadSelect(data.messages);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load chat thread');
      console.error('Error fetching chat thread:', err);
    }
  };

  useEffect(() => {
    fetchChatHistories();
  }, [bucketId]);

  if (isLoading) {
    return (
      <div className="p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 mb-2 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        {error}
        <Button onClick={fetchChatHistories} variant="outline" className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-full">
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold dark:text-white">Chat History</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Button>
        </div>
        {chatHistories.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No chat history available
          </div>
        ) : (
          chatHistories.map((chat) => (
            <Card
              key={chat.threadId}
              className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                selectedThreadId === chat.threadId ? 'border-blue-500' : ''
              }`}
              onClick={() => fetchChatThread(chat.threadId)}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium dark:text-white">
                  Chat Session
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>
                  Last updated {formatDistanceToNow(new Date(chat.lastUpdated))} ago
                </span>
              </div>
            </Card>
          ))
        )}
      </div>
    </ScrollArea>
  );
};
