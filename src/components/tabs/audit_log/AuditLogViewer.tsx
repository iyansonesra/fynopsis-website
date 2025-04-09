import React, { useState, useEffect, ReactNode } from 'react';
import { get } from 'aws-amplify/api';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { ScrollArea } from '../../ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { format } from 'date-fns';
import { ArrowRight, BookKey, Calendar as CalendarIcon, Download, FileDown, FileIcon, FileOutput, FilePen, FileUp, FileX, FileX2, FolderIcon, FolderPen, FolderUp, FolderX, UserPlus, UserRoundX } from 'lucide-react';
import { cn } from '@/lib/utils';
import DetailSection from '../library/querying/DetailsSection';
import { Skeleton } from '@mui/material';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../../ui/hover-card';

interface AuditEvent {
    eventId: string;
    bucketId: string;
    timestamp: string;
    action: string;
    userId: string;
    userEmail: string;
    userName: string;
    details: {
        filePath: ReactNode;
        newParentName: any;
        oldParentName: any;
        fileName: any;
        isFolder: any;
        newName: any;
        oldName: any;
        itemName: any;
        sourceFile?: string;
        targetFile?: string;
        oldValue?: string;
        newValue?: string;
        metadata?: Record<string, any>;
    };
}

interface AuditLogViewerProps {
    bucketId: string;
    permissionDetails?: any;
}

interface AuditLogResponse {
    events: AuditEvent[];
    nextToken: string | null;
}

const SortableItem = React.memo<{
    event: AuditEvent;
    loading: boolean;
}>(({ event, loading }) => {
    if (loading) {
        return (
            <tr className="text-xs transition-all duration-200 hover:bg-blue-50 cursor-pointer dark:text-white border-b border-[#e0e0e0] dark:border-[#333]">
                <td className="p-4"><Skeleton variant="text" className='dark:bg-slate-700' /></td>
                <td className="p-4"><Skeleton variant="text" className='dark:bg-slate-700' /></td>
                <td className="p-4"><Skeleton variant="text" className='dark:bg-slate-700' /></td>
                <td className="p-4"><Skeleton variant="text" className='dark:bg-slate-700' /></td>
                <td className="p-4"><Skeleton variant="text" className='dark:bg-slate-700' /></td>
            </tr>
        );
    }

    const formatDate = (timestamp: string) => {
        return format(new Date(timestamp), 'MMM dd, yyyy');
    };
    const formatTime = (timestamp: string) => {
        return format(new Date(timestamp), 'hh:mm a');
    };

    return (
        <tr className="text-xs transition-all duration-200 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer dark:text-white border-b border-[#e0e0e0] dark:border-[#333]">
            <td className="p-4 whitespace-nowrap">{formatDate(event.timestamp)}</td>
            <td className="p-4 whitespace-nowrap">{formatTime(event.timestamp)}</td>
            <td className="p-4">
                <div className="flex items-center gap-2">
                    {event.action === 'FILE_UPLOAD' && <FileUp className="w-4 h-4" />}
                    {event.action === 'FILE_DOWNLOAD' && <FileDown className="w-4 h-4" />}
                    {event.action === 'FILE_DELETE' && <FileX2 className="w-4 h-4" />}
                    {event.action === 'FILE_MOVE' && <FileOutput className="w-4 h-4" />}
                    {event.action === 'FOLDER_CREATE' && <FolderUp className="w-4 h-4" />}
                    {event.action === 'FILE_RENAME' && <FilePen className="w-4 h-4" />}

                    {event.action === 'FOLDER_RENAME' && <FolderPen className="w-4 h-4" />}

                    {event.action === 'FOLDER_DELETE' && <FolderX className="w-4 h-4" />}
                    {event.action === 'USER_INVITE' && <UserPlus className="w-4 h-4" />}
                    {event.action === 'USER_REMOVE' && <UserRoundX className="w-4 h-4" />}
                    {event.action === 'PERMISSION_CHANGE' && <BookKey className="w-4 h-4" />}
                    <span>{event.action.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}</span>
                </div>
            </td>
            <td className="p-4">
                <div className="flex flex-col">
                    <span className="font-medium">{event.userName}</span>
                    <span className="text-gray-500 dark:text-gray-400">{event.userEmail}</span>
                </div>
            </td>
            <td className="p-4">
                <div className="flex flex-col gap-1">
                    {event.action === 'FILE_MOVE' && (
                         <HoverCard>
                         <HoverCardTrigger asChild>
                             <span className="text-gray-600 dark:text-gray-300 rounded-full inline-block">
                                 File Moved: {event.details.itemName}
                             </span>
                         </HoverCardTrigger>
                         <HoverCardContent className="w-80">
                             <div className="flex justify-between space-x-4">
                                 <div className="space-y-1">
                                     <h4 className="text-xs font-semibold">Full Path</h4>
                                     <p className="text-xs text-gray-600 dark:text-gray-300">
                                         {event.details.metadata?.fullPath || event.details.itemName}
                                     </p>
                                 </div>
                             </div>
                         </HoverCardContent>
                     </HoverCard>
                    )}
                    {event.action === 'FILE_UPLOAD' && (
                        <HoverCard>
                            <HoverCardTrigger asChild>
                                <span className="text-gray-600 dark:text-gray-300 rounded-full inline-block">
                                    New File: {event.details.fileName}
                                </span>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                                <div className="flex justify-between space-x-4">
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-semibold">Full Path</h4>
                                        <p className="text-xs text-gray-600 dark:text-gray-300">
                                            {event.details.filePath}
                                        </p>
                                    </div>
                                </div>
                            </HoverCardContent>
                        </HoverCard>
                    )}
                    {event.action === 'FILE_DOWNLOAD' && (
                        <HoverCard>
                            <HoverCardTrigger asChild>
                                <span className="text-gray-600 dark:text-gray-300 rounded-full inline-block">
                                    Item: {event.details.itemName}
                                </span>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                                <div className="flex justify-between space-x-4">
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-semibold">Full Path</h4>
                                        <p className="text-xs text-gray-600 dark:text-gray-300">
                                            {event.details.metadata?.fullPath || event.details.itemName}
                                        </p>
                                    </div>
                                </div>
                            </HoverCardContent>
                        </HoverCard>
                    )}
                    {event.action === 'FILE_DELETE' && (
                        <HoverCard>
                            <HoverCardTrigger asChild>
                                <span className="text-gray-600 dark:text-gray-300 rounded-full inline-block">
                                    Item: {event.details.itemName}
                                </span>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                                <div className="flex justify-between space-x-4">
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-semibold">Full Path</h4>
                                        <p className="text-xs text-gray-600 dark:text-gray-300">
                                            {event.details.metadata?.fullPath || event.details.itemName}
                                        </p>
                                    </div>
                                </div>
                            </HoverCardContent>
                        </HoverCard>
                    )}
                    {event.action === 'FOLDER_CREATE' && (
                        <HoverCard>
                            <HoverCardTrigger asChild>
                                <span className="text-gray-600 dark:text-gray-300 rounded-full inline-block">
                                    Folder: {event.details.itemName}
                                </span>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                                <div className="flex justify-between space-x-4">
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-semibold">Full Path</h4>
                                        <p className="text-xs text-gray-600 dark:text-gray-300">
                                            {event.details.metadata?.fullPath || event.details.itemName}
                                        </p>
                                    </div>
                                </div>
                            </HoverCardContent>
                        </HoverCard>
                    )}
                    {event.action === 'FOLDER_DELETE' && (
                        <HoverCard>
                            <HoverCardTrigger asChild>
                                <span className="text-gray-600 dark:text-gray-300 rounded-full inline-block">
                                    Folder: {event.details.itemName}
                                </span>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                                <div className="flex justify-between space-x-4">
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-semibold">Full Path</h4>
                                        <p className="text-xs text-gray-600 dark:text-gray-300">
                                            {event.details.metadata?.fullPath || event.details.itemName}
                                        </p>
                                    </div>
                                </div>
                            </HoverCardContent>
                        </HoverCard>
                    )}
                    {event.action === 'USER_INVITE' && (
                        <HoverCard>
                        <HoverCardTrigger asChild>
                            <span className="text-gray-600 dark:text-gray-300 rounded-full inline-block">
                                User: {event.details.itemName}
                            </span>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                            <div className="flex justify-between space-x-4">
                                <div className="space-y-1">
                                    <h4 className="text-xs font-semibold">Full Path</h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">
                                        {event.details.metadata?.fullPath || event.details.itemName}
                                    </p>
                                </div>
                            </div>
                        </HoverCardContent>
                    </HoverCard>
                    )}
                    {event.action === 'USER_REMOVE' && (
                        <HoverCard>
                        <HoverCardTrigger asChild>
                            <span className="text-gray-600 dark:text-gray-300 rounded-full inline-block">
                                User: {event.details.itemName}
                            </span>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                            <div className="flex justify-between space-x-4">
                                <div className="space-y-1">
                                    <h4 className="text-xs font-semibold">Full Path</h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">
                                        {event.details.metadata?.fullPath || event.details.itemName}
                                    </p>
                                </div>
                            </div>
                        </HoverCardContent>
                    </HoverCard>
                    )}
                    {event.action === 'PERMISSION_CHANGE' && (
                         <HoverCard>
                         <HoverCardTrigger asChild>
                             <span className="text-gray-600 dark:text-gray-300 rounded-full inline-block">
                                 Permission Change: {event.details.itemName}
                             </span>
                         </HoverCardTrigger>
                         <HoverCardContent className="w-80">
                             <div className="flex justify-between space-x-4">
                                 <div className="space-y-1">
                                     <h4 className="text-xs font-semibold">Full Path</h4>
                                     <p className="text-xs text-gray-600 dark:text-gray-300">
                                         {event.details.metadata?.fullPath || event.details.itemName}
                                     </p>
                                 </div>
                             </div>
                         </HoverCardContent>
                     </HoverCard>
                    )}
                    {event.action === 'FILE_RENAME' && (
                       <HoverCard>
                       <HoverCardTrigger asChild>
                           <span className="text-gray-600 dark:text-gray-300 rounded-full inline-block">
                               File Renamed: {event.details.newName}
                           </span>
                       </HoverCardTrigger>
                       <HoverCardContent className="w-80">
                           <div className="flex justify-between space-x-4">
                               <div className="space-y-1">
                               <h4 className="text-xs font-semibold">Old Name</h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">
                                        {event.details.oldName}
                                    </p>
                               </div>
                           </div>
                       </HoverCardContent>
                   </HoverCard>
                    )}
                    {event.action === 'FOLDER_RENAME' && (
                        <HoverCard>
                        <HoverCardTrigger asChild>
                            <span className="text-gray-600 dark:text-gray-300 rounded-full inline-block">
                                Folder Renamed: {event.details.newName}
                            </span>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                            <div className="flex justify-between space-x-4">
                                <div className="space-y-1">
                                    <h4 className="text-xs font-semibold">Old Name</h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">
                                        {event.details.oldName}
                                    </p>
                                </div>
                            </div>
                        </HoverCardContent>
                    </HoverCard>
                    )}
                </div>
            </td>
        </tr>
    );
});

SortableItem.displayName = 'SortableItem';


export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ bucketId, permissionDetails }) => {
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'user' | 'action'>('all');
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const [nextToken, setNextToken] = useState<string | null>(null);

    const fetchAuditLogs = async (reset = false) => {
        try {
            const params: Record<string, string> = {
                ...(startDate && { startDate: startDate.toISOString() }),
                ...(endDate && { endDate: endDate.toISOString() }),
                ...(searchTerm && filterType === 'user' && { userId: searchTerm }),
                ...(searchTerm && filterType === 'action' && { action: searchTerm }),
                ...(nextToken && !reset && { nextToken })
            };

            const queryString = new URLSearchParams(params).toString();
            const response = await get({
                apiName: 'S3_API',
                path: `/audit/${bucketId}/logs${queryString ? `?${queryString}` : ''}`,
                options: { withCredentials: true }
            }).response;

            const data = (await response.body.json() as unknown) as AuditLogResponse;

            console.log(data);

            if (reset) {
                setEvents(data?.events || []);
            } else {
                setEvents(prev => [...prev, ...(data?.events || [])]);
            }
            setNextToken(data.nextToken);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuditLogs(true);
    }, [bucketId, startDate, endDate, filterType, searchTerm]);

    const handleExport = async () => {
        try {
            const response = await get({
                apiName: 'S3_API',
                path: `/audit/${bucketId}/export`,
                options: { withCredentials: true }
            }).response;

            const blob = await response.body.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-log-${bucketId}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting audit logs:', error);
        }
    };

    const renderSkeletons = () => (
        Array(3).fill(0).map((_, idx) => (
            <div key={idx} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow space-y-3">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                    <div className="text-right space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
                <div className="mt-2 space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                </div>
            </div>
        ))
    );

    const formatAction = (event: AuditEvent) => {
        const actions: Record<string, string> = {
            'FILE_UPLOAD': 'Uploaded file',
            'FILE_DOWNLOAD': 'Downloaded file',
            'FILE_DELETE': 'Deleted file',
            'FILE_MOVE': 'Moved file',
            'USER_INVITE': 'Invited user',
            'USER_REMOVE': 'Removed user',
            'PERMISSION_CHANGE': 'Changed permissions',
            'FOLDER_CREATE': 'Created folder',
            'FOLDER_DELETE': 'Deleted folder'
        };

        if (event.action === "FILE_MOVE") {
            return event.details.itemName;
        }

        return actions[event.action] || event.action;
    };

    // Check if user can export audit logs
    const canExportAuditLogs = permissionDetails?.canExportAuditLogs !== false;

    return (
        <div className="flex flex-col h-full p-4 gap-4 w-full">
            <div className="flex items-center justify-between gap-4 pr-8">
            {/* <h2 className="text-xl font-bold text-gray-800 dark:text-white">Audit Log</h2> */}
            <div className="flex-1 flex flex-row">
                    <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full dark:bg-transparent dark:border dark:border-gray-700 outline-none select-none dark:text-white"
                    />
                </div>
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                    <SelectTrigger className="w-[150px] dark:bg-transparent dark:border dark:border-gray-700 dark:text-white">
                        <SelectValue placeholder="Filter by..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="user">By User</SelectItem>
                        <SelectItem value="action">By Action</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[150px] dark:bg-transparent dark:border dark:border-gray-700 dark:text-white">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, 'PPP') : 'Start Date'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 flex flex-col">
                            <Calendar
                                mode="single"
                                selected={startDate}
                                onSelect={setStartDate}
                            />
                        </PopoverContent>
                    </Popover>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[150px] dark:bg-transparent dark:border dark:border-gray-700 dark:text-white">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? format(endDate, 'PPP') : 'End Date'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={endDate}
                                onSelect={setEndDate}
                            />
                        </PopoverContent>
                    </Popover>
                    {canExportAuditLogs && (
                        <Button onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                    )}
                </div>
            </div>

            <ScrollArea className="flex-1 pr-8">
                <table className="w-full min-w-[800px] border-collapse">
                    <thead>
                        <tr className="text-xs font-thin dark:text-white text-slate-600 border-b border-[#e0e0e0] dark:border-[#333]">
                            <th className="p-4 text-left">Date</th>
                            <th className="p-4 text-left">Time</th>
                            <th className="p-4 text-left">Action</th>
                            <th className="p-4 text-left">User</th>
                            <th className="p-4 text-left">More Info</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array(3).fill(0).map((_, idx) => (
                                <SortableItem
                                    key={idx}
                                    event={{} as AuditEvent}
                                    loading={true}
                                />
                            ))
                        ) : (
                            events.map((event) => (
                                <SortableItem
                                    key={event.eventId}
                                    event={event}
                                    loading={false}
                                />
                            ))
                        )}
                    </tbody>
                </table>

                {nextToken && !loading && (
                    <Button
                        onClick={() => fetchAuditLogs()}
                        className="w-full mt-4"
                    >
                        Load More
                    </Button>
                )}
            </ScrollArea>
        </div>
    );
};
