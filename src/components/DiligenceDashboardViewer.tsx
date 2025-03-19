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
import { fetchMetricData, getAvailableMetrics, MetricsService, Widget, DashboardTemplate } from './services/metricsService';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Label as UILabel } from '@/components/ui/label';
import { Select as UISelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';

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

// Dashboard component
export default function DiligenceDashboardViewer() {
  const params = useParams();
  const bucketId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';
  
  // State for dashboard widgets and layout
  const [widgets, setWidgets] = useState<Record<string, Widget>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const [selectedFormatType, setSelectedFormatType] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [widgetTitle, setWidgetTitle] = useState('');
  const [customMetric, setCustomMetric] = useState('');
  const [metricDetails, setMetricDetails] = useState('');
  const [isMetricDetailsOpen, setIsMetricDetailsOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [isLoadTemplateOpen, setIsLoadTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [availableTemplates, setAvailableTemplates] = useState<DashboardTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [loadingWidgetIds, setLoadingWidgetIds] = useState<string[]>([]);
  const [graphLayout, setGraphLayout] = useState<{nodes: GraphNode[], links: GraphEdge[]}>({ nodes: [], links: [] });
  
  // Load dashboard data on component mount
  useEffect(() => {
    loadDashboardState();
  }, [bucketId]);
  
  // Load dashboard state
  const loadDashboardState = async () => {
    try {
      setIsLoading(true);
      const loadedWidgetsMap = await MetricsService.getDashboardState(bucketId);
      setWidgets(loadedWidgetsMap);
      checkForLoadingWidgets(loadedWidgetsMap);
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
  
  // Check if any widget is in loading state and start/stop polling as needed
  const checkForLoadingWidgets = (widgetsMap: Record<string, Widget>) => {
    const loadingWidgets = Object.values(widgetsMap).filter(widget => {
      if (!widget.data) return true;
      
      // Check if data is a string that needs parsing
      if (typeof widget.data === 'string') {
        try {
          const parsed = JSON.parse(widget.data);
          return parsed?.status === 'loading';
        } catch {
          return true; // If we can't parse it, assume loading
        }
      }
      
      // Check direct status property
      return widget.data?.status === 'loading';
    });

    // Store IDs of loading widgets
    const newLoadingIds = loadingWidgets.map(widget => widget.id);
    setLoadingWidgetIds(newLoadingIds);

    // Clear any existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    // Start new polling if we have loading widgets
    if (loadingWidgets.length > 0) {
      console.log(`${loadingWidgets.length} widgets are still loading, starting polling`);
      const interval = setInterval(() => {
        console.log('Polling for loading widget updates');
        checkLoadingWidgetsData();
      }, 20000); // 20 seconds
      
      setPollingInterval(interval);
    } else {
      console.log('All widgets loaded, polling stopped');
    }
  };

  // Only check specific loading widgets instead of refreshing everything
  const checkLoadingWidgetsData = async () => {
    if (loadingWidgetIds.length === 0) return;
    
    try {
      // Get only the widget data without refreshing the entire state
      const response = await get({
        apiName: 'S3_API',
        path: `/metrics/${bucketId}/dashboard-state`
      });
      
      const { body } = await response.response;
      const responseText = await body.text();
      const data = JSON.parse(responseText);
      const updatedWidgetsMap = data.widgets;
      
      // Only update widgets that were loading and have new data
      let hasChanges = false;
      const newWidgetsMap = { ...widgets };
      
      loadingWidgetIds.forEach(widgetId => {
        // Skip if widget doesn't exist in either map
        if (!newWidgetsMap[widgetId] || !updatedWidgetsMap[widgetId]) return;
        
        // Check if the data has changed
        const currentDataStr = JSON.stringify(newWidgetsMap[widgetId].data);
        const newDataStr = JSON.stringify(updatedWidgetsMap[widgetId].data);
        
        if (currentDataStr !== newDataStr) {
          console.log(`Widget ${widgetId} has updated data`);
          newWidgetsMap[widgetId] = updatedWidgetsMap[widgetId];
          hasChanges = true;
        }
      });
      
      // Only update state if we have actual changes
      if (hasChanges) {
        console.log('Updating widgets with new data');
        setWidgets(newWidgetsMap);
      } else {
        console.log('No changes in widget data');
      }
      
      // Re-check for loading widgets
      const stillLoadingWidgets = Object.values(newWidgetsMap)
        .filter(widget => {
          if (!widget.data) return true;
          
          if (typeof widget.data === 'string') {
            try {
              const parsed = JSON.parse(widget.data);
              return parsed?.status === 'loading';
            } catch {
              return true;
            }
          }
          
          return widget.data?.status === 'loading';
        });
      
      // Update loading widget IDs
      setLoadingWidgetIds(stillLoadingWidgets.map(w => w.id));
      
      // If no widgets are still loading, stop polling
      if (stillLoadingWidgets.length === 0) {
        if (pollingInterval) {
          console.log('All widgets loaded, stopping polling');
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }
    } catch (error) {
      console.error('Error checking loading widgets:', error);
    }
  };

  // Use effect to check for loading widgets whenever widgets change
  useEffect(() => {
    checkForLoadingWidgets(widgets);
    
    // Cleanup interval on component unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [widgets]);

  // Load dashboard state on component mount
  useEffect(() => {
    loadDashboardState();
    loadTemplates();
    
    // Cleanup on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [bucketId]);
  
  // Save dashboard state
  const saveDashboard = async () => {
    try {
      await MetricsService.saveDashboardState(bucketId, widgets);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Dashboard saved successfully"
      });
    } catch (error) {
      console.error('Error saving dashboard:', error);
      toast({
        title: "Error",
        description: "Failed to save dashboard",
        variant: "destructive"
      });
    }
  };
  
  // Add a new widget to the dashboard
  const addWidget = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (!selectedFormatType) return;
    if (!customMetric.trim()) return;
    
    const metricId = selectedMetric || '';
    const metricName = selectedMetric ? 
      AVAILABLE_METRICS.find(m => m.id === selectedMetric)?.name : 
      '';
    
    // Determine appropriate widget size and type based on format
    let widgetWidth = 2;    // Default width is 2 columns (small)
    let widgetHeight = 1;   // Default height is 1 row (small)
    let isExpanded = false; // Default is not expanded
    let widgetType = selectedFormatType;
    
    // Set size based on format type
    if (selectedFormatType === FORMAT_TYPES.CHART) {
      // Charts are medium sized
      widgetWidth = 2;
      widgetHeight = 2;
      isExpanded = true;
    } else if (selectedFormatType === FORMAT_TYPES.TABLE) {
      // Tables need more space
      widgetWidth = 3;
      widgetHeight = 2;
      isExpanded = true;
    } else if (selectedFormatType === FORMAT_TYPES.GRAPH) {
      // Graphs need a lot of space
      widgetWidth = 4;
      widgetHeight = 3;
      isExpanded = true;
    }
    
    // Calculate y position for the new widget
    const maxY = Object.values(widgets).length > 0 
      ? Math.max(...Object.values(widgets).map(w => w.positionData?.y + w.positionData?.height || 0)) 
      : 0;
    
    const newWidgetId = uuidv4();
    const newWidget: Widget = {
      id: newWidgetId,
      type: widgetType,
      title: widgetTitle || customMetric, // Use custom metric as title if not provided
      metricName: metricName || customMetric,
      extraDetails: metricDetails,
      positionData: {
        width: widgetWidth,
        height: widgetHeight,
        expanded: isExpanded,
        x: 0,
        y: maxY
      },
      data: { status: 'loading' }
    };
    
    setWidgets(prevWidgets => ({
      ...prevWidgets,
      [newWidgetId]: newWidget
    }));
    
    setIsAddWidgetOpen(false);
    setSelectedFormatType(null);
    setSelectedMetric(null);
    setWidgetTitle('');
    setCustomMetric('');
    setMetricDetails('');
    
    // Trigger AI data fetch for the new widget
    fetchWidgetData(newWidget);
  };
  
  // Remove a widget from the dashboard
  const removeWidget = (widgetId: string) => {
    setWidgets(prevWidgets => {
      const newWidgets = { ...prevWidgets };
      delete newWidgets[widgetId];
      return newWidgets;
    });
  };
  
  // Fetch data for a specific widget
  const fetchWidgetData = async (widget: Widget) => {
    try {
      let data;
      
      // Use metricName as the query
      data = await fetchMetricData(
        bucketId, 
        widget.id, 
        widget.type,
        widget.metricName,
        widget.extraDetails
      );
      
      if (data) {
        setWidgets(prevWidgets => ({
          ...prevWidgets,
          [widget.id]: {
            ...prevWidgets[widget.id],
            data: data.value
          }
        }));
      }
    } catch (error) {
      console.error(`Error fetching data for widget ${widget.id}:`, error);
    }
  };
  
  // Open widget settings dialog
  const openWidgetSettings = (widget: Widget) => {
    // Ensure we clear any previous widget data first
    setEditingWidget(null);
    setWidgetTitle('');
    setSelectedMetric(null);
    setCustomMetric('');
    setMetricDetails('');
    setIsMetricDetailsOpen(false);
    
    // Short timeout to ensure the state is cleared before setting new values
    setTimeout(() => {
      setEditingWidget(widget);
      setWidgetTitle(widget.title);
      
      // Find if widget's metricName matches any available metric
      const matchingMetric = AVAILABLE_METRICS.find(m => m.name === widget.metricName);
      setSelectedMetric(matchingMetric?.id || null);
      
      // Use metricName as the custom metric text
      setCustomMetric(widget.metricName || '');
      setMetricDetails(widget.extraDetails || '');
    }, 10);
  };
  
  // Save widget settings
  const saveWidgetSettings = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (!editingWidget) return;
    if (!customMetric.trim()) return;
    
    const metricId = selectedMetric || '';
    const metricName = selectedMetric ? 
      AVAILABLE_METRICS.find(m => m.id === selectedMetric)?.name || customMetric : 
      customMetric;
    
    setWidgets(prevWidgets => ({
      ...prevWidgets,
      [editingWidget.id]: {
        ...prevWidgets[editingWidget.id],
        title: widgetTitle || customMetric,
        metricName: metricName,
        extraDetails: metricDetails
      }
    }));
    
    setEditingWidget(null);
    
    // Fetch updated data for the widget
    const updatedWidget = widgets[editingWidget.id];
    if (updatedWidget) {
      fetchWidgetData({
        ...updatedWidget,
        metricName: metricName,
        extraDetails: metricDetails
      });
    }
  };
  
  // Toggle metric details dialog
  const toggleMetricDetails = () => {
    setIsMetricDetailsOpen(!isMetricDetailsOpen);
  };
  
  // Render a specific widget based on its type
  const renderWidget = (widget: Widget) => {
    // Render the appropriate widget based on type
    if (widget.type === FORMAT_TYPES.CHART) {
      return <ChartWidget widget={widget} />;
    } else if (widget.type === FORMAT_TYPES.TABLE) {
      return <TableWidget widget={widget} />;
    } else if (widget.type === FORMAT_TYPES.GRAPH) {
      return <GraphWidget widget={widget} />;
    } else {
      return <div className="flex items-center justify-center h-full p-4">
        <div className="text-gray-500">
          Unsupported widget type: {widget.type}
        </div>
      </div>;
    }
  };
  
  // Component for displaying a chart
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
      
      // Calculate the max value for scaling with some padding
      const allValues = datasets.flatMap((ds: { label: string; data: (number | null)[] }) => 
        ds.data.filter((val): val is number => val !== null && val !== undefined)
      );
      const maxValue = Math.max(...allValues) * 1.1; // Add 10% padding at the top
      
      // Format large numbers with abbreviations
      const formatValue = (value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
        return value.toString();
      };
      
      // Define colors with better contrast
      const datasetColors = [
        { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-600', hover: 'hover:bg-blue-400' },
        { bg: 'bg-green-500', border: 'border-green-600', text: 'text-green-600', hover: 'hover:bg-green-400' },
        { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-purple-600', hover: 'hover:bg-purple-400' },
        { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-amber-600', hover: 'hover:bg-amber-400' },
        { bg: 'bg-rose-500', border: 'border-rose-600', text: 'text-rose-600', hover: 'hover:bg-rose-400' }
      ];

      // Generate Y-axis scale labels
      const yAxisSteps = 5;
      const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
        const value = Math.round(maxValue * (1 - i / yAxisSteps));
        return formatValue(value);
      });
      
      // Calculate layout values
      const barGroupWidth = 100 / (labels.length || 1);
      // Determine bar width based on dataset count
      const maxBarsPerCategory = datasets.length;
      // Adjust spacing based on number of datasets
      const barWidthPercentage = maxBarsPerCategory <= 2 ? 0.7 : (maxBarsPerCategory <= 3 ? 0.6 : 0.5);
      const barWidth = barGroupWidth * barWidthPercentage / maxBarsPerCategory;
      
      return (
        <div className="flex flex-col h-full w-full p-2 overflow-hidden">
          {/* Title and description */}
          {title && <h3 className="font-semibold text-sm">{title}</h3>}
          {description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{description}</p>}
          
          <div className="flex flex-1 mt-1 min-h-[180px]">
            {/* Y-axis */}
            <div className="w-16 flex flex-col justify-between pr-2 text-right text-xs text-gray-500">
              {yAxisLabels.map((label, index) => (
                <div key={index} className="whitespace-nowrap">{label}</div>
              ))}
            </div>
            
            {/* Main chart area */}
            <div className="flex-1 flex flex-col">
              {/* Chart grid and bars */}
              <div className="flex-1 relative border-b border-l border-gray-300 dark:border-gray-700">
                {/* Horizontal grid lines */}
                {yAxisLabels.map((_, index) => (
                  <div 
                    key={index} 
                    className="absolute w-full border-t border-gray-200 dark:border-gray-800" 
                    style={{ top: `${index * (100 / yAxisSteps)}%`, left: 0, right: 0 }}
                  />
                ))}
                
                {/* Bars container */}
                <div className="absolute inset-0 flex">
                  {labels.map((label: string, labelIndex: number) => (
                    <div 
                      key={labelIndex} 
                      className="flex items-end justify-center" 
                      style={{ 
                        width: `${barGroupWidth}%`,
                        height: '100%'
                      }}
                    >
                      {/* Group of bars for this label */}
                      <div className="flex items-end h-full pb-6 pt-1">
                        {datasets.map((dataset: { label: string; data: (number | null)[]; sources?: string }, datasetIndex: number) => {
                          // Skip null or undefined values
                          if (dataset.data[labelIndex] === null || dataset.data[labelIndex] === undefined) {
                            return <div key={datasetIndex} style={{ width: `${barWidth}%` }} className="mx-0.5"></div>;
                          }
                          
                          const value = dataset.data[labelIndex] as number;
                          const heightPercent = (value / maxValue) * 100;
                          const color = datasetColors[datasetIndex % datasetColors.length];
                          
                          // Only render if there's a visible height
                          if (heightPercent <= 0) {
                            return <div key={datasetIndex} style={{ width: `${barWidth}%` }} className="mx-0.5"></div>;
                          }
                          
                          return (
                            <div
                              key={datasetIndex}
                              className="relative group mx-0.5"
                              style={{ 
                                width: `${barWidth}%`,
                                minWidth: '6px',
                                maxWidth: '24px'
                              }}
                            >
                              {/* The bar */}
                              <div 
                                className={`w-full ${color.bg} ${color.hover} rounded-t transition-all duration-150`}
                                style={{ 
                                  height: `${heightPercent}%`, 
                                  minHeight: '2px',
                                  transformOrigin: 'bottom',
                                }}
                              ></div>
                              
                              {/* Enhanced tooltip - only way to see values now */}
                              <div className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 bottom-full left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 mb-1 whitespace-nowrap z-30 shadow-lg pointer-events-none transition-opacity duration-200">
                                <div className="font-semibold">{dataset.label}</div>
                                <div>{label}: {value.toLocaleString()}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* X-axis labels */}
              <div className="flex mt-1 mb-2">
                {labels.map((label: string, index: number) => (
                  <div 
                    key={index} 
                    className="flex justify-center"
                    style={{ width: `${barGroupWidth}%` }}
                  >
                    <div className="text-xs text-gray-700 dark:text-gray-300 font-medium px-1 text-center" title={label}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* X-Axis Title */}
              {xAxis?.title && (
                <div className="text-center text-xs text-gray-500 mt-1 font-medium">
                  {xAxis.title}
                </div>
              )}
              
              {/* Legend - with better spacing and clear labels */}
              <div className="flex flex-wrap justify-center mt-3 mb-1 gap-x-4 gap-y-2">
                {datasets.map((dataset: { label: string; data: (number | null)[] }, index: number) => {
                  const color = datasetColors[index % datasetColors.length];
                  const shortLabel = dataset.label.replace(' Revenue (in millions)', '')
                                                  .replace(' (Revenue Range)', '');
                  
                  return (
                    <div key={index} className="flex items-center">
                      <div className={`w-3 h-3 rounded-full ${color.bg}`}></div>
                      <span className="ml-1.5 text-xs font-medium">{shortLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Y-Axis Title */}
            {yAxis?.title && (
              <div className="flex items-center w-8 ml-1">
                <div className="transform -rotate-90 text-xs text-gray-500 font-medium whitespace-nowrap origin-center">
                  {yAxis.title}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Default pie chart rendering (from existing code)
    return (
      <div className="flex flex-col items-center justify-center h-full py-2">
        <PieChart className={`${widget.positionData?.expanded ? 'w-36 h-36' : 'w-24 h-24'} mb-2 text-blue-500 transition-all duration-300`} />
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
  
  // Component for displaying a data table
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
  
  // Component for displaying a graph (network graph visualization)
  const GraphWidget = ({ widget }: { widget: Widget }) => {
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
      
      setGraphLayout({ nodes: processedNodes, links: processedLinks });
    }, [widget.data]);
    
    // Calculate hierarchical positions for nodes
    const calculateHierarchicalLayout = (nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] => {
      // Define levels based on node categories
      const categoryLevels: {[key: string]: number} = {
        'Company': 0,
        'Revenue Stream': 1,
        'Industry Application': 2
      };
      
      // Group nodes by level
      const nodesByLevel: {[key: number]: GraphNode[]} = {};
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
            {graphLayout.links.map((link, index) => {
              // Find connected nodes
              const sourceNode = graphLayout.nodes.find(n => n.id === link.source);
              const targetNode = graphLayout.nodes.find(n => n.id === link.target);
              
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
                      points={calculateArrowPoints(x1, y1, x2, y2, (targetNode.size || 30)/3)}
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
            {graphLayout.nodes.map((node, index) => {
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
                    y={cy + nodeSize/8 + 1} 
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
  
  // Helper function to calculate arrow points for directed edges
  function calculateArrowPoints(x1: number, y1: number, x2: number, y2: number, size: number) {
    // Calculate angle of the edge
    const angle = Math.atan2(y2 - y1, x2 - x1);
    
    // Calculate endpoint (adjusted to not overlap the target node)
    const endX = x2 - (size/5) * Math.cos(angle);
    const endY = y2 - (size/5) * Math.sin(angle);
    
    // Calculate the arrow points
    const arrowSize = size / 10;
    const arrowAngle = Math.PI / 6; // 30 degrees
    
    const x3 = endX - arrowSize * Math.cos(angle - arrowAngle);
    const y3 = endY - arrowSize * Math.sin(angle - arrowAngle);
    
    const x4 = endX - arrowSize * Math.cos(angle + arrowAngle);
    const y4 = endY - arrowSize * Math.sin(angle + arrowAngle);
    
    return `${endX},${endY} ${x3},${y3} ${x4},${y4}`;
  }
  
  // Handle the end of a drag event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      // Get the widget IDs
      const activeId = String(active.id);
      const overId = String(over.id);
      
      // Get the widgets that are being dragged and dropped on
      const draggedWidget = widgets[activeId];
      const dropWidget = widgets[overId];
      
      if (draggedWidget && dropWidget && draggedWidget.positionData && dropWidget.positionData) {
        // Swap their positions (this is a simplified approach)
        // For a more complex grid layout, you might need a more sophisticated positioning algorithm
        const draggedPos = { 
          x: draggedWidget.positionData.x || 0, 
          y: draggedWidget.positionData.y || 0 
        };
        const dropPos = { 
          x: dropWidget.positionData.x || 0, 
          y: dropWidget.positionData.y || 0 
        };
        
        setWidgets(prevWidgets => ({
          ...prevWidgets,
          [activeId]: {
            ...prevWidgets[activeId],
            positionData: {
              ...prevWidgets[activeId].positionData,
              x: dropPos.x,
              y: dropPos.y
            }
          },
          [overId]: {
            ...prevWidgets[overId],
            positionData: {
              ...prevWidgets[overId].positionData,
              x: draggedPos.x,
              y: draggedPos.y
            }
          }
        }));
      }
    }
    
    setDraggedWidgetId(null);
  };
  
  // Expand or collapse a widget with multiple size options
  const toggleWidgetSize = (widget: Widget) => {
    // If the widget parameter has specific positionData properties,
    // this is a resize operation and we should directly update those dimensions
    if (widget.positionData && typeof widget.positionData.width === 'number' && typeof widget.positionData.height === 'number') {
      setWidgets(prevWidgets => ({
        ...prevWidgets,
        [widget.id]: {
          ...prevWidgets[widget.id],
          positionData: {
            ...prevWidgets[widget.id].positionData,
            width: widget.positionData.width,
            height: widget.positionData.height,
            expanded: widget.positionData.expanded
          }
        }
      }));
      return;
    }
    
    // Otherwise, this is a toggle operation from the button
    setWidgets(prevWidgets => {
      const currentWidget = prevWidgets[widget.id];
      if (!currentWidget || !currentWidget.positionData) return prevWidgets;
      
      const { width, height, expanded } = currentWidget.positionData;
      
      // Default values if positionData properties are missing
      const currentWidth = width || 2;
      const currentHeight = height || 1;
      const isCurrentlyExpanded = !!expanded;
      
      // Toggle between states: small -> medium -> large -> small
      let newWidth = currentWidth;
      let newHeight = currentHeight;
      let newExpanded = expanded;
      
      if (currentWidth >= 3 && currentHeight >= 2) {
        // Large -> Small
        newWidth = 2;
        newHeight = 1;
        newExpanded = false;
      } else if (currentWidth === 2 && currentHeight === 2) {
        // Medium -> Large
        newWidth = 3;
        newHeight = 2;
        newExpanded = true;
      } else if (currentWidth === 2 && currentHeight === 1) {
        // Small -> Medium
        newWidth = 2; 
        newHeight = 2;
        newExpanded = true;
      } else {
        // Default/any other case -> Small
        newWidth = 2;
        newHeight = 1;
        newExpanded = false;
      }
      
      return {
        ...prevWidgets,
        [widget.id]: {
          ...currentWidget,
          positionData: {
            ...currentWidget.positionData,
            width: newWidth,
            height: newHeight,
            expanded: newExpanded
          }
        }
      };
    });
  };
  
  // Load templates
  const loadTemplates = async () => {
    try {
      const templates = await MetricsService.listDashboardTemplates();
      setAvailableTemplates(templates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive"
      });
    }
  };
  
  // Save as template
  const saveAsTemplate = async () => {
    if (!templateName) return;
    
    try {
      await MetricsService.saveDashboardTemplate(
        templateName,
        templateDescription,
        Object.values(widgets),
        bucketId
      );
      setIsSaveTemplateOpen(false);
      setTemplateName('');
      setTemplateDescription('');
      toast({
        title: "Success",
        description: "Template saved successfully"
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive"
      });
    }
  };
  
  // Apply template
  const applyTemplate = async (templateId: string) => {
    try {
      const template = await MetricsService.getDashboardTemplate(templateId);
      
      // Convert template's widget array to a map
      const widgetsMap: Record<string, Widget> = {};
      template.widgets.forEach(widget => {
        widgetsMap[widget.id] = widget;
      });
      
      setWidgets(widgetsMap);
      setIsLoadTemplateOpen(false);
      toast({
        title: "Success",
        description: "Template applied successfully"
      });
    } catch (error) {
      console.error('Error applying template:', error);
      toast({
        title: "Error",
        description: "Failed to apply template",
        variant: "destructive"
      });
    }
  };
  
  // Delete template
  const deleteTemplate = async (templateId: string) => {
    try {
      await MetricsService.deleteDashboardTemplate(templateId);
      loadTemplates(); // Refresh template list
      toast({
        title: "Success",
        description: "Template deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="flex-1 p-4 overflow-auto h-full" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Diligence Dashboard</h1>
        <div className="flex gap-2" style={{ position: 'relative', zIndex: 40 }}>
          <Button 
            variant="outline" 
            onClick={() => {
              loadTemplates();
              setIsLoadTemplateOpen(true);
            }}
            className="flex items-center gap-2 relative"
            style={{ zIndex: 40, pointerEvents: 'auto' }}
          >
            <FolderOpen className="h-4 w-4" />
            <span>Load Template</span>
          </Button>
          
          {isEditing ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => setIsSaveTemplateOpen(true)}
                className="flex items-center gap-2 relative"
                style={{ zIndex: 40, pointerEvents: 'auto' }}
              >
                <Save className="h-4 w-4" />
                <span>Save as Template</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(false)}
                className="relative"
                style={{ zIndex: 40, pointerEvents: 'auto' }}
              >
                Cancel
              </Button>
              <Button 
                onClick={saveDashboard}
                className="bg-blue-600 hover:bg-blue-700 text-white relative"
                style={{ zIndex: 40, pointerEvents: 'auto' }}
              >
                Save Dashboard
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => setIsEditing(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white relative"
              style={{ zIndex: 40, pointerEvents: 'auto' }}
            >
              Customize Dashboard
            </Button>
          )}
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-6 gap-4 auto-rows-minmax(220px, auto) pb-16 relative">
            {Object.values(widgets).map((widget) => (
              <DraggableWidget 
                key={widget.id} 
                widget={widget}
                isEditing={isEditing}
                onRemove={removeWidget}
                onEdit={openWidgetSettings}
                onToggleSize={toggleWidgetSize}
              >
                {renderWidget(widget)}
              </DraggableWidget>
            ))}
            
            {isEditing && (
              <Card 
                className="p-4 border-dashed border-2 flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 col-span-1 row-span-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddWidgetOpen(true);
                }}
              >
                <div className="flex flex-col items-center text-gray-500">
                  <PlusCircle className="h-8 w-8 mb-2" />
                  <span>Add Widget</span>
                </div>
              </Card>
            )}
          </div>
        </DndContext>
      )}
      
      {/* Add Widget Dialog */}
      <Dialog open={isAddWidgetOpen} onOpenChange={(open) => {
        if (!open) {
          // Clear form when closing
          setSelectedFormatType(null);
          setSelectedMetric(null);
          setWidgetTitle('');
          setCustomMetric('');
          setMetricDetails('');
        }
        setIsAddWidgetOpen(open);
      }}>
        <DialogContent className="dark:bg-darkbg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Add Widget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-white">Widget Type</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(FORMAT_TYPES).map(([key, value]) => (
                  <Button
                    key={key}
                    variant={selectedFormatType === value ? "default" : "outline"}
                    onClick={() => {
                      setSelectedFormatType(value);
                    }}
                    className="justify-start"
                  >
                    {key === 'CHART' && <PieChart className="mr-2 h-4 w-4" />}
                    {key === 'TABLE' && (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="3" y1="15" x2="21" y2="15" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                        <line x1="15" y1="3" x2="15" y2="21" />
                      </svg>
                    )}
                    {key === 'GRAPH' && (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <circle cx="6" cy="6" r="2" />
                        <circle cx="18" cy="6" r="2" />
                        <circle cx="6" cy="18" r="2" />
                        <circle cx="18" cy="18" r="2" />
                        <line x1="12" y1="12" x2="6" y2="6" />
                        <line x1="12" y1="12" x2="18" y2="6" />
                        <line x1="12" y1="12" x2="6" y2="18" />
                        <line x1="12" y1="12" x2="18" y2="18" />
                      </svg>
                    )}
                    {key}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium mb-1 block dark:text-white">Query</label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={toggleMetricDetails}
                  className="text-xs px-2 py-0 h-6"
                >
                  Add Details
                </Button>
              </div>
              <Input
                value={customMetric}
                onChange={(e) => setCustomMetric(e.target.value)}
                placeholder="Enter your question (e.g., Revenue by product, Customer distribution)"
                className="dark:bg-darkbg dark:text-white mb-2"
              />
              
              {isMetricDetailsOpen && (
                <div className="mt-2">
                  <label className="text-sm font-medium mb-1 block dark:text-white">Additional Context (Optional)</label>
                  <Input
                    value={metricDetails}
                    onChange={(e) => setMetricDetails(e.target.value)}
                    placeholder="Provide additional details (e.g., time period, specific focus)"
                    className="dark:bg-darkbg dark:text-white"
                  />
                </div>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-white">Widget Title (Optional)</label>
              <Input
                value={widgetTitle}
                onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="Leave blank to use query as title"
                className="dark:bg-darkbg dark:text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                setIsAddWidgetOpen(false);
              }}
              className="dark:bg-transparent dark:text-white dark:hover:bg-gray-800 z-10"
            >
              Cancel
            </Button>
            <Button 
              onClick={addWidget}
              disabled={!selectedFormatType || !customMetric.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white z-10"
            >
              Add Widget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Widget Dialog */}
      <Dialog open={!!editingWidget} onOpenChange={(open) => {
        if (!open) {
          setEditingWidget(null);
          setWidgetTitle('');
          setSelectedMetric(null);
          setCustomMetric('');
          setMetricDetails('');
        }
      }}>
        <DialogContent className="dark:bg-darkbg sm:max-w-md" style={{ zIndex: 100 }}>
          <DialogHeader>
            <DialogTitle className="dark:text-white">Edit Widget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium mb-1 block dark:text-white">Metric</label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={toggleMetricDetails}
                  className="text-xs px-2 py-0 h-6"
                >
                  Add Details
                </Button>
              </div>
              <Input
                value={customMetric}
                onChange={(e) => setCustomMetric(e.target.value)}
                placeholder="Enter metric (e.g., Revenue, Headcount Growth, etc.)"
                className="dark:bg-darkbg dark:text-white mb-2"
              />
              
              {isMetricDetailsOpen && (
                <div className="mt-2">
                  <label className="text-sm font-medium mb-1 block dark:text-white">Additional Context (Optional)</label>
                  <Input
                    value={metricDetails}
                    onChange={(e) => setMetricDetails(e.target.value)}
                    placeholder="Provide additional details for the AI (e.g., time period, format)"
                    className="dark:bg-darkbg dark:text-white"
                  />
                </div>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-white">Widget Title (Optional)</label>
              <Input
                value={widgetTitle}
                onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="Leave blank to use metric name"
                className="dark:bg-darkbg dark:text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                setEditingWidget(null);
              }}
              className="dark:bg-transparent dark:text-white dark:hover:bg-gray-800 z-10"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveWidgetSettings}
              disabled={!customMetric.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white z-10"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Save Template Dialog */}
      <Dialog open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
        <DialogContent className="dark:bg-darkbg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Save Dashboard Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <UILabel htmlFor="templateName">Template Name</UILabel>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name"
              />
            </div>
            <div className="space-y-2">
              <UILabel htmlFor="templateDescription">Description (Optional)</UILabel>
              <Textarea
                id="templateDescription"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Enter template description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsSaveTemplateOpen(false)}
              className="dark:bg-transparent dark:text-white dark:hover:bg-gray-800 z-10"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveAsTemplate}
              disabled={!templateName}
              className="bg-blue-600 hover:bg-blue-700 text-white z-10"
            >
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Load Template Dialog */}
      <Dialog open={isLoadTemplateOpen} onOpenChange={setIsLoadTemplateOpen}>
        <DialogContent className="dark:bg-darkbg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Load Dashboard Template</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {availableTemplates.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400">No templates available</p>
            ) : (
              <div className="space-y-3">
                {availableTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" 
                    onClick={(e) => {
                      e.stopPropagation();
                      applyTemplate(template.id);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">{template.description}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          Last updated: {new Date(template.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            applyTemplate(template.id);
                          }}
                        >
                          Apply
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(template.id);
                          }}
                          className="text-red-500 hover:text-red-600"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                setIsLoadTemplateOpen(false);
              }}
              className="z-10"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Draggable widget component
interface DraggableWidgetProps {
  widget: Widget;
  isEditing: boolean;
  onRemove: (id: string) => void;
  onEdit: (widget: Widget) => void;
  onToggleSize: (widget: Widget) => void;
  children: React.ReactNode;
}

function DraggableWidget({ widget, isEditing, onRemove, onEdit, onToggleSize, children }: DraggableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: widget.id,
    disabled: !isEditing
  });
  
  // Make this widget also droppable
  const { setNodeRef: setDroppableNodeRef } = useDroppable({
    id: widget.id,
    disabled: !isEditing
  });
  
  // State for tracking resize operations
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [startWidth, setStartWidth] = useState(widget.positionData?.width || 2);
  const [startHeight, setStartHeight] = useState(widget.positionData?.height || 1);
  
  // Combine both refs for the main widget container
  const setRefs = (element: HTMLElement | null) => {
    setNodeRef(element);
    setDroppableNodeRef(element);
  };
  
  const style = transform ? {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : (isResizing ? 20 : 1)
  } : {
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : (isResizing ? 20 : 1)
  };

  // Pure button handlers with NO connection to drag functionality
  const handleToggleSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleSize(widget);
    return false; // Prevent any further handling
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onEdit(widget);
    return false; // Prevent any further handling
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onRemove(widget.id);
    return false; // Prevent any further handling
  };
  
  // Start resize operation
  const startResize = (e: React.MouseEvent, direction: string) => {
    if (!isEditing) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    setIsResizing(true);
    setStartX(e.clientX);
    setStartY(e.clientY);
    setStartWidth(widget.positionData?.width || 2);
    setStartHeight(widget.positionData?.height || 1);
    
    // Add document-level event listeners for mouse move and up
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    
    // Add class to body to prevent selection during resize
    document.body.classList.add('resizing');
  };
  
  // Handle resize during mouse movement
  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return;
    
    // Calculate grid units based on movement
    // Assuming each grid cell is roughly 100px wide in the 6-column grid
    const gridCellWidth = window.innerWidth / 8; // Approximate grid cell width
    const gridCellHeight = 150; // Approximate grid cell height
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    // Calculate new width in grid units (minimum 1, maximum 6)
    let newWidth = startWidth + Math.round(deltaX / gridCellWidth);
    newWidth = Math.max(1, Math.min(6, newWidth));
    
    // Calculate new height in grid units (minimum 1, maximum 4)
    let newHeight = startHeight + Math.round(deltaY / gridCellHeight);
    newHeight = Math.max(1, Math.min(4, newHeight));
    
    // Update the widget size in the parent component
    if (newWidth !== widget.positionData?.width || newHeight !== widget.positionData?.height) {
      const updatedWidget = {
        ...widget,
        positionData: {
          ...widget.positionData,
          width: newWidth,
          height: newHeight,
          expanded: newWidth > 2 || newHeight > 1
        }
      };
      
      // Update the widget in parent component
      onToggleSize(updatedWidget);
    }
  };
  
  // Stop resize operation
  const stopResize = () => {
    setIsResizing(false);
    
    // Remove document-level event listeners
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    
    // Remove body class
    document.body.classList.remove('resizing');
  };
  
  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResize);
      document.body.classList.remove('resizing');
    };
  }, [isResizing]);
  
  return (
    <Card 
      ref={setRefs}
      style={style}
      className={`p-0 shadow-md relative transition-all duration-300 ease-in-out
        ${widget.positionData?.width > 1 ? `col-span-${widget.positionData.width}` : ''} 
        ${widget.positionData?.height > 1 ? `row-span-${widget.positionData.height}` : ''}
        ${widget.positionData?.expanded ? 'border-2 border-blue-300 dark:border-blue-700' : 'border border-gray-200 dark:border-gray-800'}
        overflow-hidden
        ${isResizing ? 'pointer-events-none' : ''}
      `}
    >
      {/* Separate header with buttons that isn't part of the draggable area */}
      <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div 
          className={`font-medium text-lg ${isEditing ? 'cursor-move' : ''}`}
          {...(isEditing ? { ...attributes, ...listeners } : {})}
        >
          {widget.title}
        </div>
        <div className="flex gap-1 relative" style={{ zIndex: 50 }} onClick={(e) => e.stopPropagation()}>
          {/* Always show expand/collapse button, even when not editing */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleToggleSize}
            className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900 relative"
            style={{ zIndex: 50, pointerEvents: 'auto' }}
            title={widget.positionData?.expanded ? "Collapse" : "Expand"}
          >
            {widget.positionData?.expanded ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
          
          {isEditing && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleEdit}
                className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800 relative"
                style={{ zIndex: 50, pointerEvents: 'auto' }}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRemove}
                className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 relative"
                style={{ zIndex: 50, pointerEvents: 'auto' }}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content area that doesn't participate in drag events */}
      <div 
        className={`p-3 pb-6 transition-all duration-300 ease-in-out ${widget.positionData?.expanded ? 'scale-105 transform-origin-center' : ''}`}
        style={{ pointerEvents: isEditing ? 'none' : 'auto' }} // Disable interactions with content in edit mode
      >
        {children}
      </div>
      
      {/* Only show drag indicator in edit mode */}
      {isEditing && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-6 flex justify-center items-center opacity-50 hover:opacity-100 cursor-move bg-gray-100 dark:bg-gray-800"
          {...attributes}
          {...listeners}
        >
          <svg width="20" height="10" viewBox="0 0 20 10" fill="currentColor">
            <rect x="0" y="0" width="20" height="2" rx="1" />
            <rect x="0" y="4" width="20" height="2" rx="1" />
            <rect x="0" y="8" width="20" height="2" rx="1" />
          </svg>
        </div>
      )}
      
      {/* Resize handles - only visible in edit mode */}
      {isEditing && (
        <>
          {/* Right resize handle */}
          <div 
            className="absolute top-0 bottom-0 right-0 w-4 cursor-e-resize"
            onMouseDown={(e) => startResize(e, 'right')}
            style={{ zIndex: 30 }}
          >
            <div className="absolute top-1/2 right-0 w-1 h-12 bg-blue-500 rounded-l opacity-40 hover:opacity-100 transform -translate-y-1/2"></div>
          </div>
          
          {/* Bottom resize handle */}
          <div 
            className="absolute left-0 right-0 bottom-0 h-4 cursor-s-resize"
            onMouseDown={(e) => startResize(e, 'bottom')}
            style={{ zIndex: 30 }}
          >
            <div className="absolute bottom-0 left-1/2 h-1 w-12 bg-blue-500 rounded-t opacity-40 hover:opacity-100 transform -translate-x-1/2"></div>
          </div>
          
          {/* Bottom-right corner resize handle */}
          <div 
            className="absolute right-0 bottom-0 w-6 h-6 cursor-se-resize"
            onMouseDown={(e) => startResize(e, 'corner')}
            style={{ zIndex: 40 }}
          >
            <div className="absolute right-0 bottom-0 w-3 h-3 bg-blue-500 rounded-tl opacity-40 hover:opacity-100"></div>
          </div>
        </>
      )}
    </Card>
  );
} 