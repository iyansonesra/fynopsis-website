import React, { use, useRef, useState, useEffect, useMemo } from 'react';
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
import { useS3Store, TreeNode } from "../../../services/fileService";
import { usePathname } from 'next/navigation';
import {
  ChevronDown, ChevronRight, Circle, FileIcon, FolderIcon,
  Plus, RefreshCcw, Upload, Search, Download, Pencil, Trash,
  RotateCcw
} from 'lucide-react';
import { 
  FaFilePdf, 
  FaFileWord, 
  FaFileExcel, 
  FaFilePowerpoint, 
  FaFileImage, 
  FaFileArchive, 
  FaFileAlt, 
  FaFileCode,
  FaFileAudio,
  FaFileVideo
} from 'react-icons/fa';
import { Input } from '../../../ui/input';
import DragDropOverlay from './DragDrop';
import { v4 as uuidv4 } from 'uuid';
import { fetchAuthSession, getCurrentUser, JWT } from 'aws-amplify/auth';
import { Skeleton } from '@mui/material';
import { get, post } from 'aws-amplify/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../ui/dropdown-menu';
import { Folder, File } from 'lucide-react';
import { TagDisplay } from './TagsHover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../../../ui/hover-card';
import websocketManager, { FileUpdateMessage } from '@/lib/websocketManager';
import { FileOrganizerDialog, FileChange } from './FileOrganizerDialog';
import SnackbarContent from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import * as AmplifyAPI from "aws-amplify/api";
import path from 'path';
import { useParams, useRouter } from 'next/navigation';
import { useFileStore } from '../../../services/HotkeyService';
import { ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useTabStore } from '../../../tabStore';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";






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
  tags: DocumentTags | null;
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
  tags: null,
  summary: "Loading...",
  status: "PENDING"
};


interface SortableItemProps {
  item: FileNode;
  loading: boolean;
  selectedItemIds: string[];
  onSelect: (ids: string[]) => void;
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
  onFileSelect: (file: FileNode, fileChunk?: string) => void;
  permissionDetails?: any;
}

interface DateInfo {
  date: string;
  type: string;
  description: string;
}

interface DocumentTags {
  document_type: string;
  relevant_project: string;
  involved_parties: string[];
  key_topics: string[];
  dates: DateInfo[];
  deal_phase: string;
  confidentiality: string;
}

// Add interface for FileTypeIcon props
interface FileTypeIconProps {
  fileName: string;
  className?: string;
}

const FileTypeIcon = ({ fileName, className = "" }: FileTypeIconProps) => {
  // Convert to lowercase for case-insensitive comparison
  const lowerFileName = fileName.toLowerCase();
  
  // Check file extension
  if (lowerFileName.endsWith('.pdf')) {
    return <FaFilePdf className={`mr-2 h-4 w-4 text-red-500 ${className}`} />;
  } else if (lowerFileName.match(/\.(docx?|rtf|odt)$/)) {
    return <FaFileWord className={`mr-2 h-4 w-4 text-blue-600 ${className}`} />;
  } else if (lowerFileName.match(/\.(xlsx?|csv|xlsm|ods)$/)) { 
    return <FaFileExcel className={`mr-2 h-4 w-4 text-green-600 ${className}`} />;
  } else if (lowerFileName.match(/\.(pptx?|pps|odp)$/)) {
    return <FaFilePowerpoint className={`mr-2 h-4 w-4 text-orange-600 ${className}`} />;
  } else if (lowerFileName.match(/\.(jpe?g|png|gif|bmp|svg|webp)$/)) {
    return <FaFileImage className={`mr-2 h-4 w-4 text-purple-500 ${className}`} />;
  } else if (lowerFileName.match(/\.(zip|rar|7z|tar|gz)$/)) {
    return <FaFileArchive className={`mr-2 h-4 w-4 text-amber-600 ${className}`} />;
  } else if (lowerFileName.match(/\.(mp3|wav|ogg|flac|aac)$/)) {
    return <FaFileAudio className={`mr-2 h-4 w-4 text-blue-400 ${className}`} />;
  } else if (lowerFileName.match(/\.(mp4|mov|avi|mkv|wmv|flv)$/)) {
    return <FaFileVideo className={`mr-2 h-4 w-4 text-pink-500 ${className}`} />;
  } else if (lowerFileName.match(/\.(html?|css|jsx?|tsx?|py|java|php|rb|c|cpp|go)$/)) {
    return <FaFileCode className={`mr-2 h-4 w-4 text-gray-600 ${className}`} />;
  } else if (lowerFileName.match(/\.(txt|md|json|xml|log)$/)) {
    return <FaFileAlt className={`mr-2 h-4 w-4 text-gray-500 ${className}`} />;
  } else {
    // Default file icon
    return <FileIcon className={`mr-2 h-4 w-4 ${className}`} />;
  }
};

export function FileSystem({ onFileSelect, permissionDetails }: FileSystemProps) {
  const [tableData, setTableData] = useState<FileNode[]>([]);
  const pathname = usePathname() || '';
  const pathArray = pathname.split('/');
  const bucketUuid = pathArray[2] || '';
  const emailRef = useRef<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState<string>('');
  const [userInfo, setUserInfo] = React.useState<JWT | undefined>(undefined);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { tabs, setActiveTabId } = useTabStore();

  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPath, setCurrentPath] = React.useState<string[]>([`${bucketUuid}`]);
  const [searchValue, setSearchValue] = React.useState('');
  const [showUploadOverlay, setShowUploadOverlay] = React.useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newRenameName, setNewRenameName] = useState('');
  const [fileExtension, setFileExtension] = useState('');
  const [itemToRename, setItemToRename] = useState<FileNode | null>(null);

  const [newFolderName, setNewFolderName] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [cutFileKey, setCutFileKey] = useState<string | null>(null);
  const [cutFileName, setCutFileName] = useState<string | null>(null);
  const [cutNode, setCutNode] = useState<TreeNode | null>(null);
  const [cutPayment, setCutPayment] = useState<FileNode | null>(null);
  const dropZoneRef = useRef<HTMLTableSectionElement>(null);
  const [searchScope, setSearchScope] = useState('current');
  const [showFileOrganizer, setShowFileOrganizer] = useState(false);
  const { cutFiles, setCutFiles } = useFileStore();
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [searchQueryVisible, setSearchQueryVisible] = useState(false);
  const router = useRouter();
  const { searchableFiles, setSearchableFiles, pendingSelectFileId, setPendingSelectFileId } = useFileStore();
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Add toast
  const { toast } = useToast();

  // Get dataroom ID from the URL path
  const dataroomId = pathname.split('/').length > 2 ? pathname.split('/')[2] : null;

  // Check for pending file selection
  useEffect(() => {
    if (pendingSelectFileId && !isLoading) {
      // Find the file in the current directory
      const fileExists = tableData.some(item => item.id === pendingSelectFileId);

      if (fileExists) {
        // Select the file
        setSelectedItemIds([pendingSelectFileId]);
        // Clear the pending selection
        setPendingSelectFileId(null);
      }
    }
  }, [pendingSelectFileId, tableData, isLoading, setPendingSelectFileId]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setSearchQueryVisible(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSearchQueryVisible(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Handle keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    function handleKeyboardShortcuts(e: KeyboardEvent) {
      // Dont capture events when in input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Handle Ctrl+K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchQueryVisible(true);
        return;
      }

      // Handle backspace key for deletion when items are selected
      if (e.key === 'Backspace' && selectedItemIds.length > 0) {
        e.preventDefault();
        setShowDeleteConfirmation(true);
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        setSearchQueryVisible(true);
      }
    }

    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [selectedItemIds]);

  // Load searchable files
  useEffect(() => {
    const loadSearchableFiles = async () => {
      // Only fetch if we don't already have files
      if (searchableFiles.length === 0) {
        try {
          const response = await get({
            apiName: 'S3_API',
            path: `/s3/${bucketUuid}/list-all-searchable-files`,
            options: {
              withCredentials: true
            }
          });

          const { body } = await response.response;
          const responseText = await body.text();
          const result = JSON.parse(responseText);

          if (result && Array.isArray(result.files)) {
            setSearchableFiles(result.files);
          }
        } catch (error) {
          console.error('Error loading searchable files:', error);
        }
      }
    };

    loadSearchableFiles();
  }, [bucketUuid, searchableFiles.length, setSearchableFiles]);

  React.useEffect(() => {
    const handleKeyboardShortcuts = async (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {  // metaKey for Mac support
        if (e.key === 'x' && selectedItemIds) {
          // Handle cut
          const selectedItems = tableData.filter(item => selectedItemIds.includes(item.id));
          if (selectedItems) {

            setCutFiles(selectedItems);

            setTableData(prevData => prevData.map(item =>
              selectedItemIds.includes(item.id)
                ? { ...item, status: 'GRAY' }
                : item
            ));

            // console.log('Cut:', selectedItem.s3Key);
          }
        } else if (e.key === 'v' && cutFiles) {
          // Handle paste (you might need to modify this to handle multiple files)
          try {
            const fileIds = cutFiles.map(file => file.id);

            await moveFile(fileIds, pathArray[3] === "home" ? "ROOT" : pathArray[3]);


            // Update the UI after successful move
            setTableData(prevData => sortTableData([...prevData, ...cutFiles]));
            setCutFiles([]);
          } catch (error) {
            // Revert the grayed out state if there's an error
            setTableData(prevData => prevData.map(item =>
              selectedItemIds.includes(item.id)
                ? { ...item, uploadProcess: 'COMPLETED' }
                : item
            ));
            console.error('Error moving files:', error);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [selectedItemIds, cutFileKey, currentPath, bucketUuid]);


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
      const email = userInfo.signInDetails?.loginId || '';
      emailRef.current = email;

      const idToken = session.tokens?.idToken;
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
    const draggedId = event.active.id as string;

    // If the dragged item is not in the current selection, clear selection and select only this item
    if (!selectedItemIds.includes(draggedId)) {
      setSelectedItemIds([draggedId]);
    }

    setActiveId(draggedId);
  };

  const moveFile = async (ids: string[], folderId: string) => {
    console.log('Moving file:', ids, folderId);
    console.log('Bucket UUID:', bucketUuid);
    
    try {
      const response = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/move-url`,
        options: {
          withCredentials: true,
          body: {
            fileIds: ids,      // Pass id as an array
            newParentFolderId: folderId
          }
        }
      });

      const { body } = await response.response;
      const result = await body.json();
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
    const overItem = tableData.find(item => item.id === over.id);

    // Check if target is a folder and is not one of the selected items
    if (!overItem?.isFolder || selectedItemIds.includes(over.id.toString())) {
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
      // Mark all selected items as grayed out
      setTableData(prevData => prevData.map(item =>
        selectedItemIds.includes(item.id)
          ? { ...item, status: 'GRAY' }
          : item
      ));

      // Move all selected files
      await moveFile(selectedItemIds, overItem.id);

      // Remove moved items from the table
      setTableData(prevData => prevData.filter(item => !selectedItemIds.includes(item.id)));

    } catch (error) {
      // Revert UI state on error
      setTableData(prevData => prevData.map(item =>
        selectedItemIds.includes(item.id)
          ? { ...item, status: 'COMPLETED' }
          : item
      ));
      console.error('Error moving files:', error);
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

      const { body, statusCode } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);

      // Check for folder not found error response
      if (statusCode === 404 || (response.statusCode === 404 && response.message === 'Folder not found')) {
        console.error("Folder not found, navigating to home directory");
        // Reset to home directory
        const segments = pathname.split('/');
        segments.pop(); // Remove the last segment
        segments.push('home'); // Add 'home' as the folder ID
        router.push(segments.join('/'));
      }

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
        tags: item.tags ? JSON.parse(item.tags) as DocumentTags : null,
        summary: item.documentSummary ? item.documentSummary : "",
        status: item.batchStatus,
        parentId: item.parentFolderId,
      }));
      setTableData(sortTableData(mappedData));

      setIsLoading(false);
    } catch (error) {
      console.error('Error listing S3 objects:', error);

      // Handle errors, including 404 errors that might be thrown as exceptions
      const err = error as any; // Type assertion for the error object
      if (
        (err?.statusCode === 404) ||
        (err?.response?.statusCode === 404) ||
        (typeof err?.message === 'string' && err.message.includes('not found'))
      ) {
        // Reset to home directory
        const segments = pathname.split('/');
        segments.pop(); // Remove the last segment
        segments.push('home'); // Add 'home' as the folder ID
        router.push(segments.join('/'));
      }
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
      // For files with extensions, combine the base name with the extension
      const finalName = fileExtension ? newName + fileExtension : newName;

      const response = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/rename-object`,
        options: {
          withCredentials: true,
          body: {
            fileId: id,
            newName: finalName
          }
        }
      });

      const { body } = await response.response;
      const result = await body.json() as { newName: string };

      if (result && result.newName) {
        setTableData(prevData => prevData.map(item =>
          item.id === id
            ? { ...item, name: result.newName }
            : item
        ));

        setShowRenameModal(false);
        setNewRenameName('');
        setFileExtension('');
        setItemToRename(null);
      }

    } catch (error) {
      console.error('Error renaming file/folder:', error);
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
      tags: null,
      summary: '',
      parentId: '',
      createByEmail: '',
      createByName: ''
    };

    setShowFolderModal(false);
    setNewFolderName('');

    setTableData(prevData => sortTableData([...prevData, newFolder]));

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
      if (result) {
        const response = result as { folderId: string };
        setTableData(prev =>
          prev.map(item =>
            item.id === "temp-id"
              ? { ...item, status: 'COMPLETED', id: response.folderId }
              : item
          )
        );
      }




    } catch (error) {
      setTableData(prev => prev.filter(item => item.id !== newFolder.id));

      console.error('Error creating folder:', error);
      // Remove folder from tree if API call fails

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
    selectedItemIds: string[] | null;
    onSelect: (ids: string[]) => void;
  }>(({ item, loading, selectedItemIds, onSelect }) => {
    const isSelected = selectedItemIds.includes(item.id);

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();

      const currentIndex = tableData.findIndex(file => file.id === item.id);

      // Small delay to allow double-click detection
      setTimeout(() => {
        if (e.shiftKey && lastSelectedIndex !== null) {
          // Shift + click: select range
          const start = Math.min(lastSelectedIndex, currentIndex);
          const end = Math.max(lastSelectedIndex, currentIndex);
          const itemsInRange = tableData.slice(start, end + 1).map(item => item.id);

          setSelectedItemIds(prevSelected => {
            const newSelection = new Set([...prevSelected]);
            itemsInRange.forEach(id => newSelection.add(id));
            return Array.from(newSelection);
          });
        } else if (e.ctrlKey) {
          // Ctrl + click: toggle single item
          setSelectedItemIds(prev => {
            if (prev.includes(item.id)) {
              return prev.filter(id => id !== item.id);
            } else {
              return [...prev, item.id];
            }
          });
        } else {
          // Normal click: select only this item
          setSelectedItemIds([item.id]);
        }

        // Update last selected index
        if (!e.ctrlKey) {
          setLastSelectedIndex(currentIndex);
        }
      }, 0);
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
              fileIds: [item.id]
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

    const handleRename = async () => {
      setShowRenameModal(true);
      setSelectedItemId(item.id);
      setItemToRename(item);

      if (!item.isFolder && item.name.includes('.')) {
        // For files with extensions, split the name and extension
        const lastDotIndex = item.name.lastIndexOf('.');
        const baseName = item.name.substring(0, lastDotIndex);
        const extension = item.name.substring(lastDotIndex);

        setNewRenameName(baseName);
        setFileExtension(extension);
      } else {
        // For folders or files without extensions
        setNewRenameName(item.name);
        setFileExtension('');
      }
    }

    const handleRetry = async () => {
      try {
        // Set status to pending while we attempt to retry
        setTableData(prev =>
          prev.map(row =>
            row.id === item.id
              ? { ...row, status: 'PENDING' }
              : row
          )
        );

        // Call retry API
        const response = await post({
          apiName: 'S3_API',
          path: `/s3/${bucketUuid}/retry-file-processing`,
          options: {
            withCredentials: true,
            body: {
              fileId: item.id
            }
          }
        });

        const { body } = await response.response;
        const result = await body.json();

        // Update file status to queued
        setTableData(prev =>
          prev.map(row =>
            row.id === item.id
              ? { ...row, status: 'QUEUED' }
              : row
          )
        );

        toast({
          title: "Success",
          description: "File resubmitted for processing",
          variant: "default"
        });

      } catch (error) {
        console.error('Error retrying file processing:', error);

        // Set status back to failed if the retry attempt itself failed
        setTableData(prev =>
          prev.map(row =>
            row.id === item.id
              ? { ...row, status: 'FAILED' }
              : row
          )
        );

        toast({
          title: "Error",
          description: "Failed to retry file processing",
          variant: "destructive"
        });
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
        <ContextMenuTrigger asChild>
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
            className="text-xs transition-all duration-200 hover:bg-blue-50 cursor-pointer dark:text-white border-b border-[#e0e0e0] dark:border-[#333] outline-none select-none"
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
                    <FileTypeIcon fileName={item.name} className="dark:text-white" />
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
                {item.status === 'FAILED' && !item.isFolder && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRetry();
                    }}
                    className="ml-2 p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-red-900"
                    title="Retry processing"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
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
                {!item.isFolder ? (
                  <HoverCard openDelay={100} closeDelay={0}>
                    <HoverCardTrigger asChild>
                      <div className="p-1.5 cursor-default">
                        {item.status === "COMPLETED" ? (
                          <Circle className="max-h-2 max-w-2 text-green-600" fill="currentColor" />
                        ) : item.status === "FAILED" ? (
                          <Circle className="max-h-2 max-w-2 text-red-600" fill="currentColor" />
                        ) : <Circle className="max-h-2 max-w-2 text-yellow-600" fill="currentColor" />}
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
            }} className="select-none outline-none z-50">
              <DropdownMenu
                open={openDropdownId === item.id}
                onOpenChange={(open) => {
                  setOpenDropdownId(open ? item.id : null);
                }}
              >
                <DropdownMenuTrigger>
                  <button onClick={(e) => e.stopPropagation()}>⋮</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {item.isFolder ? (
                    // Folder options
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDoubleClick(); // Use the same handler as double-click
                        setOpenDropdownId(null);
                      }}
                      className="text-black"
                    >
                      <Folder className="mr-2 h-4 w-4" />
                      Open
                    </DropdownMenuItem>
                  ) : (
                    // File options
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDoubleClick(); // Use the same handler as double-click
                          setOpenDropdownId(null);
                        }}
                        className="text-black"
                      >
                        <FileTypeIcon fileName={item.name} />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload();
                          setOpenDropdownId(null);
                        }}
                        className="text-black"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename();
                      setOpenDropdownId(null);
                    }}
                    className="text-black"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  {item.status === 'FAILED' && !item.isFolder && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRetry();
                        setOpenDropdownId(null);
                      }}
                      className="text-black"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Retry Processing
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                      setOpenDropdownId(null);
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </td>
          </tr>

        </ContextMenuTrigger>
        <ContextMenuContent>
          {item.isFolder ? (
            <ContextMenuItem onClick={() => handleDoubleClick()}>
              <Folder className="mr-2 h-4 w-4" />
              Open
            </ContextMenuItem>
          ) : (
            <>
              <ContextMenuItem onClick={() => handleDoubleClick()}>
                <FileTypeIcon fileName={item.name} />
                View
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleDownload()}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </ContextMenuItem>
            </>
          )}
          <ContextMenuItem onClick={handleRename}>
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </ContextMenuItem>
          {item.status === 'FAILED' && !item.isFolder && (
            <ContextMenuItem onClick={handleRetry}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry Processing
            </ContextMenuItem>
          )}
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

  // Add mass delete function to delete all selected items
  const handleMassDelete = async () => {
    if (selectedItemIds.length === 0) return;

    // Mark selected items as GRAY while deleting
    setTableData(prev =>
      prev.map(row =>
        selectedItemIds.includes(row.id)
          ? { ...row, status: 'GRAY' }
          : row
      )
    );

    try {
      // Make API call to delete multiple files/folders
      const response = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/delete-url`,
        options: {
          withCredentials: true,
          body: {
            fileIds: selectedItemIds
          }
        }
      });

      const { body } = await response.response;
      const result = await body.json();

      // Remove deleted items from the table
      setTableData(prev => prev.filter(row => !selectedItemIds.includes(row.id)));

      // Clear selection after deletion
      setSelectedItemIds([]);

      toast({
        title: "Success",
        description: `${selectedItemIds.length} item${selectedItemIds.length > 1 ? 's' : ''} deleted successfully`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error deleting items:', error);

      // Revert status for items that failed to delete
      setTableData(prev =>
        prev.map(row =>
          selectedItemIds.includes(row.id)
            ? { ...row, status: 'COMPLETED' }
            : row
        )
      );

      toast({
        title: "Error",
        description: "Failed to delete selected items",
        variant: "destructive"
      });
    }
  };

  const DragPreview = React.memo<{ item: FileNode }>(({ item }) => {
    const selectedCount = selectedItemIds.length;

    return (
      <div style={{
        padding: '8px 12px',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        width: 'fit-content',
      }} className='dark:bg-slate-800 dark:text-white bg-white'>
        {item.type === 'folder' ? '📁' : '📄'}
        {item.name}
        {selectedCount > 1 && (
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            +{selectedCount - 1}
          </span>
        )}
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
          tags: null,
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
    setShowUploadOverlay(false);

  };


  const handleRefresh = async () => {
    setIsLoading(true);
    await handleSetTableData(pathArray[3] === "home" ? "ROOT" : pathArray[3]);
    setIsLoading(false);
  }

  const handleOrganize = (changes: FileChange[]) => {
    // Handle the organization changes here
    // This might involve refreshing the view or updating the tree
    handleRefresh();
  };

  // Connect to WebSocket when component mounts with the current dataroom
  // useEffect(() => {
  //   if (!dataroomId) return;

  //   // Handler for file updates - we don't establish the connection here anymore
  //   // as it's handled at the DataroomPage level
  //   const handleFileUpdate = (message: FileUpdateMessage) => {
  //     // Display a toast notification for the update
  //     const currentUser = emailRef.current;
  //     const isOwnAction = message.data.userEmail === currentUser;
  //     let shouldRefresh = false;

  //     // Don't refresh for our own actions, as we already update the UI directly
  //     if (isOwnAction) {
  //       return;
  //     }

  //     switch (message.type) {
  //       case 'FILE_UPLOADED':
  //         shouldRefresh = true;
  //         break;
  //       case 'FILE_DELETED':
  //         shouldRefresh = true;
  //         break;
  //       case 'FILE_MOVED':
  //         // Only refresh if this folder is affected (source or destination)
  //         if (message.data.sourceId === pathArray[3] || message.data.destinationId === pathArray[3]) {
  //           shouldRefresh = true;
  //         }
  //         break;
  //       case 'FILE_RENAMED':
  //         shouldRefresh = true;
  //         break;
  //       case 'FILE_TAG_UPDATED':
  //         shouldRefresh = true;
  //         break;
  //       case 'BATCH_STATUS_UPDATED':
  //         shouldRefresh = true; 
  //         break;
  //       case 'FOLDER_CREATED':
  //         // Only refresh if it's in the current directory
  //         if (message.data.parentFolderId === (pathArray[3] === "home" ? "ROOT" : pathArray[3])) {
  //           shouldRefresh = true;
  //         }
  //         break;
  //       case 'pong':
  //         // Don't refresh for pong messages
  //         break;
  //     }

  //     if (shouldRefresh) {
  //       // Refresh the file list when changes are detected
  //       handleRefresh();
  //     }
  //   };

  //   // Register the event handler on the existing WebSocket connection
  //   websocketManager.addMessageHandler(handleFileUpdate);

  //   // Cleanup
  //   return () => {
  //     websocketManager.removeMessageHandler(handleFileUpdate);
  //     // We don't call release() here as the connection is managed at the DataroomPage level
  //   };
  // }, [dataroomId, pathArray]);

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);

  return (
    <div className="select-none w-full dark:bg-darkbg pt-4 h-full flex flex-col overflow-hidden">
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
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0; /* Important for Firefox */
  }

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    min-width: 800px; /* Your minimum width */
    max-width: 100%; /* Ensure table doesn't exceed container */
  }

  /* Add if you want the table to scroll horizontally when needed */
  .table-container {
    overflow-x: auto;
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
              <button className="flex items-center gap-2 bg-transparent text-black border dark:border-slate-600 dark:text-gray-200 px-4 py-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-900 select-none outline-none">
                <span className="text-sm whitespace-nowrap">Manage Documents</span>
                <ChevronDown size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dark:bg-slate-900 dark:border-none dark:outline-none dark:text-gray-200 ">
              <DropdownMenuItem onClick={() => setShowUploadOverlay(true)} className="flex items-center gap-2 dark:hover:text-gray-400">
                <Upload size={16} />
                <span>Upload</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowFolderModal(true)} className="flex items-center gap-2 dark:hover:text-gray-400">
                <Plus size={16} />
                <span>Create Folder</span>
              </DropdownMenuItem>

              {(!permissionDetails || permissionDetails.canOrganize !== false) && (
                <DropdownMenuItem onClick={() => setShowFileOrganizer(true)} className="flex items-center gap-2 dark:hover:text-gray-400">
                  <Folder size={16} />
                  <span>Organize Documents</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {showFileOrganizer && (
            <FileOrganizerDialog
              bucketId={bucketUuid}
              onOrganize={(...args) => {
                setShowFileOrganizer(false);
                handleOrganize(...args);
              }}
              onClose={() => setShowFileOrganizer(false)}
              open={true}
            />
          )}
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
            aria-label="Refresh"
          >
            <RefreshCcw size={16} />
          </button>

        </div>
        <div className="relative xl:w-[45%] flex">
          <div className="w-full relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search files across project... (Ctrl+K)"
                className="w-full dark:bg-slate-800 dark:border-slate-700 h-9 dark:text-white pl-9"
                onClick={() => setSearchQueryVisible(true)}
                onChange={(e) => setSearchValue(e.target.value)}
                value={searchValue}
                onFocus={() => setSearchQueryVisible(true)}
              />
            </div>
            {searchQueryVisible && (
              <div
                ref={searchDropdownRef}
                className="absolute top-full left-0 w-full z-50 mt-2 shadow-lg rounded-md"
                style={{ maxHeight: '400px' }}
              >
                <div className="p-2 bg-white dark:bg-slate-800 rounded-md border dark:border-slate-700">
                  <ScrollArea className="h-[350px]">
                    {searchableFiles.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No Documents Found.
                      </div>
                    ) : (
                      <ul>
                        {searchableFiles
                          .filter(file => file.fileName.toLowerCase().includes(searchValue.toLowerCase()))
                          .map((file) => (
                            <li
                              key={file.fileId}
                              onClick={() => {
                                // Check if file is already open in a tab
                                const fileTab = tabs.find(tab => tab.title === file.fileName);

                                if (fileTab) {
                                  // If file is already open, just activate that tab
                                  setActiveTabId(fileTab.id);
                                  setSearchQueryVisible(false);
                                } else {
                                  // Store the file ID to be selected after navigation
                                  setPendingSelectFileId(file.fileId);

                                  // Navigate to the directory
                                  const segments = pathname.split('/');
                                  segments.pop(); // Remove the last segment
                                  segments.push(file.parentFolderId === 'ROOT' ? 'home' : file.parentFolderId);
                                  router.push(segments.join('/'));

                                  // Close the search dropdown
                                  setSearchQueryVisible(false);
                                }
                              }}
                              className="px-4 py-2 text-sm bg-transparent cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 dark:text-white flex items-center"
                            >
                              <FileTypeIcon fileName={file.fileName} />
                              <div className="flex flex-col overflow-hidden">
                                <span className="truncate">
                                  {highlightMatch(file.fileName, searchValue)}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {file.parentFolderName === "Root" ? "Home" : file.parentFolderName}
                                </span>
                              </div>
                            </li>
                          ))}
                        {searchValue &&
                          searchableFiles.filter(file => file.fileName.toLowerCase().includes(searchValue.toLowerCase())).length === 0 && (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                              No matching files found
                            </div>
                          )}
                      </ul>
                    )}
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">

        <ScrollArea data-drop-zone className="relative w-full flex-1">
          <ContextMenu>
            <ContextMenuTrigger className="flex flex-grow">

              <div className="flex flex-grow">

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
                                selectedItemIds={selectedItemIds}
                                onSelect={setSelectedItemIds}
                              />
                              <SortableItem
                                item={dummy}
                                loading={true}
                                selectedItemIds={selectedItemIds}
                                onSelect={setSelectedItemIds}
                              />
                              <SortableItem
                                item={dummy}
                                loading={true}
                                selectedItemIds={selectedItemIds}
                                onSelect={setSelectedItemIds}
                              />
                              <SortableItem
                                item={dummy}
                                loading={true}
                                selectedItemIds={selectedItemIds}
                                onSelect={setSelectedItemIds}
                              />
                              <SortableItem
                                item={dummy}
                                loading={true}
                                selectedItemIds={selectedItemIds}
                                onSelect={setSelectedItemIds}
                              />
                            </>

                          ) : (
                            tableData.map((item) => (
                              <SortableItem
                                key={item.id}
                                item={item}
                                loading={false}
                                selectedItemIds={selectedItemIds}
                                onSelect={setSelectedItemIds} />
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


          <ScrollBar orientation="horizontal" />
        </ScrollArea>

      </div>


      {showUploadOverlay && (
        <DragDropOverlay
          onClose={() => setShowUploadOverlay(false)}
          onFilesUploaded={handleFilesUploaded}
          currentPath={currentPath}
          folderId={pathArray[3] === "home" ? "ROOT" : pathArray[3]}
          onRefreshNeeded={handleRefresh} // Pass the refresh callback
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
            <h3 className="text-lg font-semibold mb-4 dark:text-white">
              Rename {itemToRename?.isFolder ? 'Folder' : 'File'}
            </h3>
            <div className="flex items-center w-full mb-4">
              <input
                type="text"
                value={newRenameName}
                onChange={(e) => setNewRenameName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                autoFocus
              />
              {fileExtension && (
                <div className="px-2 py-2 bg-gray-100 border-y border-r rounded-r-md dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200">
                  {fileExtension}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setNewRenameName('');
                  setFileExtension('');
                  setItemToRename(null);
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedItemIds.length} selected item{selectedItemIds.length > 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMassDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

  );
};

const highlightMatch = (text: string, query: string): React.ReactNode => {
  if (!query || query.trim() === '') return text;

  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase()
          ? <span key={index} className="bg-yellow-200 dark:bg-yellow-700 font-medium">{part}</span>
          : part
      )}
    </>
  );
};



