import React, { useState, useEffect, useCallback } from 'react';
import { get, post } from 'aws-amplify/api';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, BarChart2, ChevronDown, Circle, PieChart, PlusCircle, Settings, X, Save, FolderOpen, Maximize, Minimize, Move } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { v4 as uuidv4 } from 'uuid';
import { fetchMetricData, getAvailableMetrics, MetricsService, Widget, DashboardTemplate } from '../../services/metricsService';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Label as UILabel } from '@/components/ui/label';
import { Select as UISelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LineChart } from '@tremor/react';
import {
    BarChart,
    DonutChart
} from "@tremor/react";
import { Checkbox } from '@/components/ui/checkbox';

// Fix the ResponsiveGridLayout typing issue
const ResponsiveGridLayoutWithChildren = WidthProvider(Responsive) as any;

// Update the chart types to focus on the three main supported formats
const FORMAT_TYPES = {
    CHART: 'chart',
    TABLE: 'table'
};

// Available metrics for selection - we'll keep this for reference but won't use it for selection
const AVAILABLE_METRICS = getAvailableMetrics();

// Define types for graph data
interface GraphNode {
    id: string;
    label: string;
    category: string;
    attributes?: Record<string, any>;
    sources?: string;
    x?: number;
    y?: number;
    size?: number;
    color?: string;
}

interface GraphEdge {
    source: string;
    target: string;
    relationship: string;
    directed: boolean;
    attributes?: Record<string, any>;
    sources?: string;
}

interface DashboardWidget {
    id: string;
    type: string;
    title: string;
    format: string;
    metricKey?: string;
    data?: any;
    config?: any;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
}

// Enable responsive behavior with the HOC
// const ResponsiveGridLayout = WidthProvider(Responsive);

// Helper function to get color values for the legend
const getCategoryColor = (color: string) => {
    const colorMap: { [key: string]: string } = {
        'blue': '#3b82f6',
        'emerald': '#10b981',
        'violet': '#8b5cf6',
        'amber': '#f59e0b',
        'cyan': '#06b6d4'
    };
    return colorMap[color] || '#3B82F6';
};

// Helper function to convert hex colors to Tremor color names when possible
const getTremorColor = (hexColor: string): string => {
    // Mapping of hex colors to Tremor color names
    const tremor_colors: { [key: string]: string } = {
        '#3B82F6': 'blue',
        '#10B981': 'green',
        '#8B5CF6': 'purple',
        '#F59E0B': 'amber',
        '#F43F5E': 'rose',
        '#06B6D4': 'cyan',
        '#EC4899': 'pink',
        '#EF4444': 'red',
        '#14B8A6': 'teal',
        '#F97316': 'orange',
        '#A3E635': 'lime',
        '#64748B': 'slate',
        '#6B7280': 'gray',
        '#78716C': 'stone'
    };
    return tremor_colors[hexColor] || hexColor.replace('#', '');
};

const ChartWidget = ({ widget }: { widget: Widget }) => {
    // Check if the widget data is loading or empty
    if (!widget.data || widget.data.status === 'loading') {
        return (
            <div className="flex items-center justify-center h-full">Loading chart data...</div>
        );
    }

    // Handle line chart type
    if (widget.data.chart_type === 'line') {
        // Extract relevant data
        const { title, description, labels, datasets, xAxis, yAxis, options } = widget.data;
    
        // Format data for Tremor LineChart
        const formattedData = labels.map((label: string, index: number) => {
            const dataPoint: Record<string, any> = { date: label };
    
            // Add each dataset's value for this label
            datasets.forEach((dataset: any) => {
                // Use a shortened version of the label for cleaner display
                const shortLabel = dataset.label
                    .replace(' Revenue (in millions)', '')
                    .replace(' (Revenue Range)', '')
                    .replace('Revenue ', '');
    
                // If the value is an array [min, max], take the average
                if (Array.isArray(dataset.data[index]) && dataset.data[index].length === 2) {
                    dataPoint[shortLabel] = (dataset.data[index][0] + dataset.data[index][1]) / 2;
                } else {
                    dataPoint[shortLabel] = dataset.data[index];
                }
            });
    
            return dataPoint;
        });
    
        // Create categories array from dataset labels
        const categories = datasets.map((dataset: any) => 
            dataset.label
                .replace(' Revenue (in millions)', '')
                .replace(' (Revenue Range)', '')
                .replace('Revenue ', '')
        );
    
        // Define colors to match the dataset border colors or use defaults
        const colorValues = ["blue", "emerald", "violet", "amber", "cyan"];

    
        // Calculate appropriate yAxisWidth based on data values
        const maxValue = Math.max(...datasets.flatMap((d: any) => 
            d.data.filter((v: any) => v !== null)
                .map((v: any) => Array.isArray(v) ? Math.max(...v) : v)
        ));
        const yAxisWidth = maxValue >= 1000000 ? 60 : (maxValue >= 10000 ? 50 : 40);
    
        // Determine if showAnimation should be true based on points option
        const showAnimation = options?.showPoints !== false;
    
        return (
            <div className="flex flex-col h-full w-full">
                {/* Title and description */}
                <div className="px-2 pt-1 pb-1">
                    {title && <h3 className="font-semibold text-sm">{title}</h3>}
                    {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
                </div>
    
                {/* Chart container with fixed height */}
                <div className="relative flex-1" style={{ height: 'calc(100% - 60px)', minHeight: 150 }}>
                    <LineChart
                        className="h-full"
                        data={formattedData}
                        index="date"
                        categories={categories}
                        colors={colorValues}
                        valueFormatter={(value) => {
                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                            return value.toString();
                        }}
                        yAxisWidth={yAxisWidth}
                        showLegend={false}
                        showAnimation={showAnimation}
                        showTooltip={true}
                        showGridLines={true}
                        curveType={options?.tension ? "natural" : "linear"}
                        connectNulls={true}
                        customTooltip={({ payload, active, label }) => {
                            if (!active || !payload) return null;
    
                            return (
                                <div className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 p-2 rounded-md">
                                    <div className="font-medium">{label}</div>
                                    {payload.map((entry, index) => (
                                        <div key={index} className="flex items-center mt-1">
                                            <div
                                                className="w-2 h-2 rounded-full mr-1"
                                                style={{ backgroundColor: getCategoryColor(colorValues[index % colorValues.length]) }}
                                            ></div>
                                            <span className="mr-2">{entry.name}:</span>
                                            <span className="font-medium">
                                                {entry.value !== undefined ?
                                                    (Number(entry.value) >= 1000000 ?
                                                        `${(Number(entry.value) / 1000000).toFixed(1)}M` :
                                                        (Number(entry.value) >= 1000 ?
                                                            `${(Number(entry.value) / 1000).toFixed(0)}K` :
                                                            Number(entry.value).toString())
                                                    ) :
                                                    "N/A"
                                                }
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            );
                        }}
                    />
                </div>
    
                {/* Legend at the bottom */}
                <div className="flex flex-wrap justify-center gap-2 text-xs mt-1 mb-1">
                    {datasets.map((dataset: any, index: number) => (
                        <div key={index} className="flex items-center px-1">
                            <div
                                className="w-2 h-2 rounded-full mr-1"
                                style={{ backgroundColor: getCategoryColor(colorValues[index % colorValues.length]) }}
                            ></div>
                            <span>{typeof dataset.label === 'object' ? 'Revenue' : dataset.label}</span>
                        </div>
                    ))}
                </div>
    
                {/* Display range information if available */}
                {datasets.some((d: any) => d.data.some((v: any) => Array.isArray(v))) && (
                    <div className="text-xs text-center text-gray-500 mb-1">
                        * Ranges shown as average values
                    </div>
                )}
            </div>
        );
    }

    // Handle bar chart type
    if (widget.data.chart_type === 'bar') {
        // Extract relevant data
        const { title, description, labels, datasets, xAxis, yAxis } = widget.data;

        // Format the data for Tremor's BarChart
        const formattedData = labels.map((label: string, index: number) => {
            const dataPoint: Record<string, any> = { label: label.length > 15 ? label.substring(0, 15) + '...' : label };

            // Add each dataset's value for this label
            datasets.forEach((dataset: { label: string; data: (number | null)[] }) => {
                // Use a shortened version of the label for cleaner display
                const shortLabel = dataset.label
                    .replace(' Revenue (in millions)', '')
                    .replace(' (Revenue Range)', '')
                    .replace('Revenue ', '');

                dataPoint[shortLabel] = dataset.data[index];
            });

            return dataPoint;
        });

        // Create the categories array for Tremor (from dataset labels)
        const categories = datasets.map((dataset: { label: string }) =>
            dataset.label
                .replace(' Revenue (in millions)', '')
                .replace(' (Revenue Range)', '')
                .replace('Revenue ', '')
        );

        // Define colors to match the previous implementation
        const colorValues = ["blue", "emerald", "violet", "amber", "cyan"];

        // Calculate appropriate yAxisWidth based on data values
        const maxValue = Math.max(...datasets.flatMap((d: any) => d.data.filter((v: any) => v !== null) as number[]));
        const yAxisWidth = maxValue >= 1000000 ? 60 : (maxValue >= 10000 ? 50 : 40);

        return (
            <div className="flex flex-col h-full w-full">
                {/* Title and description */}
                <div className="px-2 pt-1 pb-1">
                    {title && <h3 className="font-semibold text-sm">{title}</h3>}
                    {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
                </div>

                {/* Chart container with fixed height and proper margin for axis labels */}
                <div className="relative flex-1" style={{
                    height: 'calc(100% - 60px)',
                    minHeight: 0
                }}>
                    <BarChart
                        className="h-full"
                        data={formattedData}
                        index="label"
                        categories={categories}
                        colors={colorValues}
                        valueFormatter={(value) => {
                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                            return value.toString();
                        }}
                        yAxisWidth={yAxisWidth}
                        showLegend={false}
                        showTooltip={true}
                        showGridLines={false}
                        customTooltip={({ payload, active, label }) => {
                            if (!active || !payload) return null;

                            return (
                                <div className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 p-2 rounded-md">
                                    <div className="font-medium">{label}</div>
                                    {payload.map((entry, index) => (
                                        <div key={index} className="flex items-center mt-1">
                                            <div
                                                className="w-2 h-2 rounded-full mr-1"
                                                style={{ backgroundColor: getCategoryColor(colorValues[index % colorValues.length]) }}
                                            ></div>
                                            <span className="mr-2">{entry.name}:</span>
                                            <span className="font-medium">
                                                {entry.value !== undefined ?
                                                    (Number(entry.value) >= 1000000 ?
                                                        `${(Number(entry.value) / 1000000).toFixed(1)}M` :
                                                        (Number(entry.value) >= 1000 ?
                                                            `${(Number(entry.value) / 1000).toFixed(0)}K` :
                                                            Number(entry.value).toString())
                                                    ) :
                                                    "N/A"
                                                }
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            );
                        }}
                    />
                </div>

                {/* Legend at the bottom - reduced padding */}
                <div className="flex flex-wrap justify-center gap-2 text-xs mt-1 mb-1">
                    {categories.map((category: string, index: number) => (
                        <div key={index} className="flex items-center px-1">
                            <div
                                className="w-2 h-2 rounded-full mr-1"
                                style={{ backgroundColor: getCategoryColor(colorValues[index % colorValues.length]) }}
                            ></div>
                            <span>{category}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Handle pie chart type
    if (widget.data.chart_type === 'pie') {
        // Extract relevant data
        const { title, description, labels, datasets } = widget.data;
        
        // Format data for Tremor's DonutChart
        const pieData = labels.map((label: string, index: number) => ({
            name: label,
            value: datasets[0].data[index]
        }));
        
        // Determine if we should show as donut or pie
        const showDonut = widget.data.options?.donut === true;
        
        // Get colors from the dataset or use defaults
        const customColors = datasets[0].backgroundColor || 
            ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF'];
        
        // Format Tremor colors - convert hex to Tremor color names when possible
        const tremorColors = customColors.map((color: string) => 
            getTremorColor(color)
        );

        return (
            <div className="flex flex-col h-full w-full">
                {/* Title and description */}
                <div className="px-2 pt-1 pb-1">
                    {title && <h3 className="font-semibold text-sm">{title}</h3>}
                    {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
                </div>
                
                {/* Chart container */}
                <div className="flex-1 flex items-center justify-center">
                    <DonutChart
                        data={pieData}
                        category="value"
                        index="name"
                        // colors={tremorColors}
                        showAnimation={true}
                        valueFormatter={(value) => `${value}%`}
                        showTooltip={true}
                        showLabel={false}
                        className="h-full max-h-64 mx-auto"
                        variant={showDonut ? "donut" : "pie"}
                    />
                </div>
                
                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-2 text-xs mt-1 mb-1">
                    {labels.map((label: string, index: number) => (
                        <div key={index} className="flex items-center px-1">
                            <div
                                className="w-2 h-2 rounded-full mr-1"
                                style={{ backgroundColor: customColors[index % customColors.length] }}
                            ></div>
                            <span>{label}: {datasets[0].data[index]}%</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Default fallback for unknown chart types
    return (
        <div className="flex items-center justify-center h-full">Unknown chart type</div>
    );
};

const TableWidget = ({ widget }: { widget: Widget }) => {
    // Parse the data if it's a string
    const parseTableData = () => {
        if (!widget.data) return null;
        
        // Check if we have a string that needs to be parsed
        if (typeof widget.data === 'string') {
            try {
                return JSON.parse(widget.data);
            } catch (error) {
                console.error('Error parsing table data:', error);
                return null;
            }
        }
        
        // Check for new format (JSON string inside a property)
        if (typeof widget.data[widget.id] === 'string') {
            try {
                return JSON.parse(widget.data[widget.id]);
            } catch (error) {
                console.error('Error parsing nested table data:', error);
                return null;
            }
        }
        
        // Legacy format support
        return widget.data;
    };
    
    const tableData = parseTableData();
    
    // Handle loading state - check if it's null or has loading status
    if (!tableData || tableData.status === 'loading' || 
        (widget.data && widget.data.status === 'loading')) {
        return (
            <div className="flex items-center justify-center h-full">Loading data...</div>
        );
    }
    
    // New format with columns and rows of objects
    if (tableData.columns && tableData.rows) {
        return (
            <div className="p-2 h-full overflow-auto">
                <div className="mb-2">
                    {tableData.title && <h3 className="font-semibold text-sm">{tableData.title}</h3>}
                    {tableData.description && <p className="text-xs text-gray-500 dark:text-gray-400">{tableData.description}</p>}
                </div>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                            {tableData.columns.map((column: string, index: number) => (
                                <th key={index} className="p-2 text-left border border-gray-200 dark:border-gray-700">
                                    {column}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.rows.map((row: any, rowIndex: number) => (
                            <tr 
                                key={rowIndex} 
                                className={rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900'}
                            >
                                {tableData.columns.map((column: string, colIndex: number) => (
                                    <td key={colIndex} className="p-2 border border-gray-200 dark:border-gray-700">
                                        {row[column] !== null ? row[column] : '—'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {tableData.metadata && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Source count: {tableData.metadata.source_count}, Rows: {tableData.metadata.row_count}
                    </div>
                )}
            </div>
        );
    }
    
    // Legacy format support with headers and rows of arrays
    if (tableData.headers && tableData.rows) {
        return (
            <div className="p-2 h-full overflow-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                            {tableData.headers.map((header: string, index: number) => (
                                <th key={index} className="p-2 text-left border border-gray-200 dark:border-gray-700">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.rows.map((row: any[], rowIndex: number) => (
                            <tr 
                                key={rowIndex} 
                                className={rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900'}
                            >
                                {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="p-2 border border-gray-200 dark:border-gray-700">
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
    
    return <div className="flex items-center justify-center h-full">Invalid table data format</div>;
};

export default function DiligenceDashboardViewer() {
    const params = useParams();
    const bucketId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';

    const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
    const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
    const [newWidgetTitle, setNewWidgetTitle] = useState('');
    const [newWidgetType, setNewWidgetType] = useState('chart');
    const [newWidgetFormat, setNewWidgetFormat] = useState(FORMAT_TYPES.CHART);
    const [newWidgetMetric, setNewWidgetMetric] = useState('');
    const { companyId } = useParams() || { companyId: null };
    const [isLoading, setIsLoading] = useState(false);
    const [dashboardName, setDashboardName] = useState('My Dashboard');
    const [isSaveDashboardOpen, setIsSaveDashboardOpen] = useState(false);
    const [dashboardTemplates, setDashboardTemplates] = useState<DashboardTemplate[]>([]);
    const [isLoadTemplateOpen, setIsLoadTemplateOpen] = useState(false);
    const [graphLayout, setGraphLayout] = useState<{ nodes: GraphNode[], links: GraphEdge[] }>({ nodes: [], links: [] });
    const [newWidgetDetails, setNewWidgetDetails] = useState('');
    const [newWidgetChartType, setNewWidgetChartType] = useState('');
    const [newWidgetXAxis, setNewWidgetXAxis] = useState('');
    const [newWidgetYAxis, setNewWidgetYAxis] = useState('');
    const [newWidgetStacked, setNewWidgetStacked] = useState(false);
    const [newWidgetHorizontal, setNewWidgetHorizontal] = useState(false);
    const [newWidgetTimeSeries, setNewWidgetTimeSeries] = useState(false);
    const [newWidgetShowPoints, setNewWidgetShowPoints] = useState(false);
    const [newWidgetDonut, setNewWidgetDonut] = useState(false);
    const [newWidgetShowPercentages, setNewWidgetShowPercentages] = useState(false);
    const [newWidgetTableCols, setNewWidgetTableCols] = useState<string[]>([]);

    // Layout settings
    const cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
    const rowHeight = 100;

    // Load dashboard data on component mount
    useEffect(() => {
        loadDashboardState();
        
        // Load dashboard name from localStorage if available
        const savedName = localStorage.getItem(`dashboard-${bucketId}-name`);
        if (savedName) {
            setDashboardName(savedName);
        }
    }, [bucketId]);

    // Load dashboard state
    const loadDashboardState = async () => {
        try {
            setIsLoading(true);
            // Get dashboard state from MetricsService
            const loadedWidgetsMap = await MetricsService.getDashboardState(bucketId);
            console.log("Loaded widgets map:", loadedWidgetsMap);

            // Convert from MetricsService.Widget format to DashboardWidget format
            const convertedWidgets = convertWidgetsFormat(loadedWidgetsMap);
            console.log("Converted widgets with positions:", convertedWidgets);
            setWidgets(convertedWidgets);
            
            toast({
                title: "Success",
                description: "Dashboard loaded successfully"
            });
        } catch (error) {
            console.error('Error loading dashboard state:', error);
            toast({
                title: "Error",
                description: "Failed to load dashboard state",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function to convert between widget formats
    const convertWidgetsFormat = (widgetsMap: Record<string, Widget>): DashboardWidget[] => {
        return Object.values(widgetsMap).map(widget => ({
            id: widget.id,
            type: widget.type,
            title: widget.title,
            format: widget.type, // Assuming type corresponds to format
            metricKey: widget.metricName,
            // Position data - use the values from positionData
            x: widget.positionData?.x || 0,
            y: widget.positionData?.y || 0,
            w: widget.positionData?.width || 4,
            h: widget.positionData?.height || 3,
            minW: 1,
            minH: 1,
            maxW: 12,
            maxH: 10,
            data: widget.data || null,
            config: {
                title: widget.title,
                expanded: widget.positionData?.expanded || false,
                extraDetails: widget.extraDetails
            }
        }));
    };

    // Add this function to convert back to the MetricsService.Widget format when saving
    const convertToDashboardState = (widgets: DashboardWidget[]): Record<string, Widget> => {
        const widgetsMap: Record<string, Widget> = {};

        widgets.forEach(widget => {
            widgetsMap[widget.id] = {
                id: widget.id,
                type: widget.format,
                title: widget.title,
                metricName: widget.metricKey || '',
                extraDetails: widget.config?.extraDetails,
                positionData: {
                    // Directly map UI coordinates to backend coordinates
                    width: widget.w,
                    height: widget.h,
                    x: widget.x,
                    y: widget.y,
                    expanded: widget.config?.expanded || false
                },
                data: widget.data
            };
        });

        return widgetsMap;
    };

    // ...existing code...

    const handleAddWidget = async () => {
        if (!newWidgetTitle.trim()) {
            toast({
                title: "Error",
                description: "Widget title cannot be empty",
                variant: "destructive"
            });
            return;
        }
        
        if (!newWidgetMetric.trim()) {
            toast({
                title: "Error",
                description: "Please specify a metric name",
                variant: "destructive"
            });
            return;
        }

        try {
            // Create new widget with initial parameters
            const widgetId = uuidv4();
            const newWidget: Widget = {
                id: widgetId,
                type: newWidgetFormat,
                title: newWidgetTitle,
                metricName: newWidgetMetric,
                positionData: {
                    width: 4,
                    height: 3,
                    x: 0,
                    y: widgets.length > 0 ? Math.max(...widgets.map(w => w.y)) + 1 : 0,
                    expanded: false
                }
            };
            
            // Add optional parameters if they exist
            if (newWidgetDetails) newWidget.extraDetails = newWidgetDetails;
            
            // Add chart-specific parameters
            if (newWidgetFormat === FORMAT_TYPES.CHART) {
                if (newWidgetChartType) newWidget.chartType = newWidgetChartType;
                if (newWidgetXAxis) newWidget.xAxis = newWidgetXAxis;
                if (newWidgetYAxis) newWidget.yAxis = newWidgetYAxis;
                
                // Add chart type specific options
                if (newWidgetChartType === 'bar') {
                    if (newWidgetStacked) newWidget.stacked = true;
                    if (newWidgetHorizontal) newWidget.horizontal = true;
                } else if (newWidgetChartType === 'line') {
                    if (newWidgetTimeSeries) newWidget.timeSeries = true;
                    if (newWidgetShowPoints) newWidget.showPoints = true;
                } else if (newWidgetChartType === 'pie') {
                    if (newWidgetDonut) newWidget.donut = true;
                    if (newWidgetShowPercentages) newWidget.showPercentages = true;
                }
            }
            
            // Add table-specific parameters
            if (newWidgetFormat === FORMAT_TYPES.TABLE && newWidgetTableCols && newWidgetTableCols.length > 0) {
                newWidget.tableCols = newWidgetTableCols;
            }

            // Add widget to backend
            const savedWidget = await MetricsService.addWidget(bucketId, newWidget);
            
            // Convert to dashboard widget format for local state
            const dashboardWidget: DashboardWidget = {
                id: savedWidget.id,
                type: savedWidget.type,
                title: savedWidget.title,
                format: savedWidget.type,
                metricKey: savedWidget.metricName,
                x: savedWidget.positionData.x,
                y: savedWidget.positionData.y,
                w: savedWidget.positionData.width,
                h: savedWidget.positionData.height,
                minW: 2,
                minH: 2,
                maxW: 12,
                maxH: 10,
                data: savedWidget.data || null,
                config: {
                    title: savedWidget.title,
                    expanded: savedWidget.positionData.expanded || false,
                    extraDetails: savedWidget.extraDetails
                }
            };

            // Update local state
            setWidgets([...widgets, dashboardWidget]);
            setIsAddWidgetOpen(false);

            // Reset form values
            setNewWidgetTitle('');
            setNewWidgetType('chart');
            setNewWidgetFormat(FORMAT_TYPES.CHART);
            setNewWidgetMetric('');
            setNewWidgetDetails('');
            setNewWidgetChartType('');
            setNewWidgetXAxis('');
            setNewWidgetYAxis('');
            setNewWidgetStacked(false);
            setNewWidgetHorizontal(false);
            setNewWidgetTimeSeries(false);
            setNewWidgetShowPoints(false);
            setNewWidgetDonut(false);
            setNewWidgetShowPercentages(false);
            setNewWidgetTableCols([]);

            toast({
                title: "Success",
                description: "Widget added successfully"
            });
        } catch (error) {
            console.error('Error adding widget:', error);
            toast({
                title: "Error",
                description: "Failed to add widget"
            });
        }
    };

    const handleDeleteWidget = async (id: string) => {
        console.log("DELETING WIDGET");
        try {
            // Delete widget from backend first
            await MetricsService.deleteWidget(bucketId, id);
            
            // Once backend deletion is successful, update local state
            setWidgets(prevWidgets => prevWidgets.filter(widget => widget.id !== id));
            
            toast({
                title: "Success",
                description: "Widget deleted successfully"
            });
        } catch (error) {
            console.error('Error deleting widget:', error);
            toast({
                title: "Error",
                description: "Failed to delete widget",
                variant: "destructive"
            });
        }
    };

   // ...existing code...
const handleLayoutChange = (layout: any[]) => {
    // Create a new copy of widgets with updated positions
    const updatedWidgets = widgets.map(widget => {
        const layoutItem = layout.find(item => item.i === widget.id);
        if (!layoutItem) return widget;
        
        return {
            ...widget,
            x: layoutItem.x, 
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h
        };
    });
    
    // Update state with the new widget positions
    setWidgets(updatedWidgets);
    
    // Then send updates to the backend (with debouncing)
    layout.forEach(layoutItem => {
        const widget = widgets.find(w => w.id === layoutItem.i);
        if (!widget) return;
        
        // Only update if position actually changed
        if (
            widget.x !== layoutItem.x ||
            widget.y !== layoutItem.y ||
            widget.w !== layoutItem.w ||
            widget.h !== layoutItem.h
        ) {
            // Debounce API calls to prevent too many requests
            updateWidgetPosition(widget.id, {
                x: layoutItem.x,
                y: layoutItem.y,
                width: layoutItem.w,
                height: layoutItem.h,
                expanded: widget.config?.expanded || false
            });
        }
    });
};
// ...existing code...
    // Debounce function to limit API calls
    const debounceMap = new Map<string, NodeJS.Timeout>();
    
    const updateWidgetPosition = (widgetId: string, positionData: { x: number, y: number, width: number, height: number, expanded?: boolean }) => {
        // Clear any existing timeout for this widget
        if (debounceMap.has(widgetId)) {
            clearTimeout(debounceMap.get(widgetId)!);
        }
        
        // Set a new timeout
        const timeoutId = setTimeout(async () => {
            try {
                // Use MetricsService to update the widget position
                await MetricsService.modifyWidget(bucketId, widgetId, { positionData });
                console.log(`Widget ${widgetId} position updated successfully`);
                debounceMap.delete(widgetId);
            } catch (error) {
                console.error(`Error updating position for widget ${widgetId}:`, error);
                toast({
                    title: "Error",
                    description: "Failed to update widget position",
                    variant: "destructive"
                });
            }
        }, 500); // 500ms debounce
        
        debounceMap.set(widgetId, timeoutId);
    };

    const saveDashboard = async () => {
        try {
            // Save dashboard name in local storage or your preferred storage
            localStorage.setItem(`dashboard-${bucketId}-name`, dashboardName);
            
            toast({
                title: "Success",
                description: "Dashboard name saved successfully"
            });

            setIsSaveDashboardOpen(false);
        } catch (error) {
            console.error('Error saving dashboard:', error);
            toast({
                title: "Error",
                description: "Failed to save dashboard",
                variant: "destructive"
            });
        }
    };

    // Toggle widget expanded state
    const toggleWidgetExpanded = async (widgetId: string) => {
        const widget = widgets.find(w => w.id === widgetId);
        if (!widget) return;
        
        const expanded = !widget.config?.expanded;
        
        // Update local state first
        const updatedWidgets = widgets.map(w => 
            w.id === widgetId 
                ? { 
                    ...w, 
                    config: { ...w.config, expanded } 
                } 
                : w
        );
        setWidgets(updatedWidgets);
        
        // Update in backend
        try {
            const positionData = {
                x: widget.x,
                y: widget.y,
                width: widget.w,
                height: widget.h,
                expanded
            };
            
            await MetricsService.modifyWidget(bucketId, widgetId, { positionData });
        } catch (error) {
            console.error('Error updating widget expanded state:', error);
            toast({
                title: "Error",
                description: "Failed to update widget state"
            });
        }
    };

    // Then update the renderWidgetContent function to use this component
    const renderWidgetContent = (widget: DashboardWidget) => {
        // Convert DashboardWidget to Widget format for component compatibility
        const adaptedWidget: Widget = {
            id: widget.id,
            type: widget.format,
            title: widget.title,
            metricName: widget.metricKey || '',
            positionData: {
                width: widget.w,
                height: widget.h,
                x: widget.x,
                y: widget.y,
                expanded: widget.config?.expanded || false
            },
            extraDetails: widget.config?.extraDetails,
            data: widget.data
        };
        
        // Placeholder rendering based on widget type
        switch(widget.format) {
            case FORMAT_TYPES.CHART:
                return <ChartWidget widget={adaptedWidget} />;
            case FORMAT_TYPES.TABLE:
                return <TableWidget widget={adaptedWidget} />;
            default:
                return <div>Unknown widget type</div>;
        }
    };

    return (
        <ScrollArea className="w-full">
            <div className="p-4 flex flex-col h-full w-full ">
                <div className="flex justify-between mb-4">
                    <h2 className="text-2xl font-bold">{dashboardName}</h2>

                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsSaveDashboardOpen(true)}
                            title="Save the dashboard name. Widget changes are saved automatically."
                        >
                            <Save className="mr-2 h-4 w-4" />
                            Save Dashboard Name
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => setIsLoadTemplateOpen(true)}
                        >
                            <FolderOpen className="mr-2 h-4 w-4" />
                            Load Template
                        </Button>

                        <Button
                            onClick={() => setIsAddWidgetOpen(true)}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Widget
                        </Button>
                    </div>
                </div>


                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                            <p className="text-lg font-medium">Loading dashboard...</p>
                        </div>
                    </div>
                ) : widgets.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <AlertCircle className="h-10 w-10 mb-4" />
                        <p className="text-lg">No widgets added yet</p>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setIsAddWidgetOpen(true)}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Your First Widget
                        </Button>
                    </div>
                ) : (
                    <ResponsiveGridLayoutWithChildren
                    className="layout"
                    layouts={{
                        lg: widgets.map(w => ({
                            i: w.id,
                            x: w.x,
                            y: w.y,
                            w: w.w,
                            h: w.h,
                            minW: w.minW,
                            minH: w.minH,
                            maxW: w.maxW,
                            maxH: w.maxH
                        }))
                    }}
                    // breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    // cols={cols}
                    // rowHeight={rowHeight}
                    onLayoutChange={handleLayoutChange}
                    draggableHandle=".widget-drag-handle"
                    // useCSSTransforms={true}
                    // compactType="vertical"
                    // preventCollision={true}      // Change to true to prevent collision during drag
                    // verticalCompact={true}
                    // autoSize={true}
                    // margin={[10, 10]}            // Add some vertical margin for better visual separation
                    // containerPadding={[10, 10]}  // Add some padding around the container
                    // isResizable={true}
                    // isBounded={true}
                    // isDraggable={true}
                    // transformScale={1}           // Ensure correct scaling
                >
                        {widgets.map((widget) => (
                            <div key={widget.id}>
                                <Card className="flex flex-col h-full overflow-hidden">
                                    <div className="p-3 border-b bg-muted/20 flex items-center justify-between cursor-default">
                                        <div className="font-medium truncate">{widget.title}</div>
                                        <div className="flex items-center space-x-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 widget-drag-handle cursor-move"
                                                onClick={() => toggleWidgetExpanded(widget.id)}
                                                title={widget.config?.expanded ? "Minimize" : "Maximize"}
                                            >
                                               <Move className = "h-4 w-4"/>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => {/* Widget settings */ }}
                                            >
                                                <Settings className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => handleDeleteWidget(widget.id)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex-grow p-4 overflow-auto">
                                        {renderWidgetContent(widget)}
                                    </div>
                                </Card>
                            </div>
                        ))}
                    </ResponsiveGridLayoutWithChildren>
                )}


                {/* Add Widget Dialog */}
                <Dialog open={isAddWidgetOpen} onOpenChange={setIsAddWidgetOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Add Widget</DialogTitle>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <UILabel htmlFor="widget-title" className="text-right">Title</UILabel>
                                <Input
                                    id="widget-title"
                                    value={newWidgetTitle}
                                    onChange={(e) => setNewWidgetTitle(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <UILabel htmlFor="widget-format" className="text-right">Format</UILabel>
                                <UISelect
                                    value={newWidgetFormat}
                                    onValueChange={setNewWidgetFormat}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select format" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={FORMAT_TYPES.CHART}>Chart</SelectItem>
                                        <SelectItem value={FORMAT_TYPES.TABLE}>Table</SelectItem>
                                    </SelectContent>
                                </UISelect>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <UILabel htmlFor="widget-metric" className="text-right">Metric</UILabel>
                                <Input
                                    id="widget-metric"
                                    value={newWidgetMetric}
                                    onChange={(e) => setNewWidgetMetric(e.target.value)}
                                    className="col-span-3"
                                    placeholder="Type any metric name (e.g., revenue, growth, customers)"
                                />
                            </div>

                            <div className="grid grid-cols-4 items-start gap-4">
                                <UILabel htmlFor="widget-details" className="text-right pt-2">Description</UILabel>
                                <Textarea
                                    id="widget-details"
                                    value={newWidgetDetails || ''}
                                    onChange={(e) => setNewWidgetDetails(e.target.value)}
                                    className="col-span-3"
                                    placeholder="Additional details for this widget (optional)"
                                    rows={2}
                                />
                            </div>

                            {/* Show additional form fields based on widget format */}
                            {newWidgetFormat === FORMAT_TYPES.CHART && (
                                <>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <UILabel htmlFor="chart-type" className="text-right">Chart Type</UILabel>
                                        <UISelect
                                            value={newWidgetChartType || ''}
                                            onValueChange={setNewWidgetChartType}
                                        >
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select chart type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="bar">Bar Chart</SelectItem>
                                                <SelectItem value="line">Line Chart</SelectItem>
                                                <SelectItem value="pie">Pie Chart</SelectItem>
                                            </SelectContent>
                                        </UISelect>
                                    </div>

                                    {/* Fields specific to chart type */}
                                    {newWidgetChartType && (
                                        <>
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <UILabel htmlFor="x-axis" className="text-right">X-Axis</UILabel>
                                                <Input
                                                    id="x-axis"
                                                    value={newWidgetXAxis || ''}
                                                    onChange={(e) => setNewWidgetXAxis(e.target.value)}
                                                    className="col-span-3"
                                                    placeholder="X-Axis Label (optional)"
                                                />
                                            </div>

                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <UILabel htmlFor="y-axis" className="text-right">Y-Axis</UILabel>
                                                <Input
                                                    id="y-axis"
                                                    value={newWidgetYAxis || ''}
                                                    onChange={(e) => setNewWidgetYAxis(e.target.value)}
                                                    className="col-span-3"
                                                    placeholder="Y-Axis Label (optional)"
                                                />
                                            </div>

                                            {/* Chart type specific options */}
                                            {newWidgetChartType === 'bar' && (
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <div className="col-span-1"></div>
                                                    <div className="flex space-x-4 col-span-3">
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox 
                                                                id="stacked"
                                                                checked={newWidgetStacked || false}
                                                                onCheckedChange={(checked) => 
                                                                    setNewWidgetStacked(checked === true)
                                                                }
                                                            />
                                                            <label htmlFor="stacked" className="text-sm">Stacked</label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox 
                                                                id="horizontal"
                                                                checked={newWidgetHorizontal || false}
                                                                onCheckedChange={(checked) => 
                                                                    setNewWidgetHorizontal(checked === true)
                                                                }
                                                            />
                                                            <label htmlFor="horizontal" className="text-sm">Horizontal</label>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {newWidgetChartType === 'line' && (
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <div className="col-span-1"></div>
                                                    <div className="flex space-x-4 col-span-3">
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox 
                                                                id="time-series"
                                                                checked={newWidgetTimeSeries || false}
                                                                onCheckedChange={(checked) => 
                                                                    setNewWidgetTimeSeries(checked === true)
                                                                }
                                                            />
                                                            <label htmlFor="time-series" className="text-sm">Time Series</label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox 
                                                                id="show-points"
                                                                checked={newWidgetShowPoints || false}
                                                                onCheckedChange={(checked) => 
                                                                    setNewWidgetShowPoints(checked === true)
                                                                }
                                                            />
                                                            <label htmlFor="show-points" className="text-sm">Show Points</label>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {newWidgetChartType === 'pie' && (
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <div className="col-span-1"></div>
                                                    <div className="flex space-x-4 col-span-3">
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox 
                                                                id="donut"
                                                                checked={newWidgetDonut || false}
                                                                onCheckedChange={(checked) => 
                                                                    setNewWidgetDonut(checked === true)
                                                                }
                                                            />
                                                            <label htmlFor="donut" className="text-sm">Donut Chart</label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox 
                                                                id="show-percentages"
                                                                checked={newWidgetShowPercentages || false}
                                                                onCheckedChange={(checked) => 
                                                                    setNewWidgetShowPercentages(checked === true)
                                                                }
                                                            />
                                                            <label htmlFor="show-percentages" className="text-sm">Show Percentages</label>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}

                            {newWidgetFormat === FORMAT_TYPES.TABLE && (
                                <div className="grid grid-cols-4 items-start gap-4">
                                    <UILabel htmlFor="table-columns" className="text-right pt-2">Table Columns</UILabel>
                                    <Textarea
                                        id="table-columns"
                                        value={newWidgetTableCols?.join(', ') || ''}
                                        onChange={(e) => setNewWidgetTableCols(
                                            e.target.value.split(',').map(col => col.trim()).filter(Boolean)
                                        )}
                                        className="col-span-3"
                                        placeholder="Column names separated by commas (optional)"
                                        rows={2}
                                    />
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddWidgetOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="button" onClick={handleAddWidget}>
                                Add Widget
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Save Dashboard Dialog */}
                <Dialog open={isSaveDashboardOpen} onOpenChange={setIsSaveDashboardOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Save Dashboard</DialogTitle>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <UILabel htmlFor="dashboard-name" className="text-right">Name</UILabel>
                                <Input
                                    id="dashboard-name"
                                    value={dashboardName}
                                    onChange={(e) => setDashboardName(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsSaveDashboardOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="button" onClick={saveDashboard}>
                                Save
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Load Template Dialog */}
                <Dialog open={isLoadTemplateOpen} onOpenChange={setIsLoadTemplateOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Load Dashboard Template</DialogTitle>
                        </DialogHeader>

                        {/* Templates would be listed here */}
                        <div className="py-4">
                            {dashboardTemplates.length === 0 ? (
                                <p className="text-center text-muted-foreground">No saved templates</p>
                            ) : (
                                <div className="space-y-2">
                                    {/* Template list would go here */}
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsLoadTemplateOpen(false)}>
                                Cancel
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </ScrollArea>

    );

}
