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
}


interface FileSystemProps {
    onFileSelect: (file: FileNode) => void;
}


export const FileSystem: React.FC<FileSystemProps> = ({ onFileSelect }) => {
    const [tableData, setTableData] = useState<FileNode[]>([]);
    const pathname = usePathname();
    const pathArray = pathname.split('/');
    const bucketUuid = pathArray[2] || '';
    const emailRef = useRef<string | null>(null);
    const [currentUser, setCurrentUser] = React.useState<string>('');
    const [userInfo, setUserInfo] = React.useState<JWT | undefined>(undefined);
    
    
    
    React.useEffect(() => {
        getUserInfo().then(username => setCurrentUser(username));
    }, []);

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


    React.useEffect(() => {
        getUserInfo();
        handleSetTableData("ROOT");
    });





    const handleSetTableData = async (id: string) => {
        console.log("bucketUuid:", bucketUuid);
        console.log("id:", id);
    //    try {
    //         const restOperation = get({
    //           apiName: 'S3_API',
    //           path: `/s3/${bucketUuid}/head-objects-for-bucket`,
    //           options: { 
    //             withCredentials: true,
    //             body: {
    //                 folderId: id
    //             },
    //          },
              

    //         });

            
    //         const { body } = await restOperation.response;
    //         const responseText = await body.text();
    //         const response = JSON.parse(responseText);

    //         console.log ('response:', response);
    //    } catch (error) {
    //         console.error('Error fetching table data:', error);
    //    }

    try {
            // await getS3Client();
            const restOperation = get({
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

            console.log("response", response);
      
            // if (response.headObjects) {
            //   console.log('S3 objects:', response.headObjects);
            //   const transformedData = transformS3DataToTree(response.headObjects);
            //   console.log('Transformed tree data:', transformedData);
            //   setTreeData(transformedData);
            // }
          } catch (error) {
            console.error('Error listing S3 objects:', error);
          } finally {
            // setIsLoading(false);
          }
    };



    const handleCreateFolder = async (parentId: string, name: string) => {
        try {
            const response = await post({
              apiName: 'S3_API',
              path: `/s3/${bucketUuid}/create-folder`,
              options: {
                withCredentials: true,
                body: {
                  folderName: name,
                  parentFolderId: parentId
                }
              }
            });
      
            const { body } = await response.response;
            const result = await body.json();

            console.log('result:', result);
      
      
          } catch (error) {
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

    return <div></div>;
};


//     return (
// //         <div className="select-none w-full dark:bg-darkbg pt-4 h-full flex flex-col outline-none" onClick={handleBackgroundClick}>
// //             <style jsx>{`
// //                 .resizer {
// //     position: absolute;
// //     right: -3px; /* Move slightly outside the cell */
// //     top: 0;
// //     height: 100%;
// //     width: 6px;
// //     background: transparent;
// //     cursor: col-resize;
// //     user-select: none;
// //     touch-action: none;
// //     transition: background 0.2s;
// // }

// // .ScrollArea {
// //     position: relative;
// //     overflow: hidden;
// //     height: 100%;
// //     width: 100%;
// // }

// // .resizer:hover,
// // .resizer.isResizing {
// //     background: rgba(0, 0, 0, 0.3);
// // }

// // th {
// //     position: relative;
// //     transition: width 0.1s ease;
// //     padding-right: 15px; /* Add padding to accommodate the resizer */
// // }

// // /* Add visual indicator on hover */
// // .resizer::after {
// //     content: '';
// //     position: absolute;
// //     right: 2px;
// //     top: 0;
// //     height: 100%;
// //     width: 2px;
// //     background: #cbd5e1;
// //     opacity: 0;
// //     transition: opacity 0.2s;
// // }

// // .resizer:hover::after {
// //     opacity: 1;
// // }

                
// //                 @media (hover: hover) {
// //                     .resizer {
// //                         opacity: 0;
// //                     }
                
// //                     *:hover > .resizer {
// //                         opacity: 1;
// //                     }
// //                 }
                
// //                 table {
// //                     width: 100%;
// //                     border-collapse: separate;
// //                     border-spacing: 0;
// //                 }
                
         
// //             `}</style>



// //             <div className="w-full px-[36px] flex">
// //                 <BreadcrumbNav
// //                     pathNodes={pathNodes}
// //                     onNavigate={handleBreadcrumbClick}
// //                 />
// //             </div>
// //             <div className="flex justify-between items-center  py-4 h-[10%] px-[36px] mb-2">

// //                 <div className="buttons flex flex-row gap-2">
// //                     <DropdownMenu>
// //                         <DropdownMenuTrigger asChild>
// //                             <button className="flex items-center gap-2 bg-transparent text-black border dark:border-slate-600 dark:text-gray-200 px-4 py-1 rounded-full hover:bg-blue-700 select-none outline-none">
// //                                 <span className = "text-sm">Manage Documents</span>
// //                                 <ChevronDown size={16} />
// //                             </button>
// //                         </DropdownMenuTrigger>
// //                         <DropdownMenuContent align="end">
// //                             <DropdownMenuItem onClick={handleUploadClick} className="flex items-center gap-2">
// //                                 <Upload size={16} />
// //                                 <span>Upload</span>
// //                             </DropdownMenuItem>
// //                             <DropdownMenuItem onClick={() => setShowFolderModal(true)} className="flex items-center gap-2">
// //                                 <Plus size={16} />
// //                                 <span>Create Folder</span>
// //                             </DropdownMenuItem>
// //                             <DropdownMenuItem onClick={() => setShowFileOrganizer(true)} className="flex items-center gap-2">
// //                                 <Folder size={16} />
// //                                 <span>Organize Documents</span>
// //                             </DropdownMenuItem>
// //                         </DropdownMenuContent>
// //                     </DropdownMenu>
// //                     {showFileOrganizer && (
// //                         <FileOrganizerDialog
// //                             bucketId={bucketUuid}
// //                             onOrganize={(...args) => {
// //                                 setShowFileOrganizer(false);
// //                                 handleOrganize(...args);
// //                             }}
// //                             onClose={() => setShowFileOrganizer(false)}
// //                             open={true}
// //                         />
// //                     )}
// //                     <button
// //                         onClick={handleRefresh}
// //                         className="flex items-center justify-center p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
// //                         aria-label="Refresh"
// //                     >
// //                         <RefreshCcw size={16} />
// //                     </button>

// //                 </div>


// //                 <div className="relative xl:w-[45%] flex">
// //                     <Select defaultValue="current" onValueChange={(value) => setSearchScope(value)}>
// //                         <SelectTrigger
// //                             className="absolute left-[10px] top-[20%] h-[60%] w-[120px] border dark:border-slate-600 rounded-ml 
// //             dark:bg-transparent dark:text-slate-300 focus-visible:ring-0 focus-visible:ring-offset-0 
// //             focus:outline-none focus-visible:outline-none ring-0"
// //                         >
// //                             <SelectValue />
// //                         </SelectTrigger>
// //                         <SelectContent className='dark:bg-darkbg dark:text-white outline-none border dark:border-slate-600'>
// //                             <SelectItem value="current" className='dark:text-slate-300'>Folder</SelectItem>
// //                             <SelectItem value="all" className='dark:text-slate-300'>All Files</SelectItem>
// //                         </SelectContent>
// //                     </Select>
// //                     <Input
// //                         placeholder="Search files..."
// //                         value={searchValue}
// //                         onChange={handleSearch}
// //                         className="pl-[140px] w-full dark:border-slate-600 
// //         border-slate-200 dark:bg-darkbg dark:text-white outline-none"
// //                     />
// //                 </div>



// //             </div>

// //             <ScrollArea data-drop-zone className=" relative w-full h-full ">
// //                 <div
// //                     className="absolute bottom-4 right-4 z-50"
// //                     style={{
// //                         maxWidth: '90%',
// //                         pointerEvents: 'none'
// //                     }}
// //                 >
// //                     <Snackbar
// //                         open={snackbarOpen}
// //                         onClose={handleSnackbarClose}
// //                         message={
// //                             <div className="flex items-center gap-2">
// //                                 <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white">
// //                                     <svg
// //                                         width="12"
// //                                         height="12"
// //                                         viewBox="0 0 24 24"
// //                                         fill="none"
// //                                         stroke="currentColor"
// //                                         strokeWidth="3"
// //                                         strokeLinecap="round"
// //                                         strokeLinejoin="round"
// //                                     >
// //                                         <polyline points="20 6 9 17 4 12" />
// //                                     </svg>
// //                                 </div>
// //                                 <span>{snackbarMessage}</span>
// //                             </div>
// //                         }
// //                         autoHideDuration={3000}
// //                         ContentProps={{
// //                             style: {
// //                                 backgroundColor: 'var(--background)',
// //                                 color: 'var(--foreground)',
// //                             },
// //                             className: 'dark:bg-slate-800 dark:text-white bg-white text-black text-xs'
// //                         }}
// //                         style={{
// //                             position: 'relative',
// //                             transform: 'none',
// //                             bottom: 0,
// //                             left: 0
// //                         }}
// //                     />
// //                 </div><div className="flex flex-grow ">

// //                     <DndContext
// //                         sensors={sensors}
// //                         collisionDetection={closestCenter}
// //                         onDragStart={handleDragStart}
// //                         onDragEnd={handleDragEnd}
// //                     >

// //                         <div style={{ paddingLeft: '20px' }} className="text-xs dark:text-white text-slate-800 mb-2" >

// //                             <table style={{
// //                                 width: '100%',
// //                                 minWidth: '800px', // Set your desired minimum width
// //                                 borderCollapse: 'collapse',
// //                                 tableLayout: 'fixed',
// //                             }}>

// //                                 <thead>

// //                                     <tr className="text-xs font-thin dark:text-white text-slate-600">


// //                                         <ResizableHeader column="name" width={columnWidths.name}
// //                                         >
// //                                             Name
// //                                         </ResizableHeader>
// //                                         <ResizableHeader column="owner" width={columnWidths.owner}
// //                                         >
// //                                             Owner
// //                                         </ResizableHeader>
// //                                         <ResizableHeader column="lastModified" width={columnWidths.lastModified}
// //                                         >
// //                                             Last modified
// //                                         </ResizableHeader>
// //                                         <ResizableHeader column="fileSize" width={columnWidths.fileSize}
// //                                         >
// //                                             File size
// //                                         </ResizableHeader>
// //                                         <ResizableHeader column="tags" width={columnWidths.tags}
// //                                         >
// //                                             Tags
// //                                         </ResizableHeader>
// //                                         <ResizableHeader column="" width={columnWidths.status}
// //                                         >
// //                                             {''}
// //                                         </ResizableHeader>
// //                                         <ResizableHeader column="actions" width={columnWidths.actions}
// //                                         >
// //                                             {' '}
// //                                         </ResizableHeader>

// //                                     </tr>
// //                                 </thead>
// //                                 <tbody className="w-full">
// //                                     <SortableContext items={tableData} strategy={horizontalListSortingStrategy}>
// //                                         {isLoading ? (
// //                                             <>
// //                                                 <SortableItem
// //                                                     item={dummy}
// //                                                     loading={true}
// //                                                     selectedItemId={selectedItemId}
// //                                                     onSelect={setSelectedItemId}
// //                                                 />
// //                                                 <SortableItem
// //                                                     item={dummy}
// //                                                     loading={true}
// //                                                     selectedItemId={selectedItemId}
// //                                                     onSelect={setSelectedItemId}
// //                                                 />
// //                                                 <SortableItem
// //                                                     item={dummy}
// //                                                     loading={true}
// //                                                     selectedItemId={selectedItemId}
// //                                                     onSelect={setSelectedItemId}
// //                                                 />
// //                                                 <SortableItem
// //                                                     item={dummy}
// //                                                     loading={true}
// //                                                     selectedItemId={selectedItemId}
// //                                                     onSelect={setSelectedItemId}
// //                                                 />
// //                                                 <SortableItem
// //                                                     item={dummy}
// //                                                     loading={true}
// //                                                     selectedItemId={selectedItemId}
// //                                                     onSelect={setSelectedItemId}
// //                                                 />
// //                                             </>

// //                                         ) : (
// //                                             tableData.map((item) => (
// //                                                 <SortableItem
// //                                                     key={item.id}
// //                                                     item={item}
// //                                                     loading={false}
// //                                                     selectedItemId={selectedItemId}
// //                                                     onSelect={setSelectedItemId}
// //                                                 />
// //                                             ))
// //                                         )}



// //                                     </SortableContext>
// //                                 </tbody>
// //                             </table>
// //                         </div>
// //                         <DragOverlay>
// //                             {activeId ? (
// //                                 <DragPreview
// //                                     item={tableData.find(item => item.id === activeId)!}
// //                                 />
// //                             ) : null}
// //                         </DragOverlay>
// //                     </DndContext>
// //                 </div>


// //                 <ScrollBar orientation="horizontal" />
// //             </ScrollArea>

// //             {showUploadOverlay && (
// //                 <DragDropOverlay
// //                     onClose={() => setShowUploadOverlay(false)}
// //                     onFilesUploaded={handleFilesUploaded}
// //                     currentPath={currentPath} // Pass the current path
// //                 />
// //             )}
// //             {showFolderModal && (
// //                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
// //                     <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
// //                         <h3 className="text-lg font-semibold mb-4 dark:text-white">Create New Folder</h3>
// //                         <input
// //                             type="text"
// //                             value={newFolderName}
// //                             onChange={(e) => setNewFolderName(e.target.value)}
// //                             placeholder="Enter folder name"
// //                             className="w-full px-3 py-2 border rounded-md mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
// //                             autoFocus
// //                         />
// //                         <div className="flex justify-end gap-2">
// //                             <button
// //                                 onClick={() => {
// //                                     setShowFolderModal(false);
// //                                     setNewFolderName('');
// //                                 }}
// //                                 className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md dark:text-gray-300 dark:hover:bg-gray-700"
// //                             >
// //                                 Cancel
// //                             </button>
// //                             <button
// //                                 onClick={handleCreateFolder}
// //                                 className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
// //                             >
// //                                 Create
// //                             </button>
// //                         </div>
// //                     </div>
// //                 </div>
// //             )}
// //         </div>
//             <div></div>
//     );
// };