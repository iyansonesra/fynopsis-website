
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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Upload } from "lucide-react"
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

const data: Payment[] = [
]

export type Payment = {
    id: string,
    type: string,
    name: string,
    size: string,
    status: "pending" | "processing" | "success" | "failed",
    date: string,
    uploadedBy: string,
    s3Key?: string,
    s3Url?: string,
}

interface FileViewerProps {
    isOpen: boolean
    onClose: () => void
    documentUrl?: string
    documentName?: string
}

const FileViewer: React.FC<FileViewerProps> = ({
    isOpen,
    onClose,
    documentUrl,
    documentName
}) => {
    if (!documentUrl) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-full h-[80vh]">
                <DialogHeader>
                    <DialogTitle>{documentName || 'Document Viewer'}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 w-full h-full min-h-[60vh]">
                    <DocViewer
                        documents={[{ uri: documentUrl, fileType: "doc" }]}
                        pluginRenderers={DocViewerRenderers}
                        prefetchMethod="GET"
                        style={{ height: '100%' }}
                        config={{
                            header: {
                                disableHeader: true,
                                disableFileName: true,
                            }
                        }}
                        
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
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
const deleteS3Object = async (s3Key: string) => {
    try {
        const s3Client = await getS3Client();
        const command = new DeleteObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: s3Key
        });

        await s3Client.send(command);
    } catch (error) {
        console.error('Error deleting object:', error);
        throw error;
    }
};


export const columns: ColumnDef<Payment>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
    },
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <div>{row.getValue("name")}</div>,
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
    // {
    //     id: "actions",
    //     cell: ({ row }) => {
    //         const payment = row.original;
    //         return (
    //             <DropdownMenu>
    //                 <DropdownMenuTrigger asChild>
    //                     <Button variant="ghost" className="h-8 w-8 p-0">
    //                         <MoreHorizontal className="h-4 w-4" />
    //                     </Button>
    //                 </DropdownMenuTrigger>
    //                 <DropdownMenuContent align="end">
    //                     <DropdownMenuItem
    //                             onClick={async () => {
    //                                 if (payment.s3Key) {
    //                                     try {
    //                                         const url = await getPresignedUrl(payment.s3Key)
    //                                         setCurrentDocument({
    //                                             url,
    //                                             name: payment.name
    //                                         })
    //                                         setViewerOpen(true)
    //                                     } catch (error) {
    //                                         console.error('Error getting presigned URL:', error)
    //                                     }
    //                                 }
    //                             }}
    //                         >
    //                             View
    //                     </DropdownMenuItem>
    //                     <DropdownMenuItem
    //                         onClick={async () => {
    //                             if (payment.s3Key) {
    //                                 try {
    //                                     const url = await getPresignedUrl(payment.s3Key);
    //                                     window.open(url, '_blank');
    //                                 } catch (error) {
    //                                     console.error('Error downloading file:', error);
    //                                 }
    //                             }
    //                         }}
    //                     >
    //                         Download
    //                     </DropdownMenuItem>
    //                     <DropdownMenuItem
    //                         onClick={async () => {
    //                             if (payment.s3Key) {
    //                                 try {
    //                                     await deleteS3Object(payment.s3Key);
    //                                     // setTableData(prev => 
    //                                     //     prev.filter(item => item.s3Key !== payment.s3Key)
    //                                     // ); TODO fix this statement
    //                                 } catch (error) {
    //                                     console.error('Error deleting file:', error);
    //                                 }
    //                             }
    //                         }}
    //                     >
    //                         Delete
    //                     </DropdownMenuItem>
    //                 </DropdownMenuContent>
    //             </DropdownMenu>
    //         );
    //     }
    // }
]

export function DataTableDemo() {
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
    const [isLoading, setIsLoading] = React.useState(true);
    const [viewerOpen, setViewerOpen] = React.useState(false)
    const [currentDocument, setCurrentDocument] = React.useState<{url?: string, name?: string}>({})


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
                                            const url = await getPresignedUrl(payment.s3Key)
                                            setCurrentDocument({
                                                url,
                                                name: payment.name
                                            })
                                            setViewerOpen(true)
                                        } catch (error) {
                                            console.error('Error getting presigned URL:', error)
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
                                            await deleteS3Object(payment.s3Key);
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
        getPaginationRowModel: getPaginationRowModel(),
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
                pageSize: 5,
            },
        },
    })

    


    const handleUploadClick = () => { 
        setShowUploadOverlay(true);
    }
    
    React.useEffect(() => {
        getUserInfo().then(username => setCurrentUser(username));
        listS3Objects();
        console.log("Getting user info");
    }, []);
    React.useEffect(() => {
        getUserInfo().then(username => setCurrentUser(username));
    }, []);
    
    React.useEffect(() => {
        listS3Objects();
    }, []);


    const uploadToS3 = async (file: File) => {
        const fileId = file.name.split('.')[0];
        const fileExtension = file.name.split('.').pop() || '';
        const userPrefix = await getUserPrefix();
        // Ensure we're not using the identity ID in the visible part of the key
        const s3Key = `${userPrefix}files/${fileId}.${fileExtension}`;
    
        try {
            const s3Client = await getS3Client();
            
            const command = new PutObjectCommand({
                Bucket: S3_BUCKET_NAME,
                Key: s3Key,
                Body: file,
                ContentType: file.type,
                Metadata: {
                    uploadedBy: await getUserInfo(),
                    originalName: file.name
                }
            });
    
            await s3Client.send(command);
            return s3Key;
        } catch (error) {
            console.error('Error uploading to S3:', error);
            throw error;
        }
    };

    const listS3Objects = async () => {
        try {
            setIsLoading(true);
            const s3Client = await getS3Client();
            const userPrefix = await getUserPrefix();
            
            const command = new ListObjectsV2Command({
                Bucket: S3_BUCKET_NAME,
                Prefix: userPrefix
            });
    
            const response = await s3Client.send(command);
            
            if (response.Contents) {
                const files = await Promise.all(
                    response.Contents
                        // Filter out the identity ID object itself
                        .filter(object => {
                            const key = object.Key || '';
                            // Exclude the identity ID directory object and any other system objects
                            return !key.endsWith('/') && 
                                   !key.includes('US-EAST-1:') &&
                                   object.Size !== 0; // Also exclude zero-byte objects
                        })
                        .map(async (object) => {
                            if (!object.Key) return null;
                            
                            const headCommand = new HeadObjectCommand({
                                Bucket: S3_BUCKET_NAME,
                                Key: object.Key
                            });
                            
                            try {
                                const headResponse = await s3Client.send(headCommand);
                                const metadata = headResponse.Metadata || {};
                                
                                const file: Payment = {
                                    id: object.Key,
                                    type: object.Key.split('.').pop()?.toUpperCase() || 'Unknown',
                                    name: metadata.originalname || object.Key.split('/').pop() || '',
                                    status: "success",
                                    size: `${(object.Size || 0 / (1024 * 1024)).toFixed(2)} KB`,
                                    date: object.LastModified?.toISOString().split('T')[0] || '',
                                    uploadedBy: metadata.uploadedby || 'Unknown',
                                    s3Key: object.Key
                                };
                                return file;
                            } catch (error) {
                                console.error(`Error getting metadata for ${object.Key}:`, error);
                                return null;
                            }
                        })
                );
                
                const validFiles = files.filter((file): file is Payment => {
                    return file !== null && 
                           typeof file === 'object' &&
                           'id' in file &&
                           'status' in file;
                });
                
                setTableData(validFiles);
            }
        } catch (error) {
            console.error('Error listing S3 objects:', error);
        } finally {
            setIsLoading(false);
        }
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
                    size: `${(file.size / (1024 * 1024)).toFixed(2)} KB`,
                    date: new Date().toISOString().split('T')[0],
                    uploadedBy: currentUser,
                    s3Key: s3Key
                };
            } catch (error) {
                console.error('Error uploading file:', error);
                return {
                    id: uuidv4(),
                    type: file.name.split('.').pop()?.toUpperCase() || 'Unknown',
                    name: file.name,
                    status: "failed" as const,
                    size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
                    date: new Date().toISOString().split('T')[0],
                    uploadedBy: currentUser
                };
            }
        });

        const newData = await Promise.all(uploadPromises);
        setTableData((prevData) => [...newData, ...prevData]);
        setShowUploadOverlay(false);
    };


    // return (
    //     <DocViewer
    //         documents={[{ uri: "https://vdr-documents.s3.us-east-1.amazonaws.com/us-east-1%3Ab0ba6fcd-a381-c36e-7373-2f3fb92b5808/files/extra%20problem%203.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIA3BOTPZWRQ5NOCWQF%2F20241005%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20241005T180317Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEKr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJHMEUCIQDtwR7U0ZKNkcbA7DEfVcb3n32Dzu2Gbvf6wszxjLPn8gIgepFYN55vamTpQ3H0H%2BcZhXG8rhW0u2ecswXywT7J4joqzQQI8%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARADGgw3NTkwNDIxMzM0MTEiDETN7LiKbRU7oL1kQyqhBGqVTKJasSPxnkUniq3pbqtiEpTWmTT5S%2BXDJfC2uYRQdcgNEWLQ5kJEmgn7RP2uERmuZlLbsz4GevhLkT82NRf9NECdF4BRa2XzNDsU1NuNhTe6NZnwX5YuucnrgmJsIEy%2BRUybVdW6j0Ssj74lc94D8amc9eliDuQPXbPzaD5FYMGD0gx8vmXJ%2BbYIAFIBQa6KYr4IcY%2BlFicKmr7mC%2BZScFE7P37w%2FRvi1FAqvuRqryEINwd5dx%2BM95MUZY9aWu5rUqpXx2Q7lD4bx5UmDZ6pNjJEFP%2FbGewuk5uNcF%2BfpQeZs2mPnZ2ozuITYPWxzYiyxlM%2FySOiiE5f8msa%2FlKhVIOaFwkGxfN9TcuMsUJIzNufcsfbIFRjSz7FQXhK9WDacKbuQKT5nVc7h9klFrTepz91mxIbrSfKjvpv09ngzSeIcxH9khcgAGGvgPhbqGeMZyTDnqg5tdOIqEeQByTER2aifxp5IYlNAkTrYYyDcXvnnjnY2eIxvbXES%2FYu3P9P0xig7hL5rH4K2sghjb%2BTYgK9%2BF3vDk0Zg4jt4Mvs6S%2FfnP0l9SrRlfXPN2%2F3Fjww6lIvhmWAMtqAJB9DtfGlz5UpLj%2FNolqGH9vswgHvVMIuOyKCtQ4VnU8dRQevhciNIJNWSXGoHrLZfLOpzcDc7iGqbPlXWoHcuhThyLauDgXV4Wkme6D%2BuPmRiwe29zb8cNp%2F%2B2tDYKtBA8rsc2giMLL7hbgGOoUCAG5zpk7sViSAXBvxE1ufdQtqVem5%2FAe5GvAb0O5tgZiegO8c%2FVEcVka0YRJ650uuV8D0w3bvZZTxg9GM7zp%2B9te825%2FI1IrPiPtZWmS%2BTYmRa%2FLknw2CjOMO93%2Bql5ANDYDJPYaHUxB7KILzjVT2AaFaWqJQ%2FsMGosaYiyikSP7CgIjzhLr5hnZN2BkLoK%2FQcIyqjgEgX0PZELVcFoMp2oIBh1WW1YS6DBB%2BYOHmAmrLqgano1rcUl%2FYX1TOJKAe%2BcgXngMd%2FWQtP35pBvH%2FBtffbsTihtRAdVhBP3jXoMgS6Iin4cAb9TNUrGyAhmJ2EoabPLejGZLABSkJpEb%2Fq%2FSE%2F9mk&X-Amz-Signature=d099cdd70551edf1832d3234ced70d024fe405a3dc442f02c9020639b3e74856&X-Amz-SignedHeaders=host&x-id=GetObject" }]}
    //         pluginRenderers={DocViewerRenderers}
    //         // config={{
    //         //     header: {
    //         //         disableHeader: false,
    //         //         disableFileName: false,
    //         //         retainURLParams: false
    //         //     }
    //         // }}
    //         // style={{ height: 500 }}
    //         // style={{ height: '100%' }}

    //         // config={{
    //         //     header: {
    //         //         disableHeader: true,
    //         //         disableFileName: true,
    //         //     }
    //         // }}
    //     />
    // );
    return (
        <div className="w-full">
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
            <div className="flex items-center py-4">
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

           
            <div className="rounded-md overflow-hidden">
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
                                                className={`resizer ${
                                                    header.column.getIsResizing() ? "isResizing" : ""
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
                        ): table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell 
                                            key={cell.id} 
                                            className="text-xs py-3"
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
            <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="space-x-2 flex items-center">
                    <span className="text-sm text-muted-foreground">
                        Page {table.getState().pagination.pageIndex + 1} of{" "}
                        {table.getPageCount()}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>

            {showUploadOverlay && (
                <DragDropOverlay
                onClose={() => setShowUploadOverlay(false)}
                onFilesUploaded={handleFilesUploaded}
            />
            )}
            <EnhancedFileViewer
                isOpen={viewerOpen}
                onClose={() => {
                setViewerOpen(false);
                setCurrentDocument({});
                }}
                documentUrl={currentDocument.url}
                documentName={currentDocument.name}
            />
        </div>
    )
}
