import { create } from 'zustand';
import { get } from "aws-amplify/api";

interface S3Object {
  key: string;
  metadata: any;
}

interface S3State {
  objects: S3Object[];
  isLoading: boolean;
  fetchObjects: (bucketUuid: string) => Promise<void>;
}

export const useS3Store = create<S3State>((set) => ({
  objects: [],
  isLoading: false,
  fetchObjects: async (bucketUuid: string) => {
    set({ isLoading: true });
    try {
      const restOperation = get({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/head-objects-for-bucket`,
        options: { withCredentials: true }
      });
      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      
      if (response.headObjects) {
        set({ objects: response.headObjects });
      }
    } catch (error) {
      console.error('Error fetching S3 objects:', error);
    } finally {
      set({ isLoading: false });
    }
  }
}));
