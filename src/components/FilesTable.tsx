import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, FileIcon, FolderIcon, MoreHorizontal, Upload } from "lucide-react"
import DragDropOverlay from "./DragDrop"
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import EnhancedFileViewer from "@/components/EnhancedFileviewer"
import { post } from "aws-amplify/api";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { usePathname, useSearchParams } from 'next/navigation';
// import { delete } from "aws-amplify/api";
import { get } from "aws-amplify/api";
import { S3Object, useS3Store } from "./fileService";

const data: Payment[] = [
]

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

  }
  

interface FileViewerProps {
    isOpen: boolean
    onClose: () => void
    documentUrl?: string
    documentName?: string
}



const S3_BUCKET_NAME = 'vdr-documents';
const REGION = 'us-east-1';

const getUserPrefix = async () => {
    try {
        const { identityId } = await fetchAuthSession();
        if (!identityId) {
            throw new Error('No identity ID available');
        }
        console.log("The identity id:", identityId);
        return `${identityId}/`;
    } catch (error) {
        console.error('Error getting user prefix:', error);
        throw error;
    }
};

const getS3Client = async () => {
    try {
        const { credentials } = await fetchAuthSession();

        if (!credentials) {
            throw new Error('No credentials available');
        }

        return new S3Client({
            region: REGION,
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
                sessionToken: credentials.sessionToken
            }
        });
    } catch (error) {
        console.error('Error getting credentials:', error);
        throw error;
    }
};


const getUserInfo = async () => {
    try {
        const userInfo = await getCurrentUser();
        console.log(userInfo.username);
        return userInfo.username;
    } catch (error) {
        console.error('Error getting user info:', error);
        return 'Unknown User';
    }
};

const getPresignedUrl = async (s3Key: string) => {
    try {

        console.log("Waiting on s3 client");

        const s3Client = await getS3Client();

        console.log("Got the s3 client");
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: s3Key
        });

        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch (error) {
        console.error('Error generating signed URL:', error);
        throw error;
    }
};

// Helper function to delete object
const deleteS3Object = async (s3Key: string, bucketUuid: string) => {
    try {
        const deleteResponse = await get({
            apiName: 'S3_API',
            path: `/s3/${bucketUuid}/delete-url`,
            options: {
                withCredentials: true,
                queryParams: {
                    path: s3Key
                }
            }
        });

        const { statusCode } = await deleteResponse.response;

        if (statusCode !== 200) {
            const { body } = await deleteResponse.response;
            const errorText = await body.text();
            throw new Error(`Delete failed: ${errorText}`);
        }

    } catch (error) {
        console.error('Error deleting object:', error);
        throw error;
    }
};

function truncateString(str: string) {
    if (str.length > 20) {
        return str.substring(0, 20) + '...';
    }

    return str;
}


const TagDisplay = ({ tags }: { tags: string[] }) => {
    const tagColors = [
        'bg-blue-100 text-blue-800',
        'bg-green-100 text-green-800',
        'bg-yellow-100 text-yellow-800',
        'bg-red-100 text-red-800',
        'bg-indigo-100 text-indigo-800',
        'bg-purple-100 text-purple-800',
        'bg-pink-100 text-pink-800',
    ];

    const displayedTags = tags.slice(0, 2);
    const remainingCount = Math.max(0, tags.length - 2);

    return (
        <div className="flex flex-wrap gap-1 items-center">
            {displayedTags.map((tag, index) => (
                <span
                    key={index}
                    className={`px-2 py-1 text-xs font-medium rounded-full ${tagColors[index % tagColors.length]}`}
                >
                    {tag}
                </span>
            ))}
            {remainingCount > 0 && (
                <span className="text-xs text-gray-500">+{remainingCount} more</span>
            )}
        </div>
    );
};


export const columns: ColumnDef<Payment>[] = [
    // {
    //     id: "select",
    //     header: ({ table }) => (
    //         <Checkbox
    //             checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
    //             onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
    //             aria-label="Select all"
    //         />
    //     ),
    //     cell: ({ row }) => (
    //         <Checkbox
    //             checked={row.getIsSelected()}
    //             onCheckedChange={(value) => row.toggleSelected(!!value)}
    //             aria-label="Select row"
    //         />
    //     ),
    //     enableSorting: false,
    //     enableHiding: false,
    //     enableResizing: false,
    // },
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
            <div className="flex items-center">
                {row.original.isFolder ? (
                    <>
                        <FolderIcon className="mr-2 h-4 w-4" />
                        <div>{row.getValue("name")}</div>
                    </>
                ) : (
                    <>
                        <FileIcon className="mr-2 h-4 w-4" />
                        <div>{truncateString(row.getValue("name"))}</div>
                    </>
                )}
            </div>
        ),
        enableResizing: true,
        size: 200,
    },
    {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => <div className="capitalize">{row.getValue("type")}</div>,
        enableResizing: true,
        size: 100,
    },
    {
        accessorKey: "date",
        header: "Date Uploaded",
        cell: ({ row }) => <div className="capitalize">{row.getValue("date")}</div>,
        enableResizing: true,
        size: 150,
    },
    {
        accessorKey: "size",
        header: "Size",
        cell: ({ row }) => <div className="">{row.getValue("size")}</div>,
        enableResizing: true,
        size: 100,
    },
    {
        accessorKey: "uploadedBy",
        header: "Uploaded By",
        cell: ({ row }) => <div className="">{row.getValue("uploadedBy")}</div>,
        enableResizing: true,
        size: 100,
    },
    {
        accessorKey: "tags",
        header: "Tags",
        cell: ({ row }) => <TagDisplay tags={row.getValue("tags") || []} />,
        enableResizing: true,
        size: 200,
    },

]

interface DataTableDemoProps {
    onFileSelect: (file: Payment) => void;
}

export function DataTableDemo({ onFileSelect }: DataTableDemoProps) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [showUploadOverlay, setShowUploadOverlay] = React.useState(false);
    const [tableData, setTableData] = React.useState<Payment[]>(data);
    const [currentUser, setCurrentUser] = React.useState<string>('');
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    )
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    // const [isLoading, setIsLoading] = React.useState(true);
    const [viewerOpen, setViewerOpen] = React.useState(false)
    const [currentDocument, setCurrentDocument] = React.useState<{ url?: string, name?: string }>({})
    const [currentPath, setCurrentPath] = React.useState<string[]>([]);
    const { objects, isLoading, fetchObjects } = useS3Store();


    const Breadcrumb = ({ paths, onNavigate }: { paths: string[], onNavigate: (index: number) => void }) => {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <span
                    className="hover:text-blue-500 cursor-pointer"
                    onClick={() => onNavigate(-1)}
                >
                    Home
                </span>
                {paths.map((path, index) => (
                    <React.Fragment key={index}>
                        <span className="text-gray-400">/</span>
                        <span
                            className="hover:text-blue-500 cursor-pointer"
                            onClick={() => onNavigate(index)}
                        >
                            {truncateString(path, 17)}
                        </span>
                    </React.Fragment>
                ))}
            </div>
        );
    };

    const handleBreadcrumbNavigate = async (index: number) => {
        let newPath;
        if (index === -1) {
            newPath = [bucketUuid];
        } else {
            newPath = currentPath.slice(0, index + 1);
        }
        if (index !== -1) {
            setCurrentPath(newPath);
        } else {
            setCurrentPath([]);
        }

        const folderPath = newPath + "/";
        console.log("Navigating to folder:", folderPath);
        try {
            await getS3Client();
            const restOperation = get({
                apiName: 'S3_API',
                path: `/s3/${bucketUuid}/head-objects-for-bucket`,
                options: { withCredentials: true }
            });

            const { body } = await restOperation.response;
            const responseText = await body.text();
            const responseMain = JSON.parse(responseText);

            if (responseMain?.headObjects) {
                const currentPath = folderPath;

                // Extract immediate subfolders only
                const folders = new Set<string>();
                responseMain.headObjects
                    .filter((object: { key?: string }) => {
                        const key = object.key || '';
                        if (!key.startsWith(currentPath)) return false;
                        const relativePath = key.slice(currentPath.length);
                        const parts = relativePath.split('/').filter(Boolean);
                        return parts.length === 1 && key.endsWith('/');
                    })
                    .forEach((object: { key?: string }) => {
                        if (object.key) {
                            const folderName = object.key
                                .slice(currentPath.length)
                                .split('/')[0];
                            folders.add(folderName);
                        }
                    });

                // Create folder entries
                const folderEntries: Payment[] = Array.from(folders).map(folder => ({
                    id: `folder-${folder}`,
                    type: 'FOLDER',
                    name: folder,
                    status: 'success',
                    size: ' ',
                    date: ' ',
                    uploadedBy: ' ',
                    isFolder: true,
                    s3Key: `${currentPath}${folder}/`,
                    s3Url: ''
                }));

                // Get immediate files in current folder
                const files = await Promise.all(
                    responseMain.headObjects
                        .filter((object: { key?: string }) => {
                            const key = object.key || '';
                            if (!key.startsWith(currentPath)) return false;
                            const relativePath = key.slice(currentPath.length);
                            const parts = relativePath.split('/').filter(Boolean);
                            return parts.length === 1 && !key.endsWith('/');
                        })
                        .map(async (object: any) => {
                            if (!object.key) return null;
                            const metadata = object.metadata || {};
                            return {
                                id: object.key,
                                type: object.key.split('.').pop()?.toUpperCase() || 'Unknown',
                                name: metadata.Metadata?.originalname || object.key.split('/').pop() || '',
                                status: "success" as const,
                                size: formatFileSize(metadata.ContentLength || 0),
                                date: metadata.LastModified?.split('T')[0] || '',
                                uploadedBy: metadata.Metadata?.uploadedby || 'Unknown',
                                s3Key: object.key,
                                isFolder: false
                            };
                        })
                );

                const validFiles = files.filter((file): file is Payment =>
                    file !== null && typeof file === 'object' && 'id' in file
                );

                setTableData([...folderEntries, ...validFiles]);
            }
        } catch (error) {
            console.error('Error fetching folder contents:', error);
        }
    };




    const handleRowDoubleClick = async (payment: Payment) => {
        if (payment.isFolder) {
            setCurrentPath(prev => [...prev, payment.name]);

            try {
                await getS3Client();
                const restOperation = get({
                    apiName: 'S3_API',
                    path: `/s3/${bucketUuid}/head-objects-for-bucket`,
                    options: { withCredentials: true }
                });

                const { body } = await restOperation.response;
                const responseText = await body.text();
                const responseMain = JSON.parse(responseText);

                if (responseMain?.headObjects) {
                    const currentPath = payment.s3Key;

                    // Extract immediate subfolders only
                    const folders = new Set<string>();
                    responseMain.headObjects
                        .filter((object: { key?: string }) => {
                            const key = object.key || '';
                            if (!key.startsWith(currentPath)) return false;
                            const relativePath = key.slice(currentPath.length);
                            const parts = relativePath.split('/').filter(Boolean);
                            return parts.length === 1 && key.endsWith('/');
                        })
                        .forEach((object: { key?: string }) => {
                            if (object.key) {
                                const folderName = object.key
                                    .slice(currentPath.length)
                                    .split('/')[0];
                                folders.add(folderName);
                            }
                        });

                    // Create folder entries
                    // const folderEntries: Payment[] = Array.from(folders).map(folder => ({
                    //     id: `folder-${folder}`,
                    //     type: 'FOLDER',
                    //     name: folder,
                    //     status: 'success',
                    //     size: ' ',
                    //     date: ' ',
                    //     uploadedBy: ' ',
                    //     isFolder: true,
                    //     s3Key: `${currentPath}${folder}/`
                    // }));

                    // Get immediate files in current folder
                    const files = await Promise.all(
                        responseMain.headObjects
                            .filter((object: { key?: string }) => {
                                const key = object.key || '';
                                if (!key.startsWith(currentPath)) return false;
                                const relativePath = key.slice(currentPath.length);
                                const parts = relativePath.split('/').filter(Boolean);
                                return parts.length === 1 && !key.endsWith('/');
                            })
                            .map(async (object: any) => {
                                if (!object.key) return null;
                                const metadata = object.metadata || {};
                                return {
                                    id: object.key,
                                    type: object.key.split('.').pop()?.toUpperCase() || 'Unknown',
                                    name: metadata.Metadata?.originalname || object.key.split('/').pop() || '',
                                    status: "success" as const,
                                    size: formatFileSize(metadata.ContentLength || 0),
                                    date: metadata.LastModified?.split('T')[0] || '',
                                    uploadedBy: metadata.Metadata?.uploadedby || 'Unknown',
                                    s3Key: object.key,
                                    isFolder: false
                                };
                            })
                    );

                    const validFiles = files.filter((file): file is Payment =>
                        file !== null && typeof file === 'object' && 'id' in file
                    );
                    console.log("hii\n");
                    // setTableData([...folderEntries, ...validFiles]);
                }
            } catch (error) {
                console.error('Error fetching folder contents:', error);
            }
            return;
        }
        if (payment.s3Key) {
            try {
                const downloadResponse = await get({
                    apiName: 'S3_API',
                    path: `/s3/${bucketUuid}/download-url`,
                    options: {
                        withCredentials: true,
                        queryParams: { path: payment.s3Key }
                    }
                });
                const { body } = await downloadResponse.response;
                const responseText = await body.text();
                const { signedUrl } = JSON.parse(responseText);
                onFileSelect({
                    ...payment,
                    s3Url: signedUrl,
                });
            } catch (error) {
                console.error('Error getting presigned URL:', error);
            }
        }
    }


    const pathname = usePathname();
    const bucketUuid = pathname.split('/').pop() || '';


    const updatedColumns: ColumnDef<Payment>[] = [
        ...columns,
        {
            id: "actions",
            cell: ({ row }) => {
                const payment = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={async () => {
                                    if (payment.s3Key) {
                                        try {
                                            const downloadResponse = await get({
                                                apiName: 'S3_API',
                                                path: `/s3/${bucketUuid}/download-url`,
                                                options: {
                                                    withCredentials: true,
                                                    queryParams: {
                                                        path: payment.s3Key
                                                    }
                                                }
                                            });

                                            const { body } = await downloadResponse.response;
                                            const responseText = await body.text();
                                            const { signedUrl } = JSON.parse(responseText);
                                            onFileSelect({
                                                id: payment.id,
                                                name: payment.name,
                                                s3Url: signedUrl,
                                                type: payment.type,
                                                size: payment.size,
                                                status: payment.status,
                                                date: payment.date,
                                                uploadedBy: payment.uploadedBy,
                                                s3Key: payment.s3Key,
                                            });
                                        } catch (error) {
                                            console.error('Error getting presigned URL:', error);
                                        }
                                    }
                                }}
                            >
                                View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={async () => {
                                    if (payment.s3Key) {
                                        try {
                                            const url = await getPresignedUrl(payment.s3Key)
                                            window.open(url, '_blank')
                                        } catch (error) {
                                            console.error('Error downloading file:', error)
                                        }
                                    }
                                }}
                            >
                                Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={async () => {
                                    if (payment.s3Key) {
                                        try {
                                            await deleteS3Object(payment.s3Key, bucketUuid);
                                            setTableData(prev =>
                                                prev.filter(item => item.s3Key !== payment.s3Key)
                                            );
                                        } catch (error) {
                                            console.error('Error deleting file:', error);
                                        }
                                    }
                                }}
                            >
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            }
        }
    ]

    const table = useReactTable({
        data: tableData,
        columns: updatedColumns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
        enableColumnResizing: true,
        columnResizeMode: "onChange",
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    })



    const handleUploadClick = () => {
        setShowUploadOverlay(true);
    }

    React.useEffect(() => {
        getUserInfo().then(username => setCurrentUser(username));
        // listS3Objects();
        console.log("Getting user info");
    }, []);
    React.useEffect(() => {
        getUserInfo().then(username => setCurrentUser(username));
    }, []);

    React.useEffect(() => {
        fetchObjects(bucketUuid);
    }, [bucketUuid]);

    React.useEffect(() => {
        if (objects) {
          const transformedData = transformObjectsToTableData(objects, currentPath);
          setTableData(transformedData);
        }
      }, [objects, currentPath]);
      

    const transformObjectsToTableData = (objects: S3Object[], currentPath: string[] = []): Payment[] => {
        const pathPrefix = currentPath.length > 0 
          ? `${bucketUuid}/${currentPath.join('/')}/`
          : `${bucketUuid}/`;
      
        // Extract immediate subfolders only
        const folders = new Set<string>();
        objects
          .filter((object) => {
            const key = object.key || '';
            if (!key.startsWith(pathPrefix)) return false;
            const relativePath = key.slice(pathPrefix.length);
            const parts = relativePath.split('/').filter(Boolean);
            return parts.length === 1 && key.endsWith('/');
          })
          .forEach((object) => {
            if (object.key) {
              const folderName = object.key
                .slice(pathPrefix.length)
                .split('/')[0];
              folders.add(folderName);
            }
          });
      
        // Create folder entries
        const folderEntries: Payment[] = Array.from(folders).map(folder => ({
            id: `folder-${folder}`,
            type: 'FOLDER',
            name: folder,
            status: 'success',
            size: ' ',
            date: ' ',
            uploadedBy: ' ',
            isFolder: true,
            s3Key: `${pathPrefix}${folder}/`,
            s3Url: ''
        }));

        const files = objects
          .filter((object) => {
            const key = object.key || '';
            if (!key.startsWith(pathPrefix)) return false;
            const relativePath = key.slice(pathPrefix.length);
            const parts = relativePath.split('/').filter(Boolean);
            return parts.length === 1 && !key.endsWith('/');
          })
          .map((object) => ({
            id: object.key,
            type: object.key.split('.').pop()?.toUpperCase() || 'Unknown',
            name: object.metadata?.originalname || object.key.split('/').pop() || '',
            status: "success" as const,
            size: formatFileSize(object.metadata?.ContentLength || 0),
            date: object.metadata?.LastModified?.split('T')[0] || '',
            uploadedBy: object.metadata?.uploadedby || 'Unknown',
            s3Key: object.key,
            isFolder: false,
            s3Url: ''
          }));
      
        // Get immediate files in current folder
        // const files = objects
        //   .filter((object) => {
        //     const key = object.key || '';
        //     if (!key.startsWith(pathPrefix)) return false;
        //     const relativePath = key.slice(pathPrefix.length);
        //     const parts = relativePath.split('/').filter(Boolean);
        //     return parts.length === 1 && !key.endsWith('/');
        //   })
        //   .map((object) => ({
        //     id: object.key,
        //     type: object.key.split('.').pop()?.toUpperCase() || 'Unknown',
        //     name: object.metadata?.originalname || object.key.split('/').pop() || '',
        //     status: "success" as const,
        //     size: formatFileSize(object.metadata?.ContentLength || 0),
        //     date: object.metadata?.LastModified?.split('T')[0] || '',
        //     uploadedBy: object.metadata?.uploadedby || 'Unknown',
        //     s3Key: object.key,
        //     isFolder: false
        //   }));
      
        return [...folderEntries, ...files];
      };
      

    const uploadToS3 = async (file: File) => {
        const fileId = file.name.split('.')[0];
        const fileExtension = file.name.split('.').pop() || '';
        // Ensure we're not using the identity ID in the visible part of the key
        const s3Key = `${bucketUuid}/${fileId}.${fileExtension}`;
        return s3Key;

        // try {
        //     const restOperation = post({
        //         apiName: 'VDR_API',
        //         path: `/${bucketUuid}/documents/upload`,
        //         options: {
        //             headers: {
        //                 'Content-Type': 'application/json'
        //             },
        //             body: {
        //                 file_paths: [s3Key]
        //             }
        //         }
        //     });

        // } catch (error) {
        //     console.error('Error uploading to S3:', error);
        //     throw error;
        // }
    };

    const formatFileSize = (bytes: number): string => {
        const KB = 1024;
        const MB = KB * 1024;
        const GB = MB * 1024;

        if (bytes >= GB) {
            return `${(bytes / GB).toFixed(2)} GB`;
        } else if (bytes >= MB) {
            return `${(bytes / MB).toFixed(2)} MB`;
        } else {
            return `${(bytes / KB).toFixed(2)} KB`;
        }
    };

    const truncateString = (str: string, maxLength: number): string => {
        if (str.length <= maxLength) return str;
        return str.slice(0, maxLength - 3) + '...';
    };


    const handleFilesUploaded = async (files: File[]) => {
        const uploadPromises = files.map(async (file) => {
            try {
                const s3Key = await uploadToS3(file);
                return {
                    id: uuidv4(),
                    type: file.name.split('.').pop()?.toUpperCase() || 'Unknown',
                    name: file.name,
                    status: "success" as const,
                    size: formatFileSize(file.size),
                    date: new Date().toISOString().split('T')[0],
                    uploadedBy: currentUser,
                    s3Key: s3Key
                };
            } catch (error) {
                console.error('Error uploading file:', error);
                return null;
            }
        });

        // const newData = (await Promise.all(uploadPromises)).filter((item): item is Payment => item !== null);
        // setTableData(prevData => [...newData, ...prevData]);
        const newFiles = (await Promise.all(uploadPromises)).filter((item): item is Payment => item !== null);
        setTableData(prevData => [...prevData, ...newFiles]);
  
  // Then refresh the complete list from server
  await fetchObjects(bucketUuid);
        setShowUploadOverlay(false);
    };


    return (
        <div className="select-none w-full py-4 h-full">
            <style jsx>{`
                .resizer {
                    position: absolute;
                    right: 0;
                    top: 0;
                    height: 100%;
                    width: 5px;
                    background: rgba(0, 0, 0, 0.5);
                    cursor: col-resize;
                    user-select: none;
                    touch-action: none;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                
                .resizer:hover,
                .resizer.isResizing {
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
                
                th, td {
                    border-bottom: 1px solid #e5e7eb;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
            `}</style>
            <div className="flex items-center py-4 h-[10%] px-6">
                <div className="buttons flex flex-row gap-2">
                    <button
                        className="flex items-center gap-2 bg-blue-500 text-white px-4 py-1 rounded-full hover:bg-blue-700"
                        onClick={handleUploadClick}>
                        <Upload size={16} />
                        <span className="text-sm">Upload</span>
                    </button>
                    <button className="flex items-center gap-2 bg-gray-200 text-gray-800 px-4 py-1 rounded-full hover:bg-slate-300">
                        <span className="text-sm">Manage Documents</span>
                        <ChevronDown size={16} />
                    </button>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto text-xs">
                            Columns <ChevronDown className="ml-2 h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs">
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => {
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) =>
                                            column.toggleVisibility(!!value)
                                        }
                                    >
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                )
                            })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="px-6">
                <Breadcrumb
                    paths={currentPath}
                    onNavigate={handleBreadcrumbNavigate}
                />
            </div>
            <ScrollArea className="w-full whitespace-nowrap rounded-md p-4 h-[85%]">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead
                                            key={header.id}
                                            className="text-xs font-medium py-3 relative"
                                            style={{ width: header.getSize() }}
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                            {header.column.getCanResize() && (
                                                <div
                                                    onMouseDown={header.getResizeHandler()}
                                                    onTouchStart={header.getResizeHandler()}
                                                    className={`resizer ${header.column.getIsResizing() ? "isResizing" : ""
                                                        }`}
                                                ></div>
                                            )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-16 text-center text-xs"
                                    >
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        onDoubleClick={() => handleRowDoubleClick(row.original)}
                                        className="cursor-pointer hover:bg-gray-100"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                className="text-xs py-1"
                                                style={{ width: cell.column.getSize() }}
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-16 text-center text-xs"
                                    >
                                        No results.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
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

        </div>
    )
}