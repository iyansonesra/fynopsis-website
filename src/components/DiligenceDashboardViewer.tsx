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

// Chart subtypes for when chart format is selected
const CHART_SUBTYPES = {
  PIE: 'pie',
  BAR: 'bar',
  LINE: 'line'
};

// Available metrics for selection
const AVAILABLE_METRICS = getAvailableMetrics();

// Dashboard component
export default function DiligenceDashboardViewer() {
  const params = useParams();
  const bucketId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';
  
  // State for dashboard widgets and layout
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const [selectedFormatType, setSelectedFormatType] = useState<string | null>(null);
  const [selectedChartSubtype, setSelectedChartSubtype] = useState<string | null>(null);
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
  
  // Load dashboard data on component mount
  useEffect(() => {
    loadDashboardState();
  }, [bucketId]);
  
  // Load dashboard state
  const loadDashboardState = async () => {
    try {
      setIsLoading(true);
      const loadedWidgets = await MetricsService.getDashboardState(bucketId);
      setWidgets(loadedWidgets);
      checkForLoadingWidgets(loadedWidgets);
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
  const checkForLoadingWidgets = (currentWidgets: Widget[]) => {
    const loadingWidgets = currentWidgets.filter(widget => {
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
      const updatedWidgets = data.widgets;
      
      // Only update widgets that were loading and have new data
      let hasChanges = false;
      const newWidgets = widgets.map(existingWidget => {
        // Skip widgets that weren't loading
        if (!loadingWidgetIds.includes(existingWidget.id)) {
          return existingWidget;
        }
        
        // Find the updated version of this widget
        const updatedWidget = updatedWidgets.find((w: Widget) => w.id === existingWidget.id);
        if (!updatedWidget) return existingWidget;
        
        // Check if the data has changed
        const currentDataStr = JSON.stringify(existingWidget.data);
        const newDataStr = JSON.stringify(updatedWidget.data);
        
        if (currentDataStr !== newDataStr) {
          console.log(`Widget ${existingWidget.id} has updated data`);
          hasChanges = true;
          return updatedWidget;
        }
        
        return existingWidget;
      });
      
      // Only update state if we have actual changes
      if (hasChanges) {
        console.log('Updating widgets with new data');
        setWidgets(newWidgets);
      } else {
        console.log('No changes in widget data');
      }
      
      // Re-check for loading widgets
      const stillLoadingWidgets = newWidgets.filter(widget => {
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
      setLoadingWidgetIds(stillLoadingWidgets.map((w: Widget) => w.id));
      
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
    
    // Handle chart subtype if chart is selected
    if (selectedFormatType === FORMAT_TYPES.CHART && selectedChartSubtype) {
      widgetType = selectedChartSubtype;
      
      if (selectedChartSubtype === CHART_SUBTYPES.PIE) {
        // Pie charts start as medium (2x2)
        widgetWidth = 2;
        widgetHeight = 2;
        isExpanded = true;
      } else if (selectedChartSubtype === CHART_SUBTYPES.BAR || selectedChartSubtype === CHART_SUBTYPES.LINE) {
        // Bar and line charts are wider
        widgetWidth = 3;
        widgetHeight = 2;
        isExpanded = true;
      }
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
    
    const newWidget: Widget = {
      id: uuidv4(),
      type: widgetType,
      title: widgetTitle || customMetric, // Use custom metric as title if not provided
      metricId: metricId,
      metricName: metricName,
      customMetric: customMetric,
      metricDetails: metricDetails,
      width: widgetWidth,
      height: widgetHeight,
      expanded: isExpanded,
      x: 0,
      y: widgets.length > 0 ? Math.max(...widgets.map(w => w.y + w.height)) : 0,
      data: { status: 'loading' }
    };
    
    setWidgets([...widgets, newWidget]);
    setIsAddWidgetOpen(false);
    setSelectedFormatType(null);
    setSelectedChartSubtype(null);
    setSelectedMetric(null);
    setWidgetTitle('');
    setCustomMetric('');
    setMetricDetails('');
    
    // Trigger AI data fetch for the new widget
    fetchWidgetData(newWidget);
  };
  
  // Remove a widget from the dashboard
  const removeWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };
  
  // Fetch data for a specific widget
  const fetchWidgetData = async (widget: Widget) => {
    try {
      let data;
      
      if (widget.customMetric) {
        // Use our metrics service to fetch AI-generated data based on custom metric
        data = await fetchMetricData(
          bucketId, 
          widget.metricId || 'custom', 
          widget.type,
          widget.customMetric,
          widget.metricDetails
        );
      } else if (widget.metricId) {
        // Fallback to standard metrics
        data = await fetchMetricData(bucketId, widget.metricId, widget.type);
      } else {
        return;
      }
      
      if (data) {
        setWidgets(prevWidgets => 
          prevWidgets.map(w => 
            w.id === widget.id ? { ...w, data: data.value } : w
          )
        );
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
      setSelectedMetric(widget.metricId || null);
      setCustomMetric(widget.customMetric || '');
      setMetricDetails(widget.metricDetails || '');
    }, 10);
  };
  
  // Save widget settings
  const saveWidgetSettings = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (!editingWidget) return;
    if (!customMetric.trim()) return;
    
    const metricId = selectedMetric || '';
    const metricName = selectedMetric ? 
      AVAILABLE_METRICS.find(m => m.id === selectedMetric)?.name : 
      '';
    
    setWidgets(prevWidgets => 
      prevWidgets.map(w => 
        w.id === editingWidget.id 
          ? { 
              ...w, 
              title: widgetTitle || customMetric,
              metricId: metricId,
              metricName: metricName,
              customMetric: customMetric,
              metricDetails: metricDetails
            } 
          : w
      )
    );
    
    setEditingWidget(null);
    
    // Fetch updated data for the widget
    const updatedWidget = widgets.find(w => w.id === editingWidget.id);
    if (updatedWidget) {
      fetchWidgetData({
        ...updatedWidget,
        metricId: metricId,
        metricName: metricName,
        customMetric: customMetric,
        metricDetails: metricDetails
      });
    }
  };
  
  // Toggle metric details dialog
  const toggleMetricDetails = () => {
    setIsMetricDetailsOpen(!isMetricDetailsOpen);
  };
  
  // Render a specific widget based on its type
  const renderWidget = (widget: Widget) => {
    // For charts, use the specific chart components based on the type
    if (widget.type === CHART_SUBTYPES.PIE) {
      return <PieChartWidget widget={widget} />;
    } else if (widget.type === CHART_SUBTYPES.BAR) {
      return <BarChartWidget widget={widget} />;
    } else if (widget.type === CHART_SUBTYPES.LINE) {
      return <LineChartWidget widget={widget} />;
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
  
  // Component for displaying a pie chart
  const PieChartWidget = ({ widget }: { widget: Widget }) => {
    // This would normally use a chart library like recharts, chart.js, etc.
    return (
      <div className="flex flex-col items-center justify-center h-full py-2">
        <PieChart className={`${widget.expanded ? 'w-36 h-36' : 'w-24 h-24'} mb-2 text-blue-500 transition-all duration-300`} />
        <div className="text-sm text-center">
          {!widget.data || !widget.data.segments ? (
            "Loading data..."
          ) : (
            <div className={`grid ${widget.expanded ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mt-2 transition-all duration-300`}>
              {widget.data.segments.map((segment: any, index: number) => (
                <div key={index} className={`flex items-center ${widget.expanded ? 'text-sm' : 'text-xs'} transition-all duration-300`}>
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
  
  // Component for displaying a bar chart
  const BarChartWidget = ({ widget }: { widget: Widget }) => {
    return (
      <div className="flex flex-col items-center justify-center h-full py-2">
        <BarChart2 className={`${widget.expanded ? 'w-36 h-36' : 'w-24 h-24'} mb-2 text-green-500 transition-all duration-300`} />
        <div className={`${widget.expanded ? 'text-sm' : 'text-xs'} w-full px-2 transition-all duration-300`}>
          {!widget.data || !widget.data.bars ? (
            "Loading data..."
          ) : (
            <div className="space-y-2 w-full mt-2">
              {widget.data.bars.map((bar: any, index: number) => (
                <div key={index}>
                  <div className="flex justify-between mb-1">
                    <span>{bar.label}</span>
                    <span>{bar.value}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${bar.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Component for displaying a line chart
  const LineChartWidget = ({ widget }: { widget: Widget }) => {
    return (
      <div className="flex flex-col items-center justify-center h-full py-2">
        <svg className={`${widget.expanded ? 'w-72 h-48' : 'w-40 h-24'} transition-all duration-300`} viewBox="0 0 100 50">
          {/* Simplified line chart representation */}
          <polyline
            points="0,50 20,30 40,35 60,15 80,25 100,10"
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
          />
          {/* Add points at each vertex to enhance visualization */}
          <circle cx="0" cy="50" r="2" fill="rgb(59, 130, 246)" />
          <circle cx="20" cy="30" r="2" fill="rgb(59, 130, 246)" />
          <circle cx="40" cy="35" r="2" fill="rgb(59, 130, 246)" />
          <circle cx="60" cy="15" r="2" fill="rgb(59, 130, 246)" />
          <circle cx="80" cy="25" r="2" fill="rgb(59, 130, 246)" />
          <circle cx="100" cy="10" r="2" fill="rgb(59, 130, 246)" />
        </svg>
        <div className={`${widget.expanded ? 'text-sm' : 'text-xs'} text-center mt-2 transition-all duration-300`}>
          {!widget.data ? "Loading data..." : "Data from the last 6 months"}
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
      if (widget.metricId && typeof widget.data[widget.metricId] === 'string') {
        try {
          return JSON.parse(widget.data[widget.metricId]);
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
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        {!widget.data || widget.data.status === 'loading' ? (
          <div className="flex items-center justify-center h-full">Loading graph data...</div>
        ) : (
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <svg className="w-full h-full max-h-64" viewBox="0 0 200 200">
                {/* Sample graph visualization */}
                <circle cx="100" cy="100" r="30" fill="rgba(59, 130, 246, 0.5)" />
                <circle cx="50" cy="50" r="20" fill="rgba(16, 185, 129, 0.5)" />
                <circle cx="150" cy="50" r="20" fill="rgba(16, 185, 129, 0.5)" />
                <circle cx="50" cy="150" r="20" fill="rgba(16, 185, 129, 0.5)" />
                <circle cx="150" cy="150" r="20" fill="rgba(16, 185, 129, 0.5)" />
                
                <line x1="100" y1="100" x2="50" y2="50" stroke="rgba(75, 85, 99, 0.5)" strokeWidth="2" />
                <line x1="100" y1="100" x2="150" y2="50" stroke="rgba(75, 85, 99, 0.5)" strokeWidth="2" />
                <line x1="100" y1="100" x2="50" y2="150" stroke="rgba(75, 85, 99, 0.5)" strokeWidth="2" />
                <line x1="100" y1="100" x2="150" y2="150" stroke="rgba(75, 85, 99, 0.5)" strokeWidth="2" />
              </svg>
            </div>
            <div className="mt-2 text-sm text-center text-gray-500 dark:text-gray-400">
              {widget.data.description || "Graph visualization"}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Handle the end of a drag event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      // Find the positions of the dragged widget and the drop target
      const draggedIndex = widgets.findIndex(w => w.id === active.id);
      const dropIndex = widgets.findIndex(w => w.id === over.id);
      
      if (draggedIndex !== -1 && dropIndex !== -1) {
        // Create a new array with the widgets in the new order
        const newWidgets = [...widgets];
        const draggedWidget = newWidgets[draggedIndex];
        
        // Remove the dragged widget
        newWidgets.splice(draggedIndex, 1);
        
        // Insert it at the drop position
        newWidgets.splice(dropIndex, 0, draggedWidget);
        
        // Update the widgets array with the new order
        setWidgets(newWidgets);
      }
    }
    
    setDraggedWidgetId(null);
  };
  
  // Expand or collapse a widget with multiple size options
  const toggleWidgetSize = (widget: Widget) => {
    // If the widget parameter is an object with width and height properties,
    // this is a resize operation and we should directly update those dimensions
    if (typeof widget.width === 'number' && typeof widget.height === 'number') {
      setWidgets(prevWidgets => 
        prevWidgets.map(w => {
          if (w.id === widget.id) {
            return {
              ...w,
              width: widget.width,
              height: widget.height,
              // When manually resized, always consider it "expanded"
              expanded: widget.expanded
            };
          }
          return w;
        })
      );
      return;
    }
    
    // Otherwise, this is a toggle operation from the button
    setWidgets(prevWidgets => 
      prevWidgets.map(w => {
        if (w.id === widget.id) {
          const isCurrentlyExpanded = !!w.expanded;
          
          // Toggle between states: small -> medium -> large -> small
          if (w.width >= 3 && w.height >= 2) {
            // Large -> Small
            return {
              ...w,
              width: 2,
              height: 1,
              expanded: false
            };
          } else if (w.width === 2 && w.height === 2) {
            // Medium -> Large
            return {
              ...w,
              width: 3,
              height: 2,
              expanded: true
            };
          } else if (w.width === 2 && w.height === 1) {
            // Small -> Medium
            return {
              ...w,
              width: 2, 
              height: 2,
              expanded: true
            };
          } else {
            // Default/any other case -> Small
            return {
              ...w,
              width: 2,
              height: 1,
              expanded: false
            };
          }
        }
        return w;
      })
    );
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
        widgets,
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
      setWidgets(template.widgets);
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
            {widgets.map((widget) => (
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
          setSelectedChartSubtype(null);
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
              <label className="text-sm font-medium mb-1 block dark:text-white">Format Type</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(FORMAT_TYPES).map(([key, value]) => (
                  <Button
                    key={key}
                    variant={selectedFormatType === value ? "default" : "outline"}
                    onClick={() => {
                      setSelectedFormatType(value);
                      // Reset chart subtype if not selecting chart
                      if (value !== FORMAT_TYPES.CHART) {
                        setSelectedChartSubtype(null);
                      }
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
            
            {/* Show chart subtypes only when Chart is selected */}
            {selectedFormatType === FORMAT_TYPES.CHART && (
              <div>
                <label className="text-sm font-medium mb-1 block dark:text-white">Chart Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(CHART_SUBTYPES).map(([key, value]) => (
                    <Button
                      key={key}
                      variant={selectedChartSubtype === value ? "default" : "outline"}
                      onClick={() => setSelectedChartSubtype(value)}
                      className="justify-start"
                    >
                      {key === 'PIE' && <PieChart className="mr-2 h-4 w-4" />}
                      {key === 'BAR' && <BarChart2 className="mr-2 h-4 w-4" />}
                      {key === 'LINE' && (
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                      )}
                      {key}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
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
              disabled={
                !selectedFormatType || 
                (selectedFormatType === FORMAT_TYPES.CHART && !selectedChartSubtype) || 
                !customMetric.trim()
              }
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
  const [startWidth, setStartWidth] = useState(widget.width);
  const [startHeight, setStartHeight] = useState(widget.height);
  
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
    setStartWidth(widget.width);
    setStartHeight(widget.height);
    
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
    if (newWidth !== widget.width || newHeight !== widget.height) {
      const updatedWidget = {
        ...widget,
        width: newWidth,
        height: newHeight,
        // When manually resized, always consider it "expanded"
        expanded: newWidth > 2 || newHeight > 1
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
        ${widget.width > 1 ? `col-span-${widget.width}` : ''} 
        ${widget.height > 1 ? `row-span-${widget.height}` : ''}
        ${widget.expanded ? 'border-2 border-blue-300 dark:border-blue-700' : 'border border-gray-200 dark:border-gray-800'}
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
            title={widget.expanded ? "Collapse" : "Expand"}
          >
            {widget.expanded ? (
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
        className={`p-3 pb-6 transition-all duration-300 ease-in-out ${widget.expanded ? 'scale-105 transform-origin-center' : ''}`}
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