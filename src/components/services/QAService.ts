import { fetchAuthSession } from 'aws-amplify/auth';
import { get, post, patch } from 'aws-amplify/api';

// Backend API interfaces
export interface Issue {
  id: string;
  questionId?: string;
  title?: string;
  question?: string;
  description?: string;
  status: 'open' | 'closed';
  tags: string[];
  createdByUserId: string;
  createdByUserName: string;
  timestamp: string;
  lastUpdated: string;
  answers: Answer[];
  issueNumber?: number; // Add the new field
}

export interface Answer {
  id: string;
  answerId?: string;
  content?: string;
  answer?: string;
  createdByUserId: string;
  createdByUserName: string;
  timestamp: string;
}

export interface CreateIssueRequest {
  question: string;
  description?: string;
  status: 'open' | 'closed';
  tags: string[];
  fileContext?: string;
}

export interface CreateAnswerRequest {
  answer: string;
}

export interface UpdateStatusRequest {
  status: 'open' | 'closed';
}

// Frontend UI interface (matches what the UI expects)
export interface FrontendIssue {
  id: number | string;
  title: string;
  status: 'open' | 'closed';
  author: string;
  createdByUserId?: string;
  createdByUserName?: string;
  number?: number | string;
  createdAt: string;
  timestamp?: string;
  tags: string[];
  comments: number;
  answers?: any[];
  description?: string;
  lastUpdated?: string;
  issueNumber?: number; // Add the new field
}

class QAService {
  /**
   * Get all issues for a dataroom
   */
  async getIssues(bucketId: string, status: 'all' | 'open' | 'closed' = 'all', limit = 50, lastEvaluatedKey?: string): Promise<{
    items: FrontendIssue[];
    lastEvaluatedKey: string | null;
  }> {
    try {
      const queryParams: any = {
        limit: limit.toString()
      };
      
      if (status !== 'all') {
        queryParams.status = status;
      }
      
      if (lastEvaluatedKey) {
        queryParams.lastEvaluatedKey = lastEvaluatedKey;
      }
      
      const response = await get({
        apiName: 'S3_API',
        path: `/qa/${bucketId}`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          queryParams,
          withCredentials: true
        }
      });
      
      const { body } = await response.response;
      const responseData = await body.json();

      
      // Transform the response data to backend format first
      let backendItems: Issue[] = [];
      let lastKey: string | null = null;
      
      if (responseData) {
        if (Array.isArray(responseData)) {
          backendItems = responseData.map((item: any) => this.mapQuestionToIssue(item));
        } else if (typeof responseData === 'object') {
          if (responseData.items && Array.isArray(responseData.items)) {
            backendItems = responseData.items.map((item: any) => this.mapQuestionToIssue(item));
          }
          
          if (responseData.lastEvaluatedKey && typeof responseData.lastEvaluatedKey === 'string') {
            lastKey = responseData.lastEvaluatedKey;
          }
        }
      }
      
      // Then transform to frontend format
      const frontendItems = backendItems.map(item => this.mapToFrontend(item));
      
      return {
        items: frontendItems,
        lastEvaluatedKey: lastKey
      };
    } catch (error) {
      console.error('Error fetching issues:', error);
      throw error;
    }
  }
  
  /**
   * Get a specific issue by ID
   */
  async getIssue(bucketId: string, issueId: string): Promise<FrontendIssue> {
    try {
      const response = await get({
        apiName: 'S3_API',
        path: `/qa/${bucketId}/${issueId}`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      });
      
      const { body } = await response.response;
      const responseData = await body.json();

      
      const backendIssue = this.mapQuestionToIssue(responseData);
      return this.mapToFrontend(backendIssue);
    } catch (error) {
      console.error('Error fetching issue:', error);
      throw error;
    }
  }
  
  /**
   * Create a new issue
   */
  async createIssue(bucketId: string, issue: CreateIssueRequest | any): Promise<FrontendIssue> {
    try {
      const response = await post({
        apiName: 'S3_API',
        path: `/qa/${bucketId}`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(issue)
        }
      });
      
      const { body } = await response.response;
      const responseData = await body.json();
      
      const backendIssue = this.mapQuestionToIssue(responseData);
      return this.mapToFrontend(backendIssue);
    } catch (error) {
      console.error('Error creating issue:', error);
      throw error;
    }
  }
  
  /**
   * Add an answer to an issue
   */
  async addAnswer(bucketId: string, issueId: string, answer: CreateAnswerRequest): Promise<Answer> {
    try {
      const response = await post({
        apiName: 'S3_API',
        path: `/qa/${bucketId}/${issueId}/answers`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(answer),
          withCredentials: true
        }
      });
      
      const { body } = await response.response;
      const responseData = await body.json();
      
      return this.mapAnswerResponse(responseData);
    } catch (error) {
      console.error('Error adding answer:', error);
      throw error;
    }
  }
  
  /**
   * Update an issue's status
   */
  async updateIssueStatus(bucketId: string, issueId: string, request: UpdateStatusRequest): Promise<FrontendIssue> {
    try {
      const response = await post({
        apiName: 'S3_API',
        path: `/qa/${bucketId}/${issueId}/status`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request),
          withCredentials: true
        }
      });
      
      const { body } = await response.response;
      const responseData = await body.json();
      
      const backendIssue = this.mapQuestionToIssue(responseData);
      return this.mapToFrontend(backendIssue);
    } catch (error) {
      console.error('Error updating issue status:', error);
      throw error;
    }
  }
  
  /**
   * Map Lambda question response to frontend Issue model
   */
  private mapQuestionToIssue(question: any): Issue {
    return {
      id: question.questionId || question.id,
      questionId: question.questionId || question.id,
      title: question.question || question.title,
      question: question.question,
      status: question.status || 'open',
      createdByUserId: question.CreatedByUserId || question.createdByUserId || '',
      createdByUserName: question.createdByName || question.CreatedByUserName || question.createdByUserName || 'Anonymous',
      timestamp: question.timestamp || new Date().toISOString(),
      lastUpdated: question.lastUpdated || question.timestamp || new Date().toISOString(),
      tags: question.tags || [],
      description: question.description || question.fileContext || '',
      answers: (question.answers || []).map((a: any) => this.mapAnswerResponse(a)),
      issueNumber: question.issueNumber || null // Map the new field
    };
  }
  
  /**
   * Map Lambda answer response to frontend Answer model
   */
  private mapAnswerResponse(answer: any): Answer {
    return {
      id: answer.answerId || answer.id,
      answerId: answer.answerId,
      content: answer.answer || answer.content,
      answer: answer.answer,
      createdByUserId: answer.CreatedByUserId || answer.createdByUserId || '',
      createdByUserName: answer.createdByName || answer.CreatedByUserName || answer.createdByUserName || 'Anonymous',
      timestamp: answer.timestamp || new Date().toISOString()
    };
  }

  /**
   * Maps backend Issue to frontend format expected by UI components
   */
  mapToFrontend(backendIssue: Issue | any): FrontendIssue {
    return {
      id: backendIssue.questionId || backendIssue.id,
      title: backendIssue.question || backendIssue.title || '',
      status: (backendIssue.status || 'open') as 'open' | 'closed',
      author: backendIssue.createdByUserName || backendIssue.createdByName || 'Anonymous',
      createdByUserId: backendIssue.createdByUserId || '',
      createdByUserName: backendIssue.createdByUserName || backendIssue.createdByName || 'Anonymous',
      number: backendIssue.questionId || backendIssue.id,
      createdAt: backendIssue.timestamp ? `opened ${new Date(backendIssue.timestamp).toLocaleString()}` : 'opened recently',
      timestamp: backendIssue.timestamp || new Date().toISOString(),
      tags: backendIssue.tags || [],
      comments: Array.isArray(backendIssue.answers) ? backendIssue.answers.length : 0,
      answers: backendIssue.answers || [],
      description: backendIssue.description || backendIssue.fileContext || '',
      lastUpdated: backendIssue.lastUpdated || backendIssue.timestamp || new Date().toISOString(),
      issueNumber: backendIssue.issueNumber || null // Map the new field
    };
  }
  
  /**
   * Get auth headers for API requests
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    return {
      'Content-Type': 'application/json'
    };
  }
}

// Export as singleton
export const qaService = new QAService(); 

// Add this helper function to your QAService
export const extractUniqueTagsFromIssues = (issues: FrontendIssue[]): string[] => {
  // Create a Set to automatically handle duplicates
  const uniqueTags = new Set<string>();
  
  // Collect all tags from all issues
  issues.forEach(issue => {
    if (issue.tags && Array.isArray(issue.tags)) {
      issue.tags.forEach(tag => uniqueTags.add(tag));
    }
  });
  
  // Convert Set back to array and sort alphabetically
  return Array.from(uniqueTags).sort();
};