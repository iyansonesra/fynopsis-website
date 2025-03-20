import React, { useState, useEffect, useCallback } from 'react';
import { get, post } from 'aws-amplify/api';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, BarChart2, ChevronDown, Circle, PieChart, PlusCircle, Settings, X, Save, FolderOpen, Maximize, Minimize } from 'lucide-react';
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
import { LineChart } from '@mui/x-charts';
import {
    BarChart
} from "@tremor/react";

// Update the chart types to focus on the three main supported formats
const FORMAT_TYPES = {
    CHART: 'chart',
    TABLE: 'table',
    GRAPH: 'graph'
};

// Available metrics for selection
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
const ResponsiveGridLayout = WidthProvider(Responsive);

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


    // Layout settings
    const cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
    const rowHeight = 100;

    // Load dashboard data on component mount
    // Load dashboard data on component mount
    useEffect(() => {
        loadDashboardState();
    }, [bucketId]);

    // Load dashboard state

    const loadDashboardState = async () => {
        try {
            setIsLoading(true);
            const loadedWidgetsMap = await MetricsService.getDashboardState(bucketId);
            console.log("loadedWidgetsMap", loadedWidgetsMap);

            // Convert from MetricsService.Widget format to DashboardWidget format
            const convertedWidgets = convertWidgetsFormat(loadedWidgetsMap);
            setWidgets(convertedWidgets);
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
            x: widget.positionData.y,
            y: widget.positionData.x,
            w: widget.positionData.width * 2,
            h: widget.positionData.height * 2,
            minW: 2,
            minH: 2,
            maxW: 12,
            maxH: 10,
            data: widget.data || null,
            config: {
                title: widget.title,
                expanded: widget.positionData.expanded,
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

    const handleAddWidget = () => {
        if (!newWidgetTitle.trim()) {
            toast({
                title: "Error",
                description: "Widget title cannot be empty",
                variant: "destructive"
            });
            return;
        }

        const newWidget: DashboardWidget = {
            id: uuidv4(),
            type: newWidgetType,
            title: newWidgetTitle,
            format: newWidgetFormat,
            metricKey: newWidgetMetric,
            x: 0,
            y: Infinity, // Places at the bottom
            w: 4,
            h: 3,
            minW: 2,
            minH: 2,
            maxW: 12,
            maxH: 10,
            data: null,
            config: {
                title: newWidgetTitle
            }
        };

        setWidgets([...widgets, newWidget]);
        setIsAddWidgetOpen(false);

        // Reset form values
        setNewWidgetTitle('');
        setNewWidgetType('chart');
        setNewWidgetFormat(FORMAT_TYPES.CHART);
        setNewWidgetMetric('');

        // Fetch data for the new widget if needed
        fetchDataForWidget(newWidget);
    };

    const fetchDataForWidget = async (widget: DashboardWidget) => {
        if (!widget.metricKey || !companyId) return;

        try {
            setIsLoading(true);
            const data = await fetchMetricData(companyId as string, widget.metricKey, widget.format);

            setWidgets(prev =>
                prev.map(w =>
                    w.id === widget.id ? { ...w, data } : w
                )
            );
        } catch (error) {
            console.error('Error fetching widget data:', error);
            toast({
                title: "Error",
                description: "Failed to load widget data",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteWidget = (id: string) => {
        setWidgets(widgets.filter(widget => widget.id !== id));
    };

    const handleLayoutChange = (layout: any[]) => {
        // Update widget positions when layout changes
        const updatedWidgets = widgets.map(widget => {
            const layoutItem = layout.find(item => item.i === widget.id);
            if (layoutItem) {
                return {
                    ...widget,
                    x: layoutItem.x,
                    y: layoutItem.y,
                    w: layoutItem.w,
                    h: layoutItem.h
                };
            }
            return widget;
        });

        setWidgets(updatedWidgets);
    };

    const saveDashboard = async () => {
        try {
            const widgetsMap = convertToDashboardState(widgets);
            await MetricsService.saveDashboardState(bucketId, widgetsMap);

            toast({
                title: "Success",
                description: "Dashboard saved successfully"
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




    // ...existing code...

    // Default pie chart rendering for other chart types
    // ...existing pie chart code...


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

    const GraphWidget = ({ widget }: { widget: Widget }) => {
        // Use local state for this specific widget instance
        const [localGraphLayout, setLocalGraphLayout] = useState<{ nodes: GraphNode[], links: GraphEdge[] }>({ nodes: [], links: [] });

        // Process and layout the graph data when widget changes
        useEffect(() => {
            if (!widget.data || widget.data.status === 'loading') return;

            const { nodes, edges } = widget.data;
            if (!nodes || !edges) return;

            // Set up hierarchical layout
            const processedNodes = calculateHierarchicalLayout(nodes as GraphNode[], edges as GraphEdge[]);
            const processedLinks = edges.map((edge: GraphEdge) => ({
                source: edge.source,
                target: edge.target,
                relationship: edge.relationship,
                directed: edge.directed
            }));

            setLocalGraphLayout({ nodes: processedNodes, links: processedLinks });
        }, [widget.data]);

        // Calculate hierarchical positions for nodes
        const calculateHierarchicalLayout = (nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] => {
            // Define levels based on node categories
            const categoryLevels: { [key: string]: number } = {
                'Company': 0,
                'Revenue Stream': 1,
                'Industry Application': 2
            };

            // Group nodes by level
            const nodesByLevel: { [key: number]: GraphNode[] } = {};
            nodes.forEach(node => {
                const level = categoryLevels[node.category] || 0;
                if (!nodesByLevel[level]) nodesByLevel[level] = [];
                nodesByLevel[level].push(node);
            });

            // Calculate node positions level by level
            const processedNodes: GraphNode[] = [];
            const levelCount = Object.keys(nodesByLevel).length;
            const maxNodesInLevel = Math.max(...Object.values(nodesByLevel).map(n => n.length));

            for (let level = 0; level < levelCount; level++) {
                const nodesInLevel = nodesByLevel[level] || [];
                const levelWidth = nodesInLevel.length;

                nodesInLevel.forEach((node, index) => {
                    // Calculate revenue value for node sizing if available
                    let revenue = 0;
                    if (node.attributes) {
                        const revenueStr = node.attributes.fiscal_year_2024_revenue ||
                            node.attributes.q4_fiscal_2024_revenue || '';

                        // Extract numeric value from string like "$33.196 billion" or "$899 million"
                        if (revenueStr) {
                            const match = revenueStr.match(/\$?([\d,.]+)\s*(billion|million)?/i);
                            if (match) {
                                const value = parseFloat(match[1].replace(/,/g, ''));
                                const unit = match[2]?.toLowerCase();
                                revenue = unit === 'billion' ? value * 1000 : (unit === 'million' ? value : value);
                            }
                        }
                    }

                    // Scale node size based on revenue (with min and max size)
                    const nodeSize = revenue ? Math.max(25, Math.min(50, 25 + (revenue / 10000) * 25)) : 30;

                    // Assign colors based on category
                    let nodeColor = '#3B82F6'; // default blue
                    if (node.category === 'Revenue Stream') nodeColor = '#10B981'; // green
                    if (node.category === 'Industry Application') nodeColor = '#8B5CF6'; // purple

                    processedNodes.push({
                        ...node,
                        x: (index + 1) * (100 / (levelWidth + 1)), // Horizontal position as percentage
                        y: (level + 1) * (100 / (levelCount + 1)), // Vertical position as percentage
                        size: nodeSize,
                        color: nodeColor
                    });
                });
            }

            return processedNodes;
        };

        // Render loading state
        if (!widget.data || widget.data.status === 'loading') {
            return <div className="flex items-center justify-center h-full">Loading graph data...</div>;
        }

        // Extract title and description
        const { title, description } = widget.data;

        // Calculate SVG dimensions based on container size
        // Using a 16:9 aspect ratio
        const svgWidth = 100;
        const svgHeight = 60;

        return (
            <div className="flex flex-col h-full p-4 overflow-hidden">
                {title && <h3 className="font-semibold text-sm">{title}</h3>}
                {description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{description}</p>}

                <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden shadow-inner">
                    <svg
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        className="w-full h-full"
                        style={{ maxHeight: "250px" }}
                    >
                        {/* Draw edges first (so they're underneath nodes) */}
                        {localGraphLayout.links.map((link, index) => {
                            // Find connected nodes
                            const sourceNode = localGraphLayout.nodes.find(n => n.id === link.source);
                            const targetNode = localGraphLayout.nodes.find(n => n.id === link.target);

                            if (!sourceNode || !targetNode) return null;

                            // Ensure nodes have coordinates (use defaults if undefined)
                            const x1 = (sourceNode.x || 50) * svgWidth / 100;
                            const y1 = (sourceNode.y || 50) * svgHeight / 100;
                            const x2 = (targetNode.x || 50) * svgWidth / 100;
                            const y2 = (targetNode.y || 50) * svgHeight / 100;

                            return (
                                <g key={`edge-${index}`}>
                                    <line
                                        x1={x1}
                                        y1={y1}
                                        x2={x2}
                                        y2={y2}
                                        stroke="rgba(156, 163, 175, 0.6)"
                                        strokeWidth="1.5"
                                        className="transition-all duration-300"
                                    />

                                    {/* Add arrow for directed edges */}
                                    {link.directed && (
                                        <polygon
                                            points={calculateArrowPoints(x1, y1, x2, y2, (targetNode.size || 30) / 3)}
                                            fill="rgba(156, 163, 175, 0.6)"
                                            className="transition-all duration-300"
                                        />
                                    )}

                                    {/* Edge label for relationship type */}
                                    {link.relationship && (
                                        <text
                                            x={(x1 + x2) / 2}
                                            y={(y1 + y2) / 2 - 2}
                                            fontSize="2.5"
                                            textAnchor="middle"
                                            fill="rgba(107, 114, 128, 0.8)"
                                            className="pointer-events-none"
                                        >
                                            {link.relationship}
                                        </text>
                                    )}
                                </g>
                            );
                        })}

                        {/* Draw nodes */}
                        {localGraphLayout.nodes.map((node, index) => {
                            // Convert percentage positions to SVG coordinates (with defaults)
                            const cx = (node.x || 50) * svgWidth / 100;
                            const cy = (node.y || 50) * svgHeight / 100;
                            const nodeSize = node.size || 30;

                            return (
                                <g
                                    key={`node-${index}`}
                                    className="cursor-pointer transition-all duration-300 hover:opacity-80"
                                    style={{ opacity: 0.9 }}
                                >
                                    {/* Node circle */}
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r={nodeSize / 10}
                                        fill={node.color || '#3B82F6'}
                                        stroke="white"
                                        strokeWidth="0.5"
                                    >
                                        {/* Tooltip */}
                                        <title>
                                            {node.label}
                                            {node.attributes && Object.entries(node.attributes).map(([key, value]) =>
                                                `\n${key}: ${value}`
                                            ).join('')}
                                        </title>
                                    </circle>

                                    {/* Node label */}
                                    <text
                                        x={cx}
                                        y={cy + nodeSize / 8 + 1}
                                        fontSize="2.5"
                                        textAnchor="middle"
                                        fill="#4B5563"
                                        className="pointer-events-none font-medium"
                                    >
                                        {node.label}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap justify-center mt-3 gap-3">
                    <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-1.5"></div>
                        <span className="text-xs">Company</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-1.5"></div>
                        <span className="text-xs">Revenue Stream</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-purple-500 mr-1.5"></div>
                        <span className="text-xs">Industry Application</span>
                    </div>
                </div>
            </div>
        );
    };

    function calculateArrowPoints(x1: number, y1: number, x2: number, y2: number, size: number) {
        // Calculate angle of the edge
        const angle = Math.atan2(y2 - y1, x2 - x1);

        // Calculate endpoint (adjusted to not overlap the target node)
        const endX = x2 - (size / 5) * Math.cos(angle);
        const endY = y2 - (size / 5) * Math.sin(angle);

        // Calculate the arrow points
        const arrowSize = size / 10;
        const arrowAngle = Math.PI / 6; // 30 degrees

        const x3 = endX - arrowSize * Math.cos(angle - arrowAngle);
        const y3 = endY - arrowSize * Math.sin(angle - arrowAngle);

        const x4 = endX - arrowSize * Math.cos(angle + arrowAngle);
        const y4 = endY - arrowSize * Math.sin(angle + arrowAngle);

        return `${endX},${endY} ${x3},${y3} ${x4},${y4}`;
    }


    // Add to imports at the top of the file

    // Add this component in the file before the return statement
    const ChartWidget = ({ widget }: { widget: Widget }) => {
        // Check if the widget data is loading or empty
        if (!widget.data || widget.data.status === 'loading') {
            return (
                <div className="flex items-center justify-center h-full">Loading chart data...</div>
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
            const colors = ["blue", "green", "purple", "amber", "rose"];

            // Calculate appropriate yAxisWidth based on data values
            const maxValue = Math.max(...datasets.flatMap(d => d.data.filter(v => v !== null) as number[]));
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
                            colors={colors}
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
                                                    style={{ backgroundColor: getCategoryColor(colors[index % colors.length]) }}
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
                        {categories.map((category, index) => (
                            <div key={index} className="flex items-center px-1">
                                <div
                                    className="w-2 h-2 rounded-full mr-1"
                                    style={{ backgroundColor: getCategoryColor(colors[index % colors.length]) }}
                                ></div>
                                <span>{category}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // Default pie chart rendering (from existing code)
        return (
            <div className="flex flex-col items-center justify-center h-full py-2">
                <PieChart className={`${widget.positionData?.expanded ? 'w-32 h-32' : 'w-24 h-24'} mb-2 text-blue-500 transition-all duration-300`} />
                <div className="text-sm text-center">
                    {!widget.data || !widget.data.segments ? (
                        "Loading data..."
                    ) : (
                        <div className={`grid ${widget.positionData?.expanded ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mt-2 transition-all duration-300`}>
                            {widget.data.segments.map((segment: any, index: number) => (
                                <div key={index} className={`flex items-center ${widget.positionData?.expanded ? 'text-sm' : 'text-xs'} transition-all duration-300`}>
                                    <div className={`w-3 h-3 rounded-full mr-1 bg-blue-${300 + (index * 100)}`}></div>
                                    <span>{segment.label}: {segment.value}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Helper function to get color values for the legend
    const getCategoryColor = (color: string) => {
        const colorMap: { [key: string]: string } = {
            'blue': '#3B82F6',
            'green': '#10B981',
            'purple': '#8B5CF6',
            'amber': '#F59E0B',
            'rose': '#F43F5E'
        };
        return colorMap[color] || '#3B82F6';
    };
    // Then update the renderWidgetContent function to use this component
    const renderWidgetContent = (widget: DashboardWidget) => {
        // Placeholder rendering based on widget type
        switch (widget.format) {
            case FORMAT_TYPES.CHART:
                return <ChartWidget widget={widget} />;
            case FORMAT_TYPES.TABLE:
                return <TableWidget widget={widget} />;
            case FORMAT_TYPES.GRAPH:
                return <GraphWidget widget={widget} />;
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
                        >
                            <Save className="mr-2 h-4 w-4" />
                            Save Dashboard
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


                {widgets.length === 0 ? (
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
                    <ResponsiveGridLayout
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
                        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                        cols={cols}
                        rowHeight={rowHeight}
                        onLayoutChange={handleLayoutChange}
                        draggableHandle=".widget-drag-handle"
                        useCSSTransforms={true}
                        compactType="horizontal"
                        preventCollision={false}
                        verticalCompact={true}
                        autoSize={true}
                    >
                        {widgets.map((widget) => (
                            <div key={widget.id}>
                                <Card className="flex flex-col h-full overflow-hidden">
                                    <div className="p-3 border-b bg-muted/20 flex items-center justify-between widget-drag-handle cursor-move">
                                        <div className="font-medium truncate">{widget.title}</div>
                                        <div className="flex items-center space-x-1">
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
                    </ResponsiveGridLayout>
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
                                        <SelectItem value={FORMAT_TYPES.GRAPH}>Graph</SelectItem>
                                    </SelectContent>
                                </UISelect>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <UILabel htmlFor="widget-metric" className="text-right">Metric</UILabel>
                                <UISelect
                                    value={newWidgetMetric}
                                    onValueChange={setNewWidgetMetric}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select metric" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AVAILABLE_METRICS.map(metric => (
                                            <SelectItem key={metric.id} value={metric.id}>
                                                {metric.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </UISelect>
                            </div>
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
