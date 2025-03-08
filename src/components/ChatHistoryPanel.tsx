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
  initialQuery: string;
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
      const chatResponse = await get({
        apiName: 'S3_API',
        path: `/chat/${bucketId}/chat-history`,
        options: { withCredentials: true }
      });
      const { body } = await chatResponse.response;
      const responseText = await body.text();
      const { chats } = JSON.parse(responseText);
  
      if (!chats) {
        throw new Error('Failed to load chat history');
      }
      
  
      setChatHistories(chats);
      setError(null);
    } catch (error) {
      setError('Failed to load chat history');
      console.error('Error fetching chat histories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChatThread = async (threadId: string) => {
    try {
      setSelectedThreadId(threadId);
      const chatResponse = await post({
        apiName: 'S3_API',
        path: `/chat/${bucketId}/chat-thread`,
        options: {
          body: { threadId },
          withCredentials: true
        }
      });
      const { body } = await chatResponse.response;
      const responseText = await body.text();
      const parsedResponse = JSON.parse(responseText);
  
      // Extract messages from the history array
      const messages = parsedResponse.history
        .filter((msg: { role: string; }) => msg.role === 'HumanMessage' || msg.role === 'AIMessage')
        .map((msg: { content: any; role: string; }) => ({
          content: msg.content,
          role: msg.role === 'HumanMessage' ? 'user' : 'assistant',
          timestamp: new Date().toISOString() // You might want to add actual timestamps
        }));
  
      if (!messages || !Array.isArray(messages)) {
        throw new Error('Invalid response format: messages array is missing');
      }
  
      if (onThreadSelect) {
        onThreadSelect(messages);
      }
      setError(null);
    } catch (error) {
      setError('Failed to load chat thread');
      console.error('Error fetching chat thread:', error);
      setSelectedThreadId(null);
      if (onThreadSelect) {
        onThreadSelect([]);
      }
    }
  };

  useEffect(() => {
    fetchChatHistories();
  }, [bucketId]);

  if (isLoading) {
    return (
      <div className="p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 mb-2 rounded-lg dark:bg-slate-800 dark:border-none" />
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
            className="hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-slate-200 dark:bg-darkbg"
          >
            <ArrowLeft className="h-4 w-4 mr-2 dark:text-slate-200" />
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
              className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-slate-800 dark:text-gray-200 border-none dark:hover:bg-slate-900 transition-colors ${
                selectedThreadId === chat.threadId ? 'border-blue-500' : ''
              }`}
              onClick={() => fetchChatThread(chat.threadId)}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium dark:text-white">
                {chat.initialQuery}
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
