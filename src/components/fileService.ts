import { create } from 'zustand';
import * as AmplifyAPI from "aws-amplify/api";

interface S3Object {
  key: string;
  metadata: any;
}

interface S3State {
  objects: S3Object[];
  isLoading: boolean;
  searchQuery: string;
  filteredObjects: S3Object[];
  fetchObjects: (bucketUuid: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
}

export const useS3Store = create<S3State>()(((set, get) => ({
  objects: [],
  isLoading: false,
  searchQuery: '',
  filteredObjects: [],
  fetchObjects: async (bucketUuid: string) => {
    set({ isLoading: true });
    try {
      const restOperation = AmplifyAPI.get({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/head-objects-for-bucket`,
        options: { withCredentials: true }
      });
      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      
      if (response.headObjects) {
        const objects = response.headObjects;
        set({ 
          objects,
          filteredObjects: objects
        });
      }
    } catch (error) {
      console.error('Error fetching S3 objects:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  setSearchQuery: (query: string) => {
    const state = get();
    const filtered = state.objects.filter(obj => {
      const fileName = obj.metadata?.originalname || obj.key.split('/').pop() || '';
      return fileName.toLowerCase().includes(query.toLowerCase());
    });
    set({ 
      searchQuery: query,
      filteredObjects: filtered
    });
  }
})));
