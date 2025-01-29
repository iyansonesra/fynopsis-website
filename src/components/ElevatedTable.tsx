import React, { useRef, useState } from 'react';
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
import { ChevronRight, FileIcon, FolderIcon, Plus, RefreshCcw, Upload } from 'lucide-react';
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



interface Payment {
    id: string;
    type: string;
    name: string;
    status: "success"; // Make this a literal type instead of string
    size: string;
    date: string;
    uploadedBy: string;
    s3Key: string;
    s3Url: string;
    isFolder?: boolean;
    uploadProcess: string;
    summary: string;
    tags: string[];
}

const data: Payment[] = []



const dummy: Payment = {
    id: '',
    type: '',
    name: '',
    status: "success",
    size: '',
    date: '',
    uploadedBy: '',
    s3Key: '',
    s3Url: '',
    isFolder: false,
    uploadProcess: '',
    summary: '',
    tags: []
};


interface SortableItemProps {
    item: Payment;
    loading: boolean;
}



interface ResizableHeaderProps {
    column: string;
    width: string;
    // onResize: (column: string, width: string) => void;
    children: React.ReactNode;
}



function getCurrentPathString(node: TreeNode): string {
    const pathParts: string[] = [];
    let current = node;
    while (current.name !== 'root') {
        pathParts.unshift(current.name);
        current = current.parent as TreeNode;
    }
    // Remove the first path part and join the rest with forward slashes
    const output = pathParts.slice(1).join('/') + '/';
    return output;
}

const DragPreview = React.memo<{ item: Payment }>(({ item }) => {
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


interface FileSystemProps {
    onFileSelect: (file: Payment) => void;
}


export const FileSystem: React.FC<FileSystemProps> = ({ onFileSelect }) => {
    const [activeId, setActiveId] = useState<string | null>(null);
    const tree = useS3Store(state => state.tree);
    const fetchObjects = useS3Store(state => state.fetchObjects);
    const clearTree = useS3Store(state => state.clearTree);
    const setSearchQuery = useS3Store(state => state.setSearchQuery);
    const changeCurrentNode = useS3Store(state => state.changeCurrentNode);
    const navigateToPath = useS3Store(state => state.navigateToPath);
    const goBack = useS3Store(state => state.goBack);
    const [isLoading, setIsLoading] = React.useState(true);
    const pathname = usePathname();
    const bucketUuid = pathname.split('/').pop() || '';
    const [currentPath, setCurrentPath] = React.useState<string[]>([`${bucketUuid}`]);
    const [searchValue, setSearchValue] = React.useState('');
    const [showUploadOverlay, setShowUploadOverlay] = React.useState(false);
    const [currentUser, setCurrentUser] = React.useState<string>('');
    const [userInfo, setUserInfo] = React.useState<JWT | undefined>(undefined);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [tableData, setTableData] = React.useState<Payment[]>(data);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [cutFileKey, setCutFileKey] = useState<string | null>(null);
    const [cutFileId, setCutFileId] = useState<string | null>(null);
    const [cutFileName, setCutFileName] = useState<string | null>(null);
    const [cutNode, setCutNode] = useState<TreeNode | null>(null);
    const [cutPayment, setCutPayment] = useState<Payment | null>(null);
    const dropZoneRef = useRef<HTMLTableSectionElement>(null);
    const [searchScope, setSearchScope] = useState('current');




    const [columnWidths, setColumnWidths] = useState<{ [key in 'name' | 'owner' | 'lastModified' | 'fileSize' | 'tags' | 'actions']: string }>({
        name: '35%',
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

    const HOME_NODE: TreeNode = {
        name: "Home",
        type: 'folder',
        metadata: {},
        s3Key: '/',
        children: {},
        size: 1,
        LastModified: '0'
    };

    const [pathNodes, setPathNodes] = useState<TreeNode[]>([HOME_NODE]);



    const BreadcrumbNav: React.FC<{ pathNodes: TreeNode[], onNavigate: (node: TreeNode) => void }> = ({ pathNodes, onNavigate }) => {
        return (
            <nav className="flex items-center text-base">
                {pathNodes.map((node, index) => (
                    <div key={node.s3Key} className="flex items-center">
                        <button
                            onClick={() => onNavigate(node)}
                            className={`hover:text-blue-500 transition-colors ${index === pathNodes.length - 1
                                ? 'text-gray-600 dark:text-gray-200 font-semibold'
                                : 'text-gray-600  dark:text-gray-200 font-normal'
                                }`}
                        >
                            {node.name}
                        </button>
                        {index < pathNodes.length - 1 && (
                            <ChevronRight className="h-4 w-4 text-gray-400 mx-[.55rem]" />
                        )}
                    </div>
                ))}
            </nav>
        );
    };

    const handleBreadcrumbClick = (node: TreeNode) => {
        if (node.s3Key === '/') {
            // Handle click on Home node
            setPathNodes([HOME_NODE]);
            useS3Store.getState().currentNode = useS3Store.getState().tree.children[bucketUuid]; // You'll need to implement this to reset to root directory
            transformTreeToTableData(tree, []);
        } else {
            // Your existing breadcrumb click handler
            const nodeIndex = pathNodes.findIndex(n => n.s3Key === node.s3Key);
            const newPathNodes = pathNodes.slice(0, nodeIndex + 1);
            setPathNodes(newPathNodes);
            useS3Store.getState().currentNode = newPathNodes[newPathNodes.length - 1];
            transformTreeToTableData(tree, currentPath);
        }
    };



    React.useEffect(() => {
        const handleKeyboardShortcuts = async (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {  // metaKey for Mac support
                if (e.key === 'x' && selectedItemId) {
                    // Handle cut
                    const selectedItem = tableData.find(item => item.id === selectedItemId);
                    if (selectedItem) {
                        setCutFileKey(selectedItem.s3Key);
                        setCutFileId(selectedItem.id);
                        setCutFileName(selectedItem.name);
                        setCutNode(useS3Store.getState().currentNode);
                        setCutPayment(selectedItem);
                        // Gray out the item
                        setTableData(prevData => prevData.map(item =>
                            item.id === selectedItemId
                                ? { ...item, uploadProcess: 'PENDING' }
                                : item
                        ));

                        // console.log('Cut:', selectedItem.s3Key);
                    }
                } else if (e.key === 'v' && cutFileKey) {
                
                    let fullPath = cutFileKey.split('/');
                    // console.log('full path:', fullPath);
                    fullPath = fullPath.slice(1);
                    // console.log('full path:', fullPath);
                    let sourceKey = fullPath.join('/');
                    // console.log('source key:', sourceKey);
                    if (cutPayment?.isFolder) fullPath.pop();
                    let fileName = fullPath.pop() || '';
                    

                    if (cutPayment?.isFolder) fileName += '/';

                    // console.log('filename:', fileName);

                    const currentNode = useS3Store.getState().currentNode;

                    let destinationKey = currentNode.s3Key;

                    // console.log('destination key:', destinationKey);
                    let destFullPath = ["empty"];
                    if (destinationKey)
                        destFullPath = destinationKey.split('/');

                    destFullPath = destFullPath.slice(1);
                    // console.log('dest full path:', destFullPath);

                    destinationKey = destFullPath.join('/') + fileName;


                    // console.log('source key;', sourceKey, 'dest key', destinationKey);
                    // console.log('filename:', fileName);

                    console.log("original s3 key", sourceKey);
                    console.log("destination s3 key", destinationKey);



                    try {
                        await moveFile(sourceKey, destinationKey);

                        // Remove the item from its original location
                        setTableData(prevData => prevData.filter(item => item.id !== cutFileId));

                        // Reset cut state
                        setCutFileKey(null);
                        setCutFileId(null);

                        let oldNode = null;
                        if (cutNode && cutFileName) {
                            oldNode = cutNode.children[cutFileName];
                            delete cutNode.children[cutFileName];
                        }

                        let newS3key = bucketUuid + '/' + destinationKey;

                        // if(cutPayment?.isFolder) newS3key += '/';
                        // console.log('new s3 key:', newS3key);
                        console.log('filename is:', fileName);
                        if (oldNode) {
                            oldNode.s3Key = newS3key;
                            if(cutPayment?.isFolder) 
                                currentNode.children[fileName.slice(0, fileName.length - 1)] = oldNode;
                            else
                                currentNode.children[fileName.slice(0, fileName.length)] = oldNode;
                        }


                        const newV: Payment = cutPayment as Payment;
                        newV.s3Key = newS3key;

                        setTableData(prevData => sortTableData([...prevData, newV]));

                    } catch (error) {
                        // Revert the grayed out state if there's an error
                        setTableData(prevData => prevData.map(item =>
                            item.id === cutFileId
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
        if (!selectedItemId && cutFileId) {
            // Revert the grayed out state of the previously cut file
            setTableData(prevData => prevData.map(item =>
                item.id === cutFileId
                    ? { ...item, uploadProcess: 'COMPLETED' }
                    : item
            ));
            setCutFileKey(null);
            setCutFileId(null);
        }
    }, [selectedItemId]);

    const handleBackgroundClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).tagName === 'TD' || (e.target as HTMLElement).tagName === 'TR') {
            setSelectedItemId(null);
        }
    };

    const SortableItem = React.memo<SortableItemProps & {
        selectedItemId: string | null;
        onSelect: (id: string) => void;
    }>(({ item, loading, selectedItemId, onSelect }) => {
        const isSelected = selectedItemId === item.id;

        const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            onSelect(item.id);
            // console.log("selected items s3Key:", item.s3Key);
        };
        const pathname = usePathname();
        const bucketUuid = pathname.split('/').pop() || '';

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

        const handleDoubleClick = async () => {
            if (!item.isFolder && item.s3Key) {
                try {
                    // console.log(item.s3Key);
                    const downloadResponse = await get({
                        apiName: 'S3_API',
                        path: `/s3/${bucketUuid}/download-url`,
                        options: {
                            withCredentials: true,
                            queryParams: { path: item.s3Key }
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
            } else if (item.isFolder) {

                const newNode = useS3Store.getState().currentNode.children[item.name];
                changeCurrentNode(item.name);
                setPathNodes(prev => [...prev, newNode]);
                transformTreeToTableData(tree, [...currentPath, item.name]);
            }
        };

        const handleDelete = async () => {
            setTableData(prev =>
                prev.map(row =>
                    row.id === item.id
                        ? { ...row, uploadProcess: 'PENDING' }
                        : row
                )
            );

            try {
                if (item.isFolder)
                    await useS3Store.getState().deleteItem(item.name, bucketUuid, item.isFolder);
                else
                    await useS3Store.getState().deleteItem(item.name, bucketUuid, false);
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
                        opacity: item.uploadProcess === 'PENDING' ? 0.5 : 1,
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
            <tr
                ref={setNodeRef}
                style={{
                    transform: CSS.Transform.toString(transform),
                    transition,
                    // willChange: 'transform',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    cursor: isDragging ? 'grabbing' : 'default',
                    opacity: item.uploadProcess === 'PENDING' ? 0.5 : 1,
                    overflow: 'visible'
                }}
                {...attributes}
                {...listeners}
                data-is-folder={item.isFolder}
                className="text-xs transition-all duration-200 hover:bg-blue-50 cursor-pointer dark:text-white border-b border-[#e0e0e0] dark:border-[#333] "
                onDoubleClick={handleDoubleClick}
                onClick={handleClick}

            >
                {/* <div><TagDisplay tags={['hi', 'lol', 'wowowow']} /></div> */}
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
                        }}>
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
                }}>{getReadableTimeDifference(item.date)}</td>
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
                    <TagDisplay tags={item.tags} />
                </td>
                <td style={{
                    width: columnWidths.actions,
                    padding: '8px 16px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <button>⋮</button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
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


        );
    });

    const uploadToS3 = async (file: File) => {
        const fileId = file.name.split('.')[0];
        const fileExtension = file.name.split('.').pop() || '';
        // Ensure we're not using the identity ID in the visible part of the key
        const s3Key = `${bucketUuid}/${fileId}.${fileExtension}`;
        return s3Key;

    };

    const getUserInfo = async () => {
        try {
            const userInfo = await getCurrentUser();
            const session = await fetchAuthSession();

            const idToken = session.tokens?.idToken;
            // console.log('idToken:', idToken);
            setUserInfo(idToken);

            return userInfo.username;
        } catch (error) {
            console.error('Error getting user info:', error);
            return 'Unknown User';
        }
    };

    React.useEffect(() => {
        getUserInfo().then(username => setCurrentUser(username));
    }, []);


    // const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    //     const value = event.target.value;
    //     setSearchValue(value);
    //     setSearchQuery(value);
    // };

    const handleUploadClick = () => {
        setShowUploadOverlay(true);
    }



    React.useEffect(() => {
        fetchObjects(bucketUuid);
    }, [bucketUuid]);

    const sortTableData = (data: Payment[]) => {
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

    async function transformTreeToTableData(tree: TreeNode, currentPath: string[]): Promise<Payment[]> {
        // Get the current node based on the path
        // await navigateToPath(currentPath);

        // Transform immediate children into table data
        const currentNode = useS3Store.getState().currentNode;

        // console.log('currentNode:', currentNode);
        const tableData: Payment[] = [];

        for (const [name, node] of Object.entries(currentNode.children)) {
            const isFolder = (node as any).type === 'folder';
            const metadata = (node as any).metadata;

            const parsedTags = metadata.tags ? JSON.parse(metadata.tags) : [];
            // console.log("metadata tags:", metadata.tags);
            // console.log('parsed tags:', parsedTags);



            // console.log('metadata:', metadata);

            tableData.push({
                id: metadata.Metadata?.id || crypto.randomUUID(),
                name: name,
                type: isFolder ? 'folder' : name.split('.').pop()?.toUpperCase() || 'Unknown',
                status: "success",
                size: isFolder ? ' ' : formatFileSize((node as any).size || 0),
                date: (node as any).LastModified || new Date().toISOString(),
                uploadedBy: metadata.uploadbyname || '',
                s3Key: node.s3Key || name,
                s3Url: metadata.url || '',
                isFolder: isFolder,
                uploadProcess: metadata.Metadata?.pre_upload || 'COMPLETED',
                tags: parsedTags || [],
                summary: metadata.document_summary || '',
            });

        }



        // Apply the sorting when setting the table data
        setTableData(sortTableData(tableData));

        return tableData;
    }

    function formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';

        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
    }

    React.useEffect(() => {
        if (tree) {
            transformTreeToTableData(tree, currentPath)
                .then(transformedData => {
                    setTableData(transformedData);
                    setTimeout(() => {
                        setIsLoading(false);
                    }, 500);
                });
        }
    }, [useS3Store.getState().filteredObjects, currentPath]);



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

    const handleFilesUploaded = async (files: File[]) => {
        const uploadPromises = files.map(async (file) => {
            try {
                const currentNode = useS3Store.getState().currentNode;
                const s3Key = await uploadToS3(file);
                const temps3Key = getCurrentPathString(currentNode) + file.name;
                // console.log("s3key of file in s3", temps3Key);
                const newFile = {
                    id: uuidv4(),
                    type: file.name.split('.').pop()?.toUpperCase() || 'Unknown',
                    name: file.name,
                    status: "success" as const,
                    size: formatFileSize(file.size),
                    date: new Date().toISOString(),
                    uploadedBy: `${(userInfo?.payload?.given_name as string) || ''} ${(userInfo?.payload?.family_name as string) || ''} `.trim(),
                    s3Key: temps3Key,
                };

                // Add the file to the current node's children

                function getCurrentPathString(node: TreeNode): string {
                    const pathParts: string[] = [];
                    let current = node;
                    while (current.name !== 'root') {
                        pathParts.unshift(current.name);
                        current = current.parent as TreeNode;
                    }
                    // Remove the first path part and join the rest with forward slashes
                    const output = pathParts.join('/') + '/';
                    return output;
                }


                
                // console.log("temps3Key", temps3Key);

                // console.log("s3key of file in tree", temps3Key);

                currentNode.children[file.name] = {
                    name: file.name,
                    type: 'file',
                    s3Key: temps3Key,
                    size: file.size,
                    children: {},
                    LastModified: new Date().toISOString(),
                    metadata: {
                        uploadbyname: `${(userInfo?.payload?.family_name as string) || ''} ${(userInfo?.payload?.given_name as string) || ''}`.trim(),
                        Metadata: {
                            id: newFile.id,
                            pre_upload: 'COMPLETED',
                            tags: [],
                        },
                    },

                };

                return newFile;
            } catch (error) {
                console.error('Error uploading file:', error);
                return null;
            }
        });

        const newFiles = (await Promise.all(uploadPromises)).filter((item): item is Payment => item !== null);
        // console.log("new files:", newFiles);
        setTableData(prevData => [...prevData, ...newFiles]);
        setShowUploadOverlay(false);
    };




    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const moveFile = async (sourceKey: string, destinationKey: string) => {
        try {
            const response = await post({
                apiName: 'S3_API',
                path: `/s3/${bucketUuid}/move-url`,
                options: {
                    withCredentials: true,
                    body: {
                        sourceKey: sourceKey,      // e.g. 'folder1/oldfile.pdf'
                        destinationKey: destinationKey  // e.g. 'folder2/newfile.pdf'
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

        // Get the drop coordinates from the event
        // Proceed with the existing file movement logic
        try {
            const cleanKey = (key: string): string => {
                return key.replace(/^[^/]+\//, '');
            };

            const sourceKey = cleanKey(activeItem.s3Key);
            let destinationKey = cleanKey(`${overItem.s3Key}${activeItem.name}`);

            if (activeItem.isFolder && !destinationKey.endsWith('/')) {
                destinationKey += '/';
            }

            // console.log('sourceKey:', sourceKey);
            // console.log('destinationKey:', destinationKey);
            // console.log('activeItem:', activeItem);
            // console.log('overItem:', overItem);

            console.log("original s3:", sourceKey);
            console.log("new s3 location:", destinationKey);

            // Set items to pending state
            setTableData(prevData => prevData.map(item =>
                (item.id === activeItem.id || item.id === overItem.id)
                    ? { ...item, uploadProcess: 'PENDING' }
                    : item
            ));

            await moveFile(sourceKey, destinationKey);

            // Update the UI after successful move
            setTableData(prevData => prevData.filter(item => item.id !== activeItem.id));
            setTableData(prevData => prevData.map(item =>
                (item.id === overItem.id)
                    ? { ...item, uploadProcess: 'COMPLETED' }
                    : item
            ));

            // Update the tree structure
            const currentNode = useS3Store.getState().currentNode;
            const nodeBeingMoved = currentNode.children[activeItem.name];
            nodeBeingMoved.s3Key = `${bucketUuid}/${destinationKey}`;
            currentNode.children[overItem.name].children[activeItem.name] = nodeBeingMoved;
            delete currentNode.children[activeItem.name];

        } catch (error) {
            // Revert the UI state on error
            setTableData(prevData => prevData.map(item =>
                (item.id === activeItem.id || item.id === overItem.id)
                    ? { ...item, uploadProcess: 'COMPLETED' }
                    : item
            ));
            console.error('Error moving file:', error);
        }

        setActiveId(null);
    };



    const handleGoBack = () => {
        goBack();
        transformTreeToTableData(tree, currentPath);
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        const currentNode = useS3Store.getState().currentNode;
        let currS3key = currentNode.s3Key;

        // console.log("s3key stored in table:", `${currS3key}${newFolderName}/`);

        const newFolder: Payment = {
            id: uuidv4(),
            type: 'folder',
            name: newFolderName,
            status: "success",
            size: '',
            date: new Date().toISOString(),
            uploadedBy: "",
            s3Key: `${currS3key}${newFolderName}/`,
            s3Url: '',
            isFolder: true,
            uploadProcess: 'PENDING',
            tags: [],
            summary: '',
        };

        // console.log('new folder:', newFolder);

        // Add to UI immediately with pending state
        setTableData(prevData => sortTableData([...prevData, newFolder]));
        setNewFolderName('');
        setShowFolderModal(false);

        try {
            // Call the store method to create folder
            await useS3Store.getState().createFolder(newFolderName, bucketUuid);

            // Update folder state to completed after successful creation
            setTableData(prev =>
                prev.map(item =>
                    item.id === newFolder.id
                        ? { ...item, uploadProcess: 'COMPLETED' }
                        : item
                )
            );
        } catch (error) {
            // Remove folder from UI if creation fails
            setTableData(prev => prev.filter(item => item.id !== newFolder.id));
            console.error('Error creating folder:', error);
        }
    };

    const handleColumnResize = (column: "name" | "owner" | "lastModified" | "fileSize" | "tags" | "actions", newWidth: string) => {
        const newColumnWidths = { ...columnWidths };
        const widthDiff = parseFloat(newWidth) - parseFloat(columnWidths[column]);
        const remainingColumns = Object.keys(columnWidths).length - 1;
        const adjustment = widthDiff / remainingColumns;

        (Object.keys(newColumnWidths) as (keyof typeof columnWidths)[]).forEach(key => {
            if (key === column) {
                newColumnWidths[key] = newWidth;
            } else {
                const currentWidth = parseFloat(newColumnWidths[key]);
                newColumnWidths[key] = `${currentWidth - adjustment}%`;
            }
        });

        setColumnWidths(newColumnWidths);
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchValue(value);

        const currentNode = useS3Store.getState().currentNode;

        // If search query is empty, show current folder contents
        if (!value.trim()) {
            const currentFolderContents = Object.entries(currentNode.children).map(([name, childNode]) => ({
                id: childNode.metadata?.id || crypto.randomUUID(),
                name: name,
                type: childNode.type === 'folder' ? 'folder' : name.split('.').pop()?.toUpperCase() || 'Unknown',
                status: "success" as const,
                size: childNode.type === 'folder' ? '' : formatFileSize(childNode.size || 0),
                date: childNode.LastModified || new Date().toISOString(),
                uploadedBy: childNode.metadata?.uploadbyname || '',
                s3Key: childNode.s3Key || name,
                s3Url: childNode.metadata?.url || '',
                isFolder: childNode.type === 'folder',
                uploadProcess: childNode.metadata?.pre_upload || 'COMPLETED',
                tags: childNode.metadata?.tags || [],
                summary: childNode.metadata?.document_summary || ''
            }));
            setTableData(sortTableData(currentFolderContents));
            return;
        }

        if (searchScope === 'all') {
            const allMatches = searchAllFiles(tree, value.toLowerCase());
            setTableData(sortTableData(allMatches));
        } else {
            const currentMatches = searchCurrentFolder(currentNode, value.toLowerCase());
            setTableData(sortTableData(currentMatches));
        }
    };

    const handleRefresh = () => {
        clearTree();
        fetchObjects(bucketUuid);
        if (tree) {
            transformTreeToTableData(tree, currentPath)
                .then(transformedData => {
                    setTableData(transformedData);
                    setTimeout(() => {
                        setIsLoading(false);
                    }, 500);
                });
        }

    }


    const searchAllFiles = (tree: TreeNode, query: string): Payment[] => {
        const matches: Payment[] = [];

        const traverse = (node: TreeNode) => {
            for (const [name, childNode] of Object.entries(node.children)) {
                // Only include files, skip folders
                if (childNode.type !== 'folder' && name.toLowerCase().includes(query)) {
                    matches.push({
                        id: childNode.metadata?.id || crypto.randomUUID(),
                        name: name,
                        type: name.split('.').pop()?.toUpperCase() || 'Unknown',
                        status: "success",
                        size: formatFileSize(childNode.size || 0),
                        date: childNode.LastModified || new Date().toISOString(),
                        uploadedBy: childNode.metadata?.uploadbyname || '',
                        s3Key: childNode.s3Key || name,
                        s3Url: childNode.metadata?.url || '',
                        isFolder: false,
                        uploadProcess: childNode.metadata?.pre_upload || 'COMPLETED',
                        tags: childNode.metadata?.tags || [],
                        summary: childNode.metadata?.document_summary || ''
                    });
                }
                // Still traverse into folders to find files
                if (childNode.type === 'folder') {
                    traverse(childNode);
                }
            }
        };

        traverse(tree);
        return matches;
    };

    const searchCurrentFolder = (currentNode: TreeNode, query: string): Payment[] => {
        const matches: Payment[] = [];

        for (const [name, childNode] of Object.entries(currentNode.children)) {
            // Only include files, skip folders
            if (childNode.type !== 'folder' && name.toLowerCase().includes(query)) {
                matches.push({
                    id: childNode.metadata?.id || crypto.randomUUID(),
                    name: name,
                    type: name.split('.').pop()?.toUpperCase() || 'Unknown',
                    status: "success",
                    size: formatFileSize(childNode.size || 0),
                    date: childNode.LastModified || new Date().toISOString(),
                    uploadedBy: childNode.metadata?.uploadbyname || '',
                    s3Key: childNode.s3Key || name,
                    s3Url: childNode.metadata?.url || '',
                    isFolder: false,
                    uploadProcess: childNode.metadata?.pre_upload || 'COMPLETED',
                    tags: childNode.metadata?.tags || [],
                    summary: childNode.metadata?.document_summary || ''
                });
            }
        }

        return matches;
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
                <BreadcrumbNav
                    pathNodes={pathNodes}
                    onNavigate={handleBreadcrumbClick}
                />
            </div>
            <div className="flex justify-between items-center  py-4 h-[10%] px-[36px] mb-2">

                <div className="buttons flex flex-row gap-2">
                    <button
                        className="flex items-center gap-2 bg-blue-500 text-white px-4 py-1 rounded-full hover:bg-blue-700"
                        onClick={handleUploadClick}>
                        <Upload size={16} />
                        <span className="text-sm">Upload</span>
                    </button>
                    <button
                        onClick={() => setShowFolderModal(true)}
                        className="flex items-center gap-2 bg-gray-200 text-gray-800 px-4 py-1 rounded-full hover:bg-slate-300 dark:bg-darkbg dark:text-white dark:border dark:border-slate-600 outline-none">
                        <span className="text-sm">Create Folder</span>

                        <Plus size={16} />
                    </button>

                    <button
                        onClick={handleRefresh}
                        className="flex items-center justify-center p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
                        aria-label="Refresh"
                    >
                        <RefreshCcw size={16} />
                    </button>

                </div>


                <div className="relative xl:w-[45%] flex">
                    <Select defaultValue="current" onValueChange={(value) => setSearchScope(value)}>
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
                    />
                </div>



            </div>

            <ScrollArea data-drop-zone className="w-full h-full ">
                <div className="flex flex-grow ">

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

            {showUploadOverlay && (
                <DragDropOverlay
                    onClose={() => setShowUploadOverlay(false)}
                    onFilesUploaded={handleFilesUploaded}
                    currentPath={currentPath} // Pass the current path
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
                                onClick={handleCreateFolder}
                                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
