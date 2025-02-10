import React, { use, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useS3Store, TreeNode } from "./fileService";
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, Circle, FileIcon, FolderIcon, Plus, RefreshCcw, Upload } from 'lucide-react';
import { Input } from './ui/input';
import DragDropOverlay from './DragDrop';
import { v4 as uuidv4 } from 'uuid';
import { fetchAuthSession, getCurrentUser, JWT } from 'aws-amplify/auth';
import { Skeleton } from '@mui/material';
import { get, post } from 'aws-amplify/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Folder, File } from 'lucide-react';
import { TagDisplay } from './TagsHover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card';
import { wsManager, FileUpdateMessage } from '@/lib/websocketManager';
import { FileOrganizerDialog, FileChange } from './FileOrganizerDialog';
import SnackbarContent from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import * as AmplifyAPI from "aws-amplify/api";
import path from 'path';
import { useParams, useRouter } from 'next/navigation';
import { useFileStore } from './HotkeyService';
import { ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Download, Pencil, Trash } from 'lucide-react';






interface FileNode {
  parentId: string;
  name: string;
  uploadedBy: string;
  type: string;
  size: string;
  id: string;
  isFolder: boolean;
  createByEmail: string;
  createByName: string;
  lastModified: string;
  tags: string[];
  summary: string;
  status: string;
  s3Url?: string;
}
const dummy: FileNode = {
  parentId: "dummy",
  name: "Loading...",
  uploadedBy: "Loading...",
  type: "file",
  size: "...",
  id: "dummy",
  isFolder: false,
  createByEmail: "loading@example.com",
  createByName: "Loading...",
  lastModified: new Date().toISOString(),
  tags: [],
  summary: "Loading...",
  status: "PENDING"
};


interface SortableItemProps {
  item: FileNode;
  loading: boolean;
}

interface FileHashMapping {
  [key: string]: string; // key = filename+size, value = fileHash
}



interface ResizableHeaderProps {
  column: string;
  width: string;
  // onResize: (column: string, width: string) => void;
  children: React.ReactNode;
}


interface FileSystemProps {
  onFileSelect: (file: FileNode) => void;
}


export const FileSystem: React.FC<FileSystemProps> = ({ onFileSelect }) => {
  const [tableData, setTableData] = useState<FileNode[]>([]);
  const pathname = usePathname() || '';
  const pathArray = pathname.split('/');
  const bucketUuid = pathArray[2] || '';
  const emailRef = useRef<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState<string>('');
  const [userInfo, setUserInfo] = React.useState<JWT | undefined>(undefined);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPath, setCurrentPath] = React.useState<string[]>([`${bucketUuid}`]);
  const [searchValue, setSearchValue] = React.useState('');
  const [showUploadOverlay, setShowUploadOverlay] = React.useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newRenameName, setNewRenameName] = useState('');

  const [newFolderName, setNewFolderName] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [cutFileKey, setCutFileKey] = useState<string | null>(null);
  const [cutFileName, setCutFileName] = useState<string | null>(null);
  const [cutNode, setCutNode] = useState<TreeNode | null>(null);
  const [cutPayment, setCutPayment] = useState<FileNode | null>(null);
  const dropZoneRef = useRef<HTMLTableSectionElement>(null);
  const [searchScope, setSearchScope] = useState('current');
  const [showFileOrganizer, setShowFileOrganizer] = useState(false);
  const { cutFile, setCutFile } = useFileStore();


  React.useEffect(() => {
    const handleKeyboardShortcuts = async (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {  // metaKey for Mac support
        if (e.key === 'x' && selectedItemId) {
          // Handle cut
          const selectedItem = tableData.find(item => item.id === selectedItemId);
          console.log("selected item:", selectedItem);
          if (selectedItem) {

            setCutFile(selectedItem);

            setTableData(prevData => prevData.map(item =>
              item.id === selectedItemId
                ? { ...item, status: 'GRAY' }
                : item
            ));

            // console.log('Cut:', selectedItem.s3Key);
          }
        } else if (e.key === 'v' && cutFile) {
          console.log("CUT FILE ID:", cutFile);



          try {
            await moveFile(cutFile.id, pathArray[3] === "home" ? "ROOT" : pathArray[3]);

            // Update the UI after successful move
            // Update the UI after successful move
            setTableData(prevData => sortTableData([...prevData, cutFile]));


            setCutFile(null);

          } catch (error) {
            // Revert the grayed out state if there's an error
            setTableData(prevData => prevData.map(item =>
              item.id === cutFile.id
                ? { ...item, uploadProcess: 'COMPLETED' }
                : item
            ));
            console.error('Error moving file:', error);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [selectedItemId, cutFileKey, currentPath, bucketUuid]);


  React.useEffect(() => {
    const fetchInitialData = async () => {
      const username = await getUserInfo();
      setCurrentUser(username);
      handleSetTableData(pathArray[3] === "home" ? "ROOT" : pathArray[3]);
    };

    fetchInitialData();
  }, [bucketUuid]); // Add bucketUuid as dependency since handleSetTableData uses it

  const getUserInfo = async () => {
    try {
      const userInfo = await getCurrentUser();
      const session = await fetchAuthSession();

      console.log("userinfo:", userInfo);
      console.log("signin details:", userInfo.signInDetails);
      // console.log("login id:", userInfo.signInDetails.loginId);

      console.log("SET EMAIL TO:", userInfo.signInDetails?.loginId || '');
      const email = userInfo.signInDetails?.loginId || '';
      // setUserEmail(email);
      emailRef.current = email;




      const idToken = session.tokens?.idToken;
      console.log('idToken:', idToken);
      setUserInfo(idToken);

      return userInfo.username;
    } catch (error) {
      console.error('Error getting user info:', error);
      return 'Unknown User';
    }
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // Slightly increase activation distance
        // tolerance: 5,
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100, // Add a small delay for touch
        tolerance: 5,
      }
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const moveFile = async (id: string, folderId: string) => {
    try {
      const response = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/move-url`,
        options: {
          withCredentials: true,
          body: {
            fileId: id,      // e.g. 'folder1/oldfile.pdf'
            newParentFolderId: folderId  // e.g. 'folder2/newfile.pdf'
          }
        }
      });

      const { body } = await response.response;
      const result = await body.json();

      // console.log('File moved successfully:', result);
      return result;

    } catch (error) {
      console.error('Error moving file:', error);
      throw error;
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // If there's no over target, it means the item was dropped outside any valid drop zone
    if (!over) {
      setActiveId(null);
      // console.log("no over");

      return;
    }
    const activeItem = tableData.find(item => item.id === active.id);
    const overItem = tableData.find(item => item.id === over.id);

    if (!activeItem || !overItem || activeItem === overItem) {
      setActiveId(null);
      return;
    }

    // Only proceed if dropping onto a folder
    if (!overItem.isFolder) {
      // console.log("not a folder");

      setActiveId(null);
      return;
    }


    try {
      setTableData(prevData => prevData.map(item =>
        (item.id === activeItem.id || item.id === overItem.id)
          ? { ...item, status: 'GRAY' }
          : item
      ));

      console.log("activeItem:", activeItem);
      console.log("overItem:", overItem);

      await moveFile(activeItem.id, overItem.id);

      // Update the UI after successful move
      setTableData(prevData => prevData.filter(item => item.id !== activeItem.id));
      setTableData(prevData => prevData.map(item =>
        (item.id === overItem.id)
          ? { ...item, status: 'COMPLETED' }
          : item
      ));


    } catch (error) {
      // Revert the UI state on error
      setTableData(prevData => prevData.map(item =>
        (item.id === activeItem.id || item.id === overItem.id)
          ? { ...item, status: 'COMPLETED' }
          : item
      ));
      console.error('Error moving file:', error);
    }

    setActiveId(null);
  };

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
  }

  const BreadcrumbNav: React.FC = () => {


    interface BreadcrumbNode {
      name: string;
      id: string;
    }

    const [pathNodes, setPathNodes] = React.useState<BreadcrumbNode[]>([]);

    const generateCrumbs = async () => {
      try {
        const restOperation = get({
          apiName: 'S3_API',
          path: `/s3/${bucketUuid}/generate-breadcrumb-trail`,
          options: {
            withCredentials: true,
            queryParams: { fileId: pathArray[3] === "home" ? "ROOT" : pathArray[3] }
          }
        });

        const { body } = await restOperation.response;
        const responseText = await body.text();
        const response = JSON.parse(responseText);

        if (response) {
          setPathNodes(response.map((node: { Id: string; Name: string }) => ({
            name: node.Name,
            id: node.Id
          })));
        }


        console.log("response:", response);
      } catch (error) {
        console.error('Error generating breadcrumbs:', error);
      }
    }


    React.useEffect(() => {
      generateCrumbs();
    }, []);

    const handleNav = (id: string) => {
      const segments = pathname.split('/');
      segments.pop();  // Remove the last segment
      segments.push(id === 'ROOT' ? 'home' : id); // Add the new folder ID
      router.push(segments.join('/'));
    }

    return (
      <div className="flex items-center text-base h-8">
        {pathNodes.length === 0 && (
          <div className="flex items-center w-1/3 flex-row gap-4">
            <Skeleton variant="text" className='dark:bg-slate-700 w-64' />
            <Skeleton variant="text" className='dark:bg-slate-700 w-48' />
            <Skeleton variant="text" className='dark:bg-slate-700 w-32' />
          </div>
        )}
        {pathNodes.map((node, index) => (
          <div key={node.id} className="flex items-center">
            <button
              className={`hover:text-blue-500 transition-colors ${index === pathNodes.length - 1
                ? 'text-gray-600 dark:text-gray-200 font-semibold'
                : 'text-gray-600  dark:text-gray-200 font-normal'
                }`}
              onClick={() => handleNav(node.id)}
            >
              {node.name === 'Root' ? 'Home' : node.name}
            </button>
            {index < pathNodes.length - 1 && (
              <ChevronRight className="h-4 w-4 text-gray-400 mx-[.55rem]" />
            )}
          </div>
        ))}
      </div>
    );
  };



  const handleSetTableData = async (id: string) => {
    console.log("bucketUuid:", bucketUuid);
    console.log("id:", id);

    try {
      // await getS3Client();
      const restOperation = post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/head-objects-for-bucket`,
        options: {
          withCredentials: true,
          body: {
            folderId: id
          },
        }
      });

      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      const mappedData = response.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        uploadedBy: item.uploadedBy,
        type: item.isFolder ? 'folder' : 'file',
        size: item.size.length > 0 ? formatFileSize(item.size) : ' ',
        isFolder: item.isFolder,
        createByEmail: '',
        createByName: item.uploadedBy,
        lastModified: item.lastModified,
        tags: item.tags || [],
        summary: '',
        status: 'COMPLETE',
        parentId: item.parentFolderId
      }));
      setTableData(sortTableData(mappedData));


      console.log("response", response);

      setIsLoading(false);
    } catch (error) {
      console.error('Error listing S3 objects:', error);
    } finally {
      // setIsLoading(false);
    }
  };

  const sortTableData = (data: FileNode[]) => {
    return data.sort((a, b) => {
      // First sort by type (folders first)
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;

      // Then sort alphabetically by name within each group
      return a.name.localeCompare(b.name, undefined, {
        sensitivity: 'base',
        numeric: true
      });
    });
  };

  const handleRenameFile = async (id: string, newName: string) => {
    try {
      const response = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/rename-object`,
        options: {
          withCredentials: true,
          body: {
            fileId: id,
            newName: newName
          }
        }
      });

      const { body } = await response.response;
      const result = await body.json() as { newName: string };

      console.log('result:', result);

      if (result && result.newName) {
        setTableData(prevData => prevData.map(item =>
          item.id === id
            ? { ...item, name: result.newName }
            : item
        ));

        setShowRenameModal(false);
        setNewRenameName('');

      }

    } catch (error) {

      console.error('Error creating folder:', error);
      // Remove folder from tree if API call fails

    }


  }

  const handleCreateFolder = async (name: string) => {
    const newFolder: FileNode = {
      id: "temp-id",
      type: 'folder',
      name: name,
      size: '',
      lastModified: new Date().toISOString(),
      uploadedBy: "",
      isFolder: true,
      status: 'GRAY',
      tags: [],
      summary: '',
      parentId: '',
      createByEmail: '',
      createByName: ''
    };

    setShowFolderModal(false);
    setNewFolderName('');

    setTableData(prevData => sortTableData([...prevData, newFolder]));

    console.log("patharray:", pathArray);


    try {
      const response = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/create-folder`,
        options: {
          withCredentials: true,
          body: {
            folderName: name,
            parentFolderId: pathArray[3] === "home" ? "ROOT" : pathArray[3]
          }
        }
      });

      const { body } = await response.response;
      const result = await body.json();

      console.log('result:', result);
      if (result) {
        const response = result as { folderId: string };
        console.log('response:', response);
        setTableData(prev =>
          prev.map(item =>
            item.id === "temp-id"
              ? { ...item, status: 'COMPLETED', id: response.folderId }
              : item
          )
        );

        console.log('Changed item:', tableData);
      }




    } catch (error) {
      setTableData(prev => prev.filter(item => item.id !== newFolder.id));

      console.error('Error creating folder:', error);
      // Remove folder from tree if API call fails

    }
  };

  const handleUploadFile = async (file: File, parentId: string) => {
    try {

      // Get presigned URL from API with the full path
      const getUrlResponse = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/upload-url`,
        options: {
          withCredentials: true,
          body: JSON.stringify({
            //    filePath: filePathOut,
            //    contentType: file.type
          })
        }
      });

      const { body } = await getUrlResponse.response;
      const responseText = await body.text();
      const { signedUrl } = JSON.parse(responseText);

      // Upload file using presigned URL
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'Content-Length': file.size.toString(),
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

    } catch (error) {
      console.error('Error uploading file:', error);

    }
  };


  const [columnWidths, setColumnWidths] = useState<{ [key in 'name' | 'owner' | 'lastModified' | 'fileSize' | 'tags' | 'actions' | 'status']: string }>({
    status: '3%',
    name: '32%',
    owner: '15%',
    lastModified: '15%',
    fileSize: '10%',
    tags: '20%',
    actions: '5%'
  });
  const [isResizing, setIsResizing] = useState(false);
  const [currentResizer, setCurrentResizer] = useState<string | null>(null);
  const router = useRouter();



  const ResizableHeader: React.FC<ResizableHeaderProps> = ({ column, width, children }) => {
    const resizerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLTableHeaderCellElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      setCurrentResizer(column);

      const startX = e.pageX;
      const startWidth = headerRef.current?.offsetWidth || 0;
      const table = headerRef.current?.closest('table');
      const tableWidth = table?.offsetWidth || 0;

      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing) return;

        const diff = e.pageX - startX;
        const newWidth = Math.max(50, startWidth + diff);
        const newPercentage = (newWidth / tableWidth) * 100;

        // Calculate width reduction for next column
        const remainingColumns = Object.keys(columnWidths).length - 1;
        const widthReduction = (newPercentage - parseFloat(width)) / remainingColumns;

        const newColumnWidths = { ...columnWidths };
        (Object.keys(newColumnWidths) as (keyof typeof newColumnWidths)[]).forEach(key => {
          if (key === column) {
            newColumnWidths[key] = `${newPercentage}%`;
          } else {
            const currentWidth = parseFloat(newColumnWidths[key as keyof typeof columnWidths]);
            newColumnWidths[key] = `${currentWidth - widthReduction}%`;
          }
        });

        setColumnWidths(newColumnWidths);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        setCurrentResizer(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    return (
      <th
        ref={headerRef}
        style={{
          position: 'relative',
          width: width,
          textAlign: 'left',
          padding: '8px 16px',
          overflow: 'hidden'
        }}
      >
        {children}
        <div
          ref={resizerRef}
          className={`resizer ${isResizing && currentResizer === column ? 'isResizing' : ''}`}
          onMouseDown={handleMouseDown}
        />
      </th>
    );
  };

  const SortableItem = React.memo<SortableItemProps & {
    selectedItemId: string | null;
    onSelect: (id: string) => void;
  }>(({ item, loading, selectedItemId, onSelect }) => {
    const isSelected = selectedItemId === item.id;

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      // console.log("status:", item.status);
      onSelect(item.id);
      // console.log("selected items s3Key:", item.s3Key);
    };
    const pathname = usePathname() || '';
    const bucketUuid = pathArray[2] || '';


    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
      isOver,
    } = useSortable({
      id: item.id,
      disabled: false,
    });

    const handleDownload = async () => {
      if (!item.isFolder) {
        try {
          const downloadResponse = await get({
            apiName: 'S3_API',
            path: `/s3/${bucketUuid}/download-url`,
            options: {
              withCredentials: true,
              queryParams: { fileId: item.id }
            }
          });
          const { body } = await downloadResponse.response;
          const responseText = await body.text();
          const { signedUrl } = JSON.parse(responseText);

          // Create temporary link and trigger download
          const link = document.createElement('a');
          link.href = signedUrl;
          link.download = item.name; // Set filename
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (error) {
          console.error('Error getting presigned URL:', error);
        }
      }
    }



    const handleDoubleClick = async () => {
      if (!item.isFolder && item.id) {
        try {
          // console.log(item.s3Key);
          const downloadResponse = await get({
            apiName: 'S3_API',
            path: `/s3/${bucketUuid}/view-url`,
            options: {
              withCredentials: true,
              queryParams: { fileId: item.id }
            }
          });
          const { body } = await downloadResponse.response;
          const responseText = await body.text();
          const { signedUrl } = JSON.parse(responseText);
          onFileSelect({
            ...item,
            s3Url: signedUrl,
          });
        } catch (error) {
          console.error('Error getting presigned URL:', error);
        }
      }
      else if (item.isFolder) {
        const segments = pathname.split('/');
        segments.pop();  // Remove the last segment
        segments.push(item.id); // Add the new folder ID
        router.push(segments.join('/'));



      }
    };

    const handleRename = async () => {
      setShowRenameModal(true);
      setSelectedItemId(item.id);
    }

    const handleDelete = async () => {
      setTableData(prev =>
        prev.map(row =>
          row.id === item.id
            ? { ...row, status: 'GRAY' }
            : row
        )
      );

      try {
        // Make API call to delete folder
        const response = await post({
          apiName: 'S3_API',
          path: `/s3/${bucketUuid}/delete-url`,
          options: {
            withCredentials: true,
            body: {
              fileId: item.id
            }
          }
        });

        const { body } = await response.response;
        const result = await body.json();
        setTableData(prev => prev.filter(row => row.id !== item.id));


      } catch (error) {
        setTableData(prev =>
          prev.map(row =>
            row.id === item.id
              ? { ...row, uploadProcess: 'COMPLETED' }
              : row
          )
        );
        console.error('Error deleting item:', error);
      }
    };

    if (loading) {
      return (
        <tr
          ref={setNodeRef}
          style={{
            transform: CSS.Transform.toString(transform),
            transition,
            // willChange: 'transform',
            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            cursor: isDragging ? 'grabbing' : 'default',
            opacity: item.status === 'GRAY' ? 0.5 : 1,
          }}
          {...attributes}
          {...listeners}
          data-is-folder={item.isFolder}
          className="text-xs transition-all duration-200 hover:bg-blue-50 cursor-pointer dark:text-white"
          onDoubleClick={handleDoubleClick}
          onClick={handleClick}

        >

          <td style={{
            width: columnWidths.name,
            padding: '8px 16px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: columnWidths.name
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              <Skeleton variant="text" width={'100%'} className='dark:bg-slate-700' />
            </div>
          </td>
          <td style={{
            width: columnWidths.owner,
            padding: '8px 16px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            <Skeleton variant="text" width={'100%'} className='dark:bg-slate-700' />
          </td>
          <td style={{
            width: columnWidths.lastModified,
            padding: '8px 16px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}> <Skeleton variant="text" width={'100%'} className='dark:bg-slate-700' /></td>
          <td style={{
            width: columnWidths.fileSize,
            padding: '8px 16px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}> <Skeleton variant="text" width={'100%'} className='dark:bg-slate-700' /></td>
          <td style={{
            width: columnWidths.tags,
            padding: '8px 16px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}> <Skeleton variant="text" width={'100%'} className='dark:bg-slate-700' /></td>
          <td style={{
            width: columnWidths.actions,
            padding: '8px 16px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            <Skeleton variant="text" width={'100%'} className='dark:bg-slate-700' />
          </td>
        </tr>

      );
    }



    function getReadableTimeDifference(lastModified: string): string {
      const lastModifiedDate = new Date(lastModified);
      const currentDate = new Date();

      const diffInMs = currentDate.getTime() - lastModifiedDate.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      const diffInWeeks = Math.floor(diffInDays / 7);
      const diffInMonths = Math.floor(diffInDays / 30);

      if (diffInMonths > 0) {
        return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
      } else if (diffInWeeks > 0) {
        return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
      } else if (diffInDays > 0) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      } else if (diffInHours > 0) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      } else {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
      }
    }


    return (
      <ContextMenu>
        <ContextMenuTrigger  asChild>
          <tr
            ref={setNodeRef}
            style={{
              transform: CSS.Transform.toString(transform),
              transition,
              // willChange: 'transform',
              backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              cursor: isDragging ? 'grabbing' : 'default',
              opacity: item.status === 'GRAY' ? 0.5 : 1,
              overflow: 'visible',
              width: '100%', // Add full width
          display: 'table-row'
            }}
            {...attributes}
            {...listeners}
            data-is-folder={item.isFolder}
            className="text-xs transition-all duration-200 hover:bg-blue-50 cursor-pointer dark:text-white border-b border-[#e0e0e0] dark:border-[#333] "
            onDoubleClick={handleDoubleClick}
            onClick={handleClick}

          >

            <td style={{
              width: columnWidths.name,
              padding: '8px 16px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: columnWidths.name
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                minWidth: 0, // Allow flex items to shrink below their minimum content size
              }}>
                <div style={{
                  flexShrink: 0, // Prevent icon from shrinking
                }} className="flex flex-row">
                  {item.isFolder ?
                    <FolderIcon className="mr-2 h-4 w-4 dark:text-white" /> :
                    <FileIcon className="mr-2 h-4 w-4 dark:text-white" />
                  }
                </div>
                <div style={{
                  minWidth: 0, // Allow text container to shrink
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {item.name}
                </div>
              </div>
            </td>
            <td style={{
              width: columnWidths.owner,
              padding: '8px 16px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>{item.uploadedBy}</td>
            <td style={{
              width: columnWidths.lastModified,
              padding: '8px 16px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>{getReadableTimeDifference(item.lastModified)}</td>
            <td style={{
              width: columnWidths.fileSize,
              padding: '8px 16px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>{item.size || '--'}</td>
            <td style={{
              width: columnWidths.tags,
              padding: '8px 16px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {item.isFolder ? '' : <TagDisplay tags={item.tags} />}
            </td>

            <td style={{
              width: columnWidths.status,
              padding: '8px 0px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: columnWidths.status
            }}>
              <div className="flex items-center justify-center h-full w-full ">
                {/* {(!item.isFolder) ? {item.status === "PENDING" ? 
                                 <Circle className="max-h-3 max-w-3 text-green-500" />}
                                    <Circle className="max-h-3 max-w-3 text-green-500" /> : 
                                } */}

                {!item.isFolder ? (
                  <HoverCard openDelay={100} closeDelay={0}>
                    <HoverCardTrigger asChild>
                      <div className="p-1.5 cursor-default">
                        {item.status === "PENDING" ? (
                          <Circle className="max-h-2 max-w-2 text-yellow-600" fill="currentColor" />
                        ) : item.status === "BATCHED" ? (
                          <Circle className="max-h-2 max-w-2 text-yellow-600" fill="currentColor" />
                        ) : item.status === "FAILED" ? (
                          <Circle className="max-h-2 max-w-2 text-red-600" fill="currentColor" />
                        ) : item.status === "COMPLETE" ? (
                          <Circle className="max-h-2 max-w-2 text-green-600" fill="currentColor" />
                        ) : item.status === "FAILED_SIZE" ? (
                          <Circle className="max-h-2 max-w-2 text-red-600" fill="currentColor" />
                        ) : item.status === "FAILED_TYPE" ? (
                          <Circle className="max-h-2 max-w-2 text-red-600" fill="currentColor" />
                        ) : item.status === "PROCESSING" ? (
                          <Circle className="max-h-2 max-w-2 text-yellow-600" fill="currentColor" />
                        ) : null}
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent
                      className="w-auto p-2 text-center dark:bg-slate-800 dark:text-white dark:border-none"
                      side="bottom"
                      align="center"
                      sideOffset={5}
                    >
                      <p className="text-xs">{item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()}</p>
                    </HoverCardContent>
                  </HoverCard>
                ) : null}
              </div>
            </td>
            <td style={{
              width: columnWidths.actions,
              padding: '8px 16px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }} className="select-none outline-none">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <button>⋮</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={handleDownload}
                    className="text-black"
                  >
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleRename}
                    className="text-black "
                  >
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    Delete
                  </DropdownMenuItem>

                </DropdownMenuContent>
              </DropdownMenu>
            </td>
          </tr>

        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </ContextMenuItem>
          <ContextMenuItem onClick={handleRename}>
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleDelete} className="text-red-600">
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>


    );
  });
  SortableItem.displayName = 'SortableItem';

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'TD' || (e.target as HTMLElement).tagName === 'TR') {
      setSelectedItemId(null);
    }
  };

  const DragPreview = React.memo<{ item: FileNode }>(({ item }) => {
    return (
      <div style={{
        padding: '8px 12px',
        background: 'white',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        width: 'fit-content',
      }}>
        {item.type === 'folder' ? '📁' : '📄'} {item.name}
      </div>
    );
  });

  DragPreview.displayName = 'DragPreview';

  interface FileUpload {
    file: File;
    progress: number;
    status: 'uploading' | 'completed' | 'error' | 'invalid filename' | 'file too large' | 'invalid file type';
  }

  const handleFilesUploaded = async (files: File[], fileHashes: FileHashMapping) => {
    console.log('Uploaded files:', files);
    console.log('File hashes:', fileHashes);
    const uploadPromises = files.map(async (file) => {
      try {
        // const s3Key = await uploadToS3(file);
        // console.log("s3key of file in s3", temps3Key);
        const newFile: FileNode = {
          parentId: pathArray[3] === "home" ? "ROOT" : pathArray[3],
          name: file.name,
          uploadedBy: `${(userInfo?.payload?.given_name as string) || ''} ${(userInfo?.payload?.family_name as string) || ''} `.trim(),
          type: file.type,
          size: formatFileSize(file.size),
          id: fileHashes[`${file.name}-${file.size}`],
          isFolder: false,
          createByEmail: '',
          createByName: `${(userInfo?.payload?.given_name as string) || ''} ${(userInfo?.payload?.family_name as string) || ''} `.trim(),
          lastModified: new Date().toISOString(),
          tags: [],
          summary: '',
          status: 'PENDING'
        };

        // Add the file to the current node's children



        // console.log("temps3Key", temps3Key);

        // console.log("s3key of file in tree", temps3Key);

        return newFile;
      } catch (error) {
        console.error('Error uploading file:', error);
        return null;
      }
    });

    // const newFiles = (await Promise.all(uploadPromises)).filter((item): item is FileNode => item !== null);
    // // console.log("new files:", newFiles);
    // setTableData(prevData => [...prevData, ...newFiles]);
    // setShowUploadOverlay(false);

    const newFiles = (await Promise.all(uploadPromises)).filter((item): item is FileNode => item !== null);
    // console.log("new files:", newFiles);
    setTableData(prevData => sortTableData([...prevData, ...newFiles]));
    console.log("tableData:", tableData);
    setShowUploadOverlay(false);

  };



  return (
    <div className="select-none w-full dark:bg-darkbg pt-4 h-full flex flex-col outline-none" onClick={handleBackgroundClick}>
      <style jsx>{`
                .resizer {
    position: absolute;
    right: -3px; /* Move slightly outside the cell */
    top: 0;
    height: 100%;
    width: 6px;
    background: transparent;
    cursor: col-resize;
    user-select: none;
    touch-action: none;
    transition: background 0.2s;
}

.ScrollArea {
    position: relative;
    overflow: hidden;
    height: 100%;
    width: 100%;
}

.resizer:hover,
.resizer.isResizing {
    background: rgba(0, 0, 0, 0.3);
}

th {
    position: relative;
    transition: width 0.1s ease;
    padding-right: 15px; /* Add padding to accommodate the resizer */
}

/* Add visual indicator on hover */
.resizer::after {
    content: '';
    position: absolute;
    right: 2px;
    top: 0;
    height: 100%;
    width: 2px;
    background: #cbd5e1;
    opacity: 0;
    transition: opacity 0.2s;
}

.resizer:hover::after {
    opacity: 1;
}

                
                @media (hover: hover) {
                    .resizer {
                        opacity: 0;
                    }
                
                    *:hover > .resizer {
                        opacity: 1;
                    }
                }
                
                table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                }
                
         
            `}</style>



      <div className="w-full px-[36px] flex">
        {React.useMemo(() => (
          <BreadcrumbNav />
        ), [pathArray[3]])} {/* Only re-render when the current path ID changes */}
      </div>
      <div className="flex justify-between items-center  py-4 h-[10%] px-[36px] mb-2">

        <div className="buttons flex flex-row gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 bg-transparent text-black border dark:border-slate-600 dark:text-gray-200 px-4 py-1 rounded-full hover:bg-blue-700 select-none outline-none">
                <span className="text-sm">Manage Documents</span>
                <ChevronDown size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* <DropdownMenuItem className="flex items-center gap-2">
                <Upload size={16} />
                <span>Upload</span>
              </DropdownMenuItem> */}
              <DropdownMenuItem onClick={() => setShowUploadOverlay(true)} className="flex items-center gap-2">
                <Upload size={16} />
                <span>Upload</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowFolderModal(true)} className="flex items-center gap-2">
                <Plus size={16} />
                <span>Create Folder</span>
              </DropdownMenuItem>

              <DropdownMenuItem className="flex items-center gap-2">
                <Folder size={16} />
                <span>Organize Documents</span>
              </DropdownMenuItem>

              {/* <DropdownMenuItem onClick={() => setShowFileOrganizer(true)} className="flex items-center gap-2">
                                <Folder size={16} />
                                <span>Organize Documents</span>
                            </DropdownMenuItem> */}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* {showFileOrganizer && (
                        <FileOrganizerDialog
                            bucketId={bucketUuid}
                            onOrganize={(...args) => {
                                setShowFileOrganizer(false);
                                handleOrganize(...args);
                            }}
                            onClose={() => setShowFileOrganizer(false)}
                            open={true}
                        />
                    )} */}
          {/* <button
                        onClick={handleRefresh}
                        className="flex items-center justify-center p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
                        aria-label="Refresh"
                    >
                        <RefreshCcw size={16} />
                    </button> */}

        </div>


        <div className="relative xl:w-[45%] flex">
          {/* <Select defaultValue="current" onValueChange={(value) => setSearchScope(value)}>
                        <SelectTrigger
                            className="absolute left-[10px] top-[20%] h-[60%] w-[120px] border dark:border-slate-600 rounded-ml 
            dark:bg-transparent dark:text-slate-300 focus-visible:ring-0 focus-visible:ring-offset-0 
            focus:outline-none focus-visible:outline-none ring-0"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className='dark:bg-darkbg dark:text-white outline-none border dark:border-slate-600'>
                            <SelectItem value="current" className='dark:text-slate-300'>Folder</SelectItem>
                            <SelectItem value="all" className='dark:text-slate-300'>All Files</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder="Search files..."
                        value={searchValue}
                        onChange={handleSearch}
                        className="pl-[140px] w-full dark:border-slate-600 
        border-slate-200 dark:bg-darkbg dark:text-white outline-none"
                    /> */}
        </div>



      </div>

      <ContextMenu>
        <ContextMenuTrigger className="flex flex-grow">
          <ScrollArea data-drop-zone className=" relative w-full h-full ">

            <div
              className="absolute bottom-4 right-4 z-50"
              style={{
                maxWidth: '90%',
                pointerEvents: 'none'
              }}
            >
            </div><div className="flex flex-grow ">

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >



                <div style={{ paddingLeft: '20px' }} className="text-xs dark:text-white text-slate-800 mb-2" >

                  <table style={{
                    width: '100%',
                    minWidth: '800px', // Set your desired minimum width
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                  }}>

                    <thead>

                      <tr className="text-xs font-thin dark:text-white text-slate-600">


                        <ResizableHeader column="name" width={columnWidths.name}
                        >
                          Name
                        </ResizableHeader>
                        <ResizableHeader column="owner" width={columnWidths.owner}
                        >
                          Owner
                        </ResizableHeader>
                        <ResizableHeader column="lastModified" width={columnWidths.lastModified}
                        >
                          Last modified
                        </ResizableHeader>
                        <ResizableHeader column="fileSize" width={columnWidths.fileSize}
                        >
                          File size
                        </ResizableHeader>
                        <ResizableHeader column="tags" width={columnWidths.tags}
                        >
                          Tags
                        </ResizableHeader>
                        <ResizableHeader column="" width={columnWidths.status}
                        >
                          {''}
                        </ResizableHeader>
                        <ResizableHeader column="actions" width={columnWidths.actions}
                        >
                          {' '}
                        </ResizableHeader>

                      </tr>
                    </thead>
                    <tbody className="w-full">
                      <SortableContext items={tableData} strategy={horizontalListSortingStrategy}>
                        {isLoading ? (
                          <>
                            <SortableItem
                              item={dummy}
                              loading={true}
                              selectedItemId={selectedItemId}
                              onSelect={setSelectedItemId}
                            />
                            <SortableItem
                              item={dummy}
                              loading={true}
                              selectedItemId={selectedItemId}
                              onSelect={setSelectedItemId}
                            />
                            <SortableItem
                              item={dummy}
                              loading={true}
                              selectedItemId={selectedItemId}
                              onSelect={setSelectedItemId}
                            />
                            <SortableItem
                              item={dummy}
                              loading={true}
                              selectedItemId={selectedItemId}
                              onSelect={setSelectedItemId}
                            />
                            <SortableItem
                              item={dummy}
                              loading={true}
                              selectedItemId={selectedItemId}
                              onSelect={setSelectedItemId}
                            />
                          </>

                        ) : (
                          tableData.map((item) => (
                            <SortableItem
                              key={item.id}
                              item={item}
                              loading={false}
                              selectedItemId={selectedItemId}
                              onSelect={setSelectedItemId}
                            />
                          ))
                        )}



                      </SortableContext>
                    </tbody>
                  </table>
                </div>
                <DragOverlay>
                  {activeId ? (
                    <DragPreview
                      item={tableData.find(item => item.id === activeId)!}
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>


            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setShowFolderModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Folder
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setShowUploadOverlay(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload File
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>



      {showUploadOverlay && (
        <DragDropOverlay
          onClose={() => setShowUploadOverlay(false)}
          onFilesUploaded={handleFilesUploaded}
          currentPath={currentPath} // Pass the current path
          folderId={pathArray[3] === "home" ? "ROOT" : pathArray[3]}
        />
      )}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Enter folder name"
              className="w-full px-3 py-2 border rounded-md mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateFolder(newFolderName)}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Rename File</h3>
            <input
              type="text"
              value={newRenameName}
              onChange={(e) => setNewRenameName(e.target.value)}
              placeholder="Enter folder name"
              className="w-full px-3 py-2 border rounded-md mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setNewRenameName('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRenameFile(selectedItemId ?? '', newRenameName)}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};



