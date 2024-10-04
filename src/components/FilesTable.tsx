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
import DragDropOverlay from "./DragDrop";
import { S3Client, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const S3_BUCKET_NAME = 'vdr-documents';
const REGION = 'us-east-1';

export interface Payment {
    id: string;
    type: string;
    name: string;
    size: string;
    status: string;
    date: string;
    uploadedBy?: string;
    s3Key?: string;
}

// S3 utility functions
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

const getUserPrefix = async () => {
    try {
        const { identityId } = await fetchAuthSession();
        if (!identityId) {
            throw new Error('No identity ID available');
        }
        return `${identityId}/`;
    } catch (error) {
        console.error('Error getting user prefix:', error);
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
    },
    {
        accessorKey: "name",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => <div className="lowercase">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => <div className="lowercase">{row.getValue("type")}</div>,
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <div className="capitalize">{row.getValue("status")}</div>,
    },
    {
        accessorKey: "size",
        header: () => <div className="text-right">Size</div>,
        cell: ({ row }) => {
            return <div className="text-right font-medium">{row.getValue("size")}</div>
        },
    },
    {
        accessorKey: "date",
        header: () => <div>Upload Date</div>,
        cell: ({ row }) => {
            return <div>{row.getValue("date")}</div>
        },
    },
    {
        accessorKey: "uploadedBy",
        header: () => <div>Uploaded By</div>,
        cell: ({ row }) => {
            return <div>{row.getValue("uploadedBy")}</div>
        },
    },
    {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
            const payment = row.original

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={async () => {
                                if (payment.s3Key) {
                                    try {
                                        const url = await getPresignedUrl(payment.s3Key);
                                        window.open(url, '_blank');
                                    } catch (error) {
                                        console.error('Error downloading file:', error);
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
                                        // This will be handled by the onDelete prop
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
        },
    },
]

export function DataTableDemo() {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    const [showUploadOverlay, setShowUploadOverlay] = React.useState(false);
    const [tableData, setTableData] = React.useState<Payment[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

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
                        .filter(object => {
                            const key = object.Key || '';
                            return !key.endsWith('/') && 
                                   !key.includes('US-EAST-1:') &&
                                   object.Size !== 0;
                        })
                        .map(async (object) => {
                            if (!object.Key) return null;
                            
                            return {
                                id: object.Key,
                                type: object.Key.split('.').pop()?.toUpperCase() || 'Unknown',
                                name: object.Key.split('/').pop() || '',
                                status: "success",
                                size: `${(object.Size || 0 / (1024 * 1024)).toFixed(2)} MB`,
                                date: object.LastModified?.toISOString().split('T')[0] || '',
                                uploadedBy: await getCurrentUser().then(user => user.username),
                                s3Key: object.Key
                            };
                        })
                );
                
                const validFiles = files.filter((file): file is Payment => file !== null);
                setTableData(validFiles);
            }
        } catch (error) {
            console.error('Error listing S3 objects:', error);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        listS3Objects();
    }, []);

    const handleFilesUploaded = async (newPayments: Payment[]) => {
        setTableData(prevData => [...newPayments, ...prevData]);
    };

    const table = useReactTable({
        data: tableData,
        columns,
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
    })

    return (
        <div className="w-full">
            <div className="flex items-center py-4">
                <div className="buttons flex flex-row gap-2">
                    <Button
                        onClick={() => setShowUploadOverlay(true)}
                        className="flex items-center gap-2"
                    >
                        <Upload className="h-4 w-4" />
                        Upload
                    </Button>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto">
                            Columns <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef.header,
                                                      header.getContext()
                                                  )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
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
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="space-x-2">
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
        </div>
    )
}
