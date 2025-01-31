import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, FileIcon, FolderIcon, MoreHorizontal, Plus, Upload } from "lucide-react"
import DragDropOverlay from "./DragDrop"
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { Button } from "@/components/ui/button"
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
import "@cyntler/react-doc-viewer/dist/index.css";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { usePathname, useSearchParams } from 'next/navigation';
// import { delete } from "aws-amplify/api";
import { get } from "aws-amplify/api";
import { useS3Store, TreeNode } from "./fileService";
import Breadcrumb from "./Breadcrumb";
import { useEffect } from "react";
const data: Payment[] = []

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
    tags: string[];
}

interface DataTableDemoProps {
    onFileSelect: (file: Payment) => void;
}

export function DataTable({ onFileSelect, setTableData }: { 
    onFileSelect: (file: Payment) => void;
    setTableData: (data: Payment[]) => void;
}) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [tableData] = React.useState<Payment[]>(data);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    const [showUploadOverlay, setShowUploadOverlay] = React.useState(false);
    const pathname = usePathname();
    const bucketUuid = pathname.split('/').pop() || '';
    const S3_BUCKET_NAME = 'vdr-documents';
    const REGION = 'us-east-1';
    const [currentPath, setCurrentPath] = React.useState<string[]>([`${bucketUuid}`]);
    const [currentUser, setCurrentUser] = React.useState<string>('');
    const [searchValue, setSearchValue] = React.useState('');
    const tree = useS3Store(state => state.tree);
    const fetchObjects = useS3Store(state => state.fetchObjects);
    const setSearchQuery = useS3Store(state => state.setSearchQuery);
    const navigateToPath = useS3Store(state => state.navigateToPath);
    const [selectedRowId, setSelectedRowId] = React.useState<string>('');

    React.useEffect(() => {
        fetchObjects(bucketUuid);
    }, [bucketUuid]);

    React.useEffect(() => {
        if (tree) {
            transformTreeToTableData(tree, currentPath)
                .then(transformedData => {
                    setTableData(transformedData);
                });
        }
    }, [useS3Store.getState().filteredObjects, currentPath]);

    React.useEffect(() => {
        getUserInfo().then(username => setCurrentUser(username));
    }, []);

    async function transformTreeToTableData(tree: TreeNode, currentPath: string[]): Promise<Payment[]> {
        // Get the current node based on the path
        await navigateToPath(currentPath);

        // Transform immediate children into table data
        const currentNode = useS3Store.getState().currentNode;
        const tableData: Payment[] = [];

        for (const [name, node] of Object.entries(currentNode.children)) {
            const isFolder = (node as any).type === 'folder';
            const metadata = (node as any).metadata;

            console.log('metadata:', metadata);

            tableData.push({
                id: metadata.Metadata?.id || crypto.randomUUID(),
                name: name,
                type: isFolder ? 'folder' : name.split('.').pop()?.toUpperCase() || 'Unknown',
                status: "success",
                size: isFolder ? ' ' : formatFileSize(metadata.ContentLength || 0),
                date: metadata.lastModified || new Date().toISOString(),
                uploadedBy: metadata.Metadata?.uploadbyname || 'Unknown',
                s3Key: metadata.key || name,
                s3Url: metadata.url || '',
                isFolder: isFolder,
                uploadProcess: metadata.Metadata?.pre_upload || 'COMPLETED',
                tags: metadata.Metadata?.tags || []
            });
        }

        return tableData;
    }

    function formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';

        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
    }

    const getUserInfo = async () => {
        try {
            const userInfo = await getCurrentUser();
            return userInfo.username;
        } catch (error) {
            console.error('Error getting user info:', error);
            return 'Unknown User';
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

    const getPresignedUrl = async (s3Key: string) => {
        try {
            const s3Client = await getS3Client();
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

    const columns: ColumnDef<Payment>[] = [
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => (
                <div className="flex items-center">
                    {row.original.isFolder ? (
                        <>
                            <FolderIcon className="mr-2 h-4 w-4 dark:text-white" />
                            <div className="dark:text-white">{row.getValue("name")}</div>
                        </>
                    ) : (
                        <>
                            <FileIcon className="mr-2 h-4 w-4 dark:text-white" />
                            <div className="dark:text-white">{truncateString(row.getValue("name"))}</div>
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
            cell: ({ row }) => <div className="capitalize  dark:text-white">{row.getValue("type")}</div>,
            enableResizing: true,
            size: 100,
        },
        {
            accessorKey: "date",
            header: "Date Uploaded",
            cell: ({ row }) => <div className="capitalize  dark:text-white">{row.getValue("date")}</div>,
            enableResizing: true,
            size: 150,
        },
        {
            accessorKey: "size",
            header: "Size",
            cell: ({ row }) => <div className=" dark:text-white">{row.getValue("size")}</div>,
            enableResizing: true,
            size: 100,
        },
        {
            accessorKey: "uploadedBy",
            header: "Uploaded By",
            cell: ({ row }) => <div className=" dark:text-white">{row.getValue("uploadedBy")}</div>,
            enableResizing: true,
            size: 100,
        },
        {
            accessorKey: "uploadProcess",
            header: "Document Status",
            cell: ({ row }) => <div className=" dark:text-white">{row.getValue("uploadProcess") === "BATCHED" ? "Processing" : "Uploaded"}</div>,
            enableResizing: true,
            size: 100,
        },
        // {
        //     accessorKey: "tags",
        //     header: "Tags",
        //     // cell: ({ row }) => <TagDisplay tags={row.getValue("tags") || []} />,
        //     enableResizing: true,
        //     size: 200,
        // },

    ]

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
                                <MoreHorizontal className="h-4 w-4 dark:text-white" />
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
                                            console.log('signedUrl:', signedUrl);
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
                                                uploadProcess: payment.uploadProcess,
                                                tags: payment.tags
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
        enableRowSelection: true,
        enableMultiRowSelection: true,
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

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchValue(value);
        setSearchQuery(value);
    };

    // Update the parent's tableData whenever local table data changes
    useEffect(() => {
        setTableData(tableData);
    }, [tableData, setTableData]);

    return (
        <div className="select-none w-full dark:bg-darkbg py-4 h-full">
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
                
         
            `}</style>
            <div className="flex justify-between items-center  py-4 h-[10%] px-6">
                <div className="buttons flex flex-row gap-2">
                    <button
                        className="flex items-center gap-2 bg-blue-500 text-white px-4 py-1 rounded-full hover:bg-blue-700"
                        onClick={handleUploadClick}>
                        <Upload size={16} />
                        <span className="text-sm">Upload</span>
                    </button>
                    <button className="flex items-center gap-2 bg-gray-200 text-gray-800 px-4 py-1 rounded-full hover:bg-slate-300 dark:bg-darkbg dark:text-white dark:border dark:border-slate-600 ">
                        <span className="text-sm">Create Folder</span>
                        <Plus size={16} />
                    </button>
                </div>


                <Input
                    placeholder="Search files..."
                    value={searchValue}
                    onChange={handleSearch}
                    className="max-w-sm border 
                     dark:border-slate-600 border-slate-200 dark:bg-darkbg dark:text-white outline-none select-none"
                />

            </div>


            <div className="flex flex-row items-center justify-center px-6 ">
                {/* <Breadcrumb
                    paths={currentPath}
                    onNavigate={handleBreadcrumbNavigate}
                /> */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto text-xs dark:bg-darkbg dark:text-white dark:border dark:border-slate-600">
                            Columns <ChevronDown className="ml-2 h-3 w-3 dark:text-slate-600" />
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
            <ScrollArea className="w-full whitespace-nowrap rounded-md p-4 h-[85%]">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead
                                            key={header.id}
                                            className="text-xs font-medium py-3 relative dark:text-white"
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
                            {useS3Store(state => state.isLoading) ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-16 text-center text-xs dark:text-white"
                                    >
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-900 ${selectedRowId === row.original.id ? 'border-double border border-sky-500' : ''
                                            }`}
                                        onClick={() => setSelectedRowId(row.original.id)}
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
                <ScrollBar orientation="horizontal" className="dark:bg-darkbg dark:text-slate-900" />
            </ScrollArea>

{/* 
            {showUploadOverlay && (
                <DragDropOverlay
                    onClose={() => setShowUploadOverlay(false)}
                    // onFilesUploaded={handleFilesUploaded}
                    currentPath={currentPath} // Pass the current path
                />
            )} */}

        </div>
    )
}