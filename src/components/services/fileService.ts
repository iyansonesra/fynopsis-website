import { create } from 'zustand';
import * as AmplifyAPI from "aws-amplify/api";
import { post } from 'aws-amplify/api';
import { usePathname } from 'next/navigation';




export interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  metadata: any;
  s3Key?: string;
  s3KeyArray?: string[];
  children: { [key: string]: TreeNode };
  parent?: TreeNode;
  size?: number;
  LastModified?: string;
}

interface S3Object {
  key: string;
  metadata: any;
}

interface S3State {
  objects: S3Object[];
  tree: TreeNode;
  currentNode: TreeNode;
  isLoading: boolean;
  searchQuery: string;
  filteredObjects: S3Object[];
  searchableFiles: S3Object[];
  fetchObjects: (bucketUuid: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  navigateToPath: (path: string[]) => void;
  createFolder: (folderName: string, bucketUuid: string) => Promise<void>;
  // updateFolderStatus: (folderPath: string, isPending: boolean) => void;
  deleteItem: (folderName: string, bucketUuid: string, isFolder: boolean) => Promise<void>;
  moveItem: (sourceKey: string, destinationKey: string, bucketUuid: string, currEmail: string, changersEmail: string) => Promise<TreeNode>;
  changeCurrentNode: (child: string) => void;
  goBack: () => void;
  clearTree: () => void;
}

const createTreeStructure = (objects: S3Object[]): TreeNode => {
  const tree: TreeNode = {
    name: 'root',
    type: 'folder',
    metadata: {},
    children: {}
  };

  for (const obj of objects) {
    const parts = obj.key.split('/').filter(part => part !== '');

    let currentLevel = tree;
    let currKey = "";
    let currKeyArray = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currKey += part;
      currKeyArray.push(part);
      const isLastPart = i === parts.length - 1;
      const isFile = !obj.key.endsWith('/') && isLastPart;

      if (!currentLevel.children[part]) {
        currentLevel.children[part] = {
          name: part,
          type: isFile ? 'file' : 'folder',
          metadata: isLastPart ? obj.metadata.Metadata : {},
          s3Key: isFile ? currKey : currKey + '/',
          s3KeyArray: currKey.split('/').filter(part => part !== ''),
          children: {},
          parent: currentLevel,
          size: (isLastPart && isFile) ? obj.metadata.ContentLength : 0,
          LastModified: obj.metadata.LastModified
        };
      }
      currentLevel = currentLevel.children[part];
      currKey += "/";
    }
  }

  return tree;
};



export const useS3Store = create<S3State>()(((set, get) => ({

  objects: [],
  tree: { name: 'root', type: 'folder', metadata: {}, children: {} },
  currentNode: { name: 'root', type: 'folder', metadata: {}, children: {} },
  isLoading: false,
  searchQuery: '',
  filteredObjects: [],
  searchableFiles: [],
  fetchObjects: async (bucketUuid: string) => {

    set({ isLoading: true });
    // try {
    //   const restOperation = AmplifyAPI.get({
    //     apiName: 'S3_API',
    //     path: `/s3/${bucketUuid}/head-objects-for-bucket`,
    //     options: { withCredentials: true }
    //   });
    //   const { body } = await restOperation.response;
    //   const responseText = await body.text();
    //   const response = JSON.parse(responseText);


    //   response.headObjects.forEach((obj: any) => {
    //     if (obj.metadata && obj.metadata.Metadata.pre_upload) {
    //       if (obj.metadata.Metadata.pre_upload === "COMPLETE") {
    //         set((state) => {
    //           // Check if file already exists in searchableFiles
    //           const exists = state.searchableFiles.some(file => file.key === obj.key);
    //           if (!exists) {
    //             return {
    //               searchableFiles: [
    //                 ...state.searchableFiles,
    //                 {
    //                   key: obj.key,
    //                   metadata: {
    //                     ...obj.metadata.Metadata,
    //                     originalname: obj.key.split('/').pop()
    //                   }
    //                 }
    //               ]
    //             };
    //           }
    //           return state;
    //         });
    //       }
    //     }


    //   });

    //   get().searchableFiles.forEach((file) => {
    //   });

    //   if (response.headObjects) {
    //     const objects = response.headObjects;
    //     const tree = createTreeStructure(objects);
    //     set({ currentNode: tree.children[bucketUuid] });
    //     set({
    //       objects,
    //       tree,
    //       filteredObjects: objects
    //     });

    //   }
    // } catch (error) {
    //   console.error('Error fetching S3 objects:', error);
    // } finally {
    //   set({ isLoading: false });
    //   get().isLoading
    // }
  },
  navigateToPath: (path: string[]) => {
    return new Promise<void>((resolve) => {
      const state = get();
      let node = state.tree;

      for (const pathPart of path) {
        if (node.children[pathPart]) {
          node = node.children[pathPart];
        } else {
          console.error(`Path segment ${pathPart} not found`);
          resolve();
          return;
        }
      }


      set({ currentNode: node });
      resolve();
    });
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
  },
  createFolder: async (folderName: string, bucketUuid: string) => {
    const state = get();
    const currentPath = (state.currentNode.s3KeyArray ?? []).join('/') + '/';
    const folderPath = `${bucketUuid}/${currentPath}${folderName}/`;
    let s3Upload = currentPath;
    if (s3Upload === '/') {
      s3Upload = '';
    }
    let passIn = `${s3Upload}${folderName}/`;


    // Add folder to tree immediately with pending status
    const newFolder: TreeNode = {
      name: folderName,
      type: 'folder',
      metadata: { isPending: true },
      children: {},
      parent: state.currentNode,
      s3Key: folderPath
    };

    // Update current node with new folder
    const updatedNode = {
      ...state.currentNode,
      children: {
        ...state.currentNode.children,
        [folderName]: newFolder
      }
    };

    let tempo = state.currentNode;
    tempo.children[folderName] = newFolder;

    set({ currentNode: tempo });


    try {
      const response = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/create-folder`,
        options: {
          withCredentials: true,
          body: {
            folderPath: passIn
          }
        }
      });

      const { body } = await response.response;
      const result = await body.json();

      // get().updateFolderStatus(folderPath, false);

    } catch (error) {
      console.error('Error creating folder:', error);
      // Remove folder from tree if API call fails
      const { [folderName]: removed, ...remainingChildren } = state.currentNode.children;
      const updatedNodeAfterError = {
        ...state.currentNode,
        children: remainingChildren
      };
      set({ currentNode: updatedNodeAfterError });
      throw error;
    }
  },
  // updateFolderStatus: (folderPath: string, isPending: boolean) => {
  //   const state = get();
  //   const pathParts = folderPath.split('/').filter(part => part !== '');
  //   let currentNode = state.tree;

  //   // Navigate to the folder's parent
  //   for (let i = 0; i < pathParts.length - 1; i++) {
  //     currentNode = currentNode.children[pathParts[i]];
  //   }

  //   // Update the folder's metadata
  //   const folderName = pathParts[pathParts.length - 1];
  //   if (currentNode.children[folderName]) {
  //     currentNode.children[folderName].metadata = {
  //       ...currentNode.children[folderName].metadata,
  //       isPending
  //     };
  //     set({ tree: { ...state.tree } });
  //   }
  // },
  deleteItem: async (folderName: string, bucketUuid: string, isFolder: boolean) => {
    const state = get();
    const currentPath = (state.currentNode.s3KeyArray ?? []).join('/') + '/';
    const folderPath = `${currentPath}${folderName}/`;
    const filePath = `${currentPath}${folderName}`;


    // Mark folder as pending deletion in the tree
    const updatedNode = {
      ...state.currentNode,
      children: {
        ...state.currentNode.children,
        [folderName]: {
          ...state.currentNode.children[folderName],
          metadata: { ...state.currentNode.children[folderName].metadata, isDeleting: true }
        }
      }
    };

    set({ currentNode: updatedNode });


    try {
      // Make API call to delete folder
      const response = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/delete-url`,
        options: {
          withCredentials: true,
          queryParams: {
            key: isFolder ? folderPath : filePath
          }
        }
      });

      const { body } = await response.response;
      const result = await body.json();

      // Remove folder from tree after successful deletion
      const { [folderName]: removed, ...remainingChildren } = state.currentNode.children;
      delete state.currentNode.children[folderName];

    } catch (error) {
      console.error('Error deleting folder:', error);
      // Revert the pending deletion status if the API call fails
      const revertedNode = {
        ...state.currentNode,
        children: {
          ...state.currentNode.children,
          [folderName]: {
            ...state.currentNode.children[folderName],
            metadata: { ...state.currentNode.children[folderName].metadata, isDeleting: false }
          }
        }
      };
      set({ currentNode: revertedNode });
      throw error;
    }
  },
  changeCurrentNode: (child: string) => {
    const state = get();
    const node = state.currentNode.children[child];
    if (node) {
      set({ currentNode: node });
    }
  },
  goBack: () => {
    const state = get();
    if (state.currentNode.parent) {
      set({ currentNode: state.currentNode.parent });
    }
  },
  clearTree: () => {
    set({
      objects: [],
      tree: { name: 'root', type: 'folder', metadata: {}, children: {} },
      currentNode: { name: 'root', type: 'folder', metadata: {}, children: {} },
      isLoading: false,
      searchQuery: '',
      filteredObjects: []
    });
  },
  moveItem: async (sourceKey: string, destinationKey: string, bucketUuid: string, currEmail: string, changersEmail: string): Promise<TreeNode> => { // websocket case
    const sourceParts = sourceKey.split('/').filter(part => part !== '');
    const destParts = destinationKey.split('/').filter(part => part !== '');


    let sourceNode = get().currentNode;
    while(sourceNode.name !== 'root') {
      sourceNode = sourceNode.parent as TreeNode;
    }

    sourceNode = sourceNode.children[bucketUuid];
    for (let i = 0; i < sourceParts.length - 1; i++) {
      sourceNode = sourceNode.children[sourceParts[i]];
    }

    // Find destination parent node
    let destParentNode = get().currentNode;
    while (destParentNode.name !== 'root') {
      destParentNode = destParentNode.parent as TreeNode;
    }
    destParentNode = destParentNode.children[bucketUuid];
    for (let i = 0; i < destParts.length - 1; i++) {
      destParentNode = destParentNode.children[destParts[i]];
    }




    const itemName = destParts[destParts.length - 1];




    // Move node in tree
    if (changersEmail !== currEmail && sourceNode.children[sourceParts[sourceParts.length-1]]) {
      const NodeToMove = sourceNode.children[sourceParts[sourceParts.length - 1]];
  
      NodeToMove.s3Key = bucketUuid + '/' + destinationKey;
      delete sourceNode.children[sourceParts[sourceParts.length - 1]];
      destParentNode.children[itemName] = NodeToMove;
    }

    const findNodeByName = (node: TreeNode, targetName: string): TreeNode | null => {
      if (node.name === targetName) {
        return node;
      }
      for (const childKey in node.children) {
        const found = findNodeByName(node.children[childKey], targetName);
        if (found) {
          return found;
        }
      }
      return null;
    };

    const currentNodeName = get().currentNode.name;
    let starter = get().currentNode;
    while (starter.name !== 'root') {
      starter = starter.parent as TreeNode;
    }

    const foundNode = findNodeByName(starter, currentNodeName);
    if (foundNode) {
      set({ currentNode: foundNode });
    }

    return destParentNode.children[itemName];
  }

})));







