
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

const data: Payment[] = [
    {
        type: "PDF",
        name: "2013 Annual Report",
        status: "success",
        size: "0.08 MB",
        date: "2021-09-01",
        uploadedBy: "John Doe",
    },
    {
        type: "PDF",
        name: "2014 Annual Report",
        status: "success",
        size: "1 MB",
        date: "2021-09-01",
        uploadedBy: "John Doe",
    },
    {
        type: "DOC",
        name: "2015 Annual Report",
        status: "processing",
        size: "2.7 MB",
        date: "2021-09-01",
        uploadedBy: "John Doe",
    },
    {
        type: "JPG",
        name: "2016 Annual Report",
        status: "success",
        size: "3.9 MB",
        date: "2021-09-01",
        uploadedBy: "John Doe",
    },
    {
        type: "PPT",
        name: "2017 Annual Report",
        status: "failed",
        size: "24 MB",
        date: "2021-09-01",
        uploadedBy: "John Doe",
    },
    {
        type: "PPT",
        name: "2017 Annual Report",
        status: "failed",
        size: "24 MB",
        date: "2021-09-01",
        uploadedBy: "John Doe",
    },
    {
        type: "PPT",
        name: "2017 Annual Report",
        status: "failed",
        size: "24 MB",
        date: "2021-09-01",
        uploadedBy: "John Doe",
    },
    {
        type: "PPT",
        name: "2017 Annual Report",
        status: "failed",
        size: "24 MB",
        date: "2021-09-01",
        uploadedBy: "John Doe",
    },
    {
        type: "PPT",
        name: "2017 Annual Report",
        status: "failed",
        size: "24 MB",
        date: "2021-09-01",
        uploadedBy: "John Doe",
    },
    {
        type: "PPT",
        name: "2017 Annual Report",
        status: "failed",
        size: "24 MB",
        date: "2021-09-01",
        uploadedBy: "John Doe",
    },
]

export type Payment = {
    type: string,
    name: string,
    size: string,
    status: "pending" | "processing" | "success" | "failed",
    date: string,
    uploadedBy: string,
}

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
        cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
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
]

export function DataTableDemo() {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    )
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const table = useReactTable({
        data,
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
        enableColumnResizing: true,
        columnResizeMode: "onChange",
        initialState: {
            pagination: {
                pageSize: 5,
            },
        },
    })

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
                    <button className="flex items-center gap-2 bg-blue-500 text-white px-4 py-1 rounded-full hover:bg-blue-700">
                        <Upload size={16} />
                        <span>Upload</span>
                    </button>
                    <button className="flex items-center gap-2 bg-gray-200 text-gray-800 px-4 py-1 rounded-full hover:bg-slate-300">
                        <span>Manage Documents</span>
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
                        {table.getRowModel().rows?.length ? (
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
        </div>
    )
}
