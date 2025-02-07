import React, { useState, useEffect } from 'react';
import { get } from 'aws-amplify/api';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { ArrowRight, Calendar as CalendarIcon, Download, FileIcon, FolderIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from "./ui/skeleton"; // Add this import

interface AuditEvent {
    eventId: string;
    bucketId: string;
    timestamp: string;
    action: string;
    userId: string;
    userEmail: string;
    userName: string;
    details: {
        sourceFile?: string;
        targetFile?: string;
        oldValue?: string;
        newValue?: string;
        metadata?: Record<string, any>;
    };
}

interface AuditLogViewerProps {
    bucketId: string;
}

interface AuditLogResponse {
    events: AuditEvent[];
    nextToken: string | null;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ bucketId }) => {
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'user' | 'action'>('all');
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const [nextToken, setNextToken] = useState<string | null>(null);

    const fetchAuditLogs = async (reset = false) => {
        console.log("yoooooooooooo");

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

            console.log("response", response);

            const data = (await response.body.json() as unknown) as AuditLogResponse;

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
        console.log("why no work\n");
        console.log("[DEBUG] AuditLogViewer - about to fetch", new Date().toISOString());
        fetchAuditLogs(true);
    }, [bucketId, startDate, endDate, filterType, searchTerm]);

    useEffect(() => {
        console.log("why no work\n");

        console.log("[DEBUG] AuditLogViewer - events updated", events);
    })



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
            const isFolder = event.details.targetFile?.endsWith("/");

            const partsOG = event.details.sourceFile?.split("/");

            console.log("curr source", event.details.sourceFile);
            console.log("partsog", partsOG);
            let nameOfObject = "";
            if (partsOG) {
                if (partsOG?.length == 1) {
                    nameOfObject = partsOG[0];
                } else {
                    if (isFolder) {
                        nameOfObject = partsOG[partsOG.length - 2];
                    } else
                        nameOfObject = partsOG[partsOG.length - 1];
                }
            }



            return nameOfObject;

            console.log("current event", event);
        }

        return actions[event.action] || event.action;
    };

    return (
        <div className="flex flex-col h-full p-4 gap-4 w-full">
            <div className="flex items-center justify-between gap-4 pr-8">
                <div className="flex-1">
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
                    <Button onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 pr-8">
                <div className="space-y-2">
                    {loading ? (
                        renderSkeletons()
                    ) : (
                        events.map((event) => (
                            <div
                                key={event.eventId}
                                className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="font-medium dark:text-gray-100">
                                            {event.action === "FILE_MOVE" ?
                                                <div className="flex flex-row items-center justify-center gap-2">
                                                    <h1>{`Moved ${' '}`}</h1>
                                                    <div className="px-2 py-1 bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-100 flex flex-row gap-2 items-center">
                                                        {event.details.sourceFile?.endsWith('/') ? <FolderIcon className="w-3 h-3" /> : <FileIcon className="w-3 h-3" />}
                                                        <h1 className="text-sm">{` ${formatAction(event)}`}</h1>
                                                    </div>

                                                </div>
                                                : event.details.targetFile}
                                        </h3>

                                        <p className="text-sm text-gray-500">
                                            {format(new Date(event.timestamp), 'PPp')}
                                        </p>

                                        {/* {event.action === "FILE_MOVE" ? (
                                            <div className="flex flex-row items-center gap-2">
                                                <ArrowRight className="w-4 h-4" />
                                                <div className="px-2 py-1 bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-100 flex flex-row gap-2 items-center">
                                                    {event.details.targetFile?.endsWith('/') ? <FolderIcon className="w-3 h-3" /> : <FileIcon className="w-3 h-3" />}
                                                    <h1 className="text-sm">{` ${event.details.targetFile}`}</h1>
                                                </div>
                                            </div>
                                        ) : null} */}

                                    </div>

                                    <div className="text-right">
                                        <p className="text-sm font-medium dark:text-gray-100">{event.userName}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-500">{event.userEmail}</p>
                                    </div>
                                </div>
                                {/* {event.details && (
                                    <div className="mt-2 text-sm text-gray-600">
                                        {event.details.targetPath && (
                                            <p>Path: {event.details.targetPath}</p>
                                        )}
                                        {event.details.targetUser && (
                                            <p>Target User: {event.details.targetUser}</p>
                                        )}
                                        {event.details.oldValue && event.details.newValue && (
                                            <p>Changed from {event.details.oldValue} to {event.details.newValue}</p>
                                        )}
                                    </div>
                                )} */}
                            </div>
                        ))
                    )}
                    {nextToken && !loading && (
                        <Button
                            onClick={() => fetchAuditLogs()}
                            className="w-full mt-4"
                        >
                            Load More
                        </Button>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};
