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
import { fetchMetricData, getAvailableMetrics } from './services/metricsService';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// Chart types that can be added to the dashboard
const CHART_TYPES = {
  AUTO: 'auto',
  PIE_CHART: 'pieChart',
  BAR_CHART: 'barChart',
  LINE_CHART: 'lineChart',
  SINGLE_METRIC: 'singleMetric',
  TEXT: 'text'
};

// Available metrics for selection
const AVAILABLE_METRICS = getAvailableMetrics();

// Widget for representing a chart in the dashboard
interface Widget {
  id: string;
  type: string;
  title: string;
  metricId?: string;
  metricName?: string;
  customMetric?: string; // Custom metric input by the user
  metricDetails?: string; // Additional details about the metric
  width: number;
  height: number;
  x: number;
  y: number;
  data?: any;
  settings?: any;
  expanded?: boolean; // Track expanded state
}

// Dashboard Template interface
interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  widgets: Widget[];
  createdAt: string;
  updatedAt: string;
}

// Dashboard component
export default function DiligenceDashboardViewer() {
  const params = useParams();
  const dataroomId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';
  
  // State for dashboard widgets and layout
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const [selectedWidgetType, setSelectedWidgetType] = useState<string | null>(null);
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
  
  // Load dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [dataroomId]);
  
  // Fetch dashboard data from backend
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const restOperation = get({
        apiName: 'S3_API',
        path: `/dashboard/${dataroomId}/get-dashboard`,
      });
      
      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      
      if (response.widgets) {
        setWidgets(response.widgets);
      } else {
        // Create a default dashboard if none exists
        setWidgets([
          {
            id: uuidv4(),
            type: CHART_TYPES.SINGLE_METRIC,
            title: 'Total Revenue',
            metricId: 'revenue',
            metricName: 'Revenue',
            width: 1,
            height: 1,
            x: 0,
            y: 0,
            data: {
              value: '$10.5M',
              change: '+12%',
              isPositive: true
            }
          },
          {
            id: uuidv4(),
            type: CHART_TYPES.PIE_CHART,
            title: 'Revenue Breakdown',
            metricId: 'revenueBreakdown',
            metricName: 'Revenue Breakdown',
            width: 2,
            height: 2,
            x: 1,
            y: 0,
            data: {
              segments: [
                { label: 'Product A', value: 45 },
                { label: 'Product B', value: 30 },
                { label: 'Product C', value: 25 }
              ]
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Load empty dashboard on error
      setWidgets([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save dashboard to backend
  const saveDashboard = async () => {
    try {
      const restOperation = post({
        apiName: 'S3_API',
        path: `/dashboard/${dataroomId}/save-dashboard`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            widgets: widgets
          })
        }
      });
      
      await restOperation.response;
      
      // Exit edit mode after saving
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving dashboard:', error);
    }
  };
  
  // Add a new widget to the dashboard
  const addWidget = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (!selectedWidgetType) return;
    if (!customMetric.trim()) return;
    
    const metricId = selectedMetric || '';
    const metricName = selectedMetric ? 
      AVAILABLE_METRICS.find(m => m.id === selectedMetric)?.name : 
      '';
    
    // Determine appropriate widget size based on type
    let widgetWidth = 2;    // Default width is 2 columns (small)
    let widgetHeight = 1;   // Default height is 1 row (small)
    let isExpanded = false; // Default is not expanded
    
    if (selectedWidgetType === CHART_TYPES.SINGLE_METRIC || selectedWidgetType === CHART_TYPES.TEXT) {
      // Single metrics and text are small (2x1)
      widgetWidth = 2;
      widgetHeight = 1;
    } else if (selectedWidgetType === CHART_TYPES.PIE_CHART) {
      // Pie charts start as medium (2x2)
      widgetWidth = 2;
      widgetHeight = 2;
      isExpanded = true;
    } else if (selectedWidgetType === CHART_TYPES.BAR_CHART || selectedWidgetType === CHART_TYPES.LINE_CHART) {
      // Bar and line charts are wider
      widgetWidth = 3;
      widgetHeight = 2;
      isExpanded = true;
    }
    
    // Auto type starts as medium (2x2)
    if (selectedWidgetType === CHART_TYPES.AUTO) {
      widgetWidth = 2;
      widgetHeight = 2;
      isExpanded = true;
    }
    
    const newWidget: Widget = {
      id: uuidv4(),
      type: selectedWidgetType,
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
      data: {}
    };
    
    setWidgets([...widgets, newWidget]);
    setIsAddWidgetOpen(false);
    setSelectedWidgetType(null);
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
          dataroomId, 
          widget.metricId || 'custom', 
          widget.type,
          widget.customMetric,
          widget.metricDetails
        );
      } else if (widget.metricId) {
        // Fallback to standard metrics
        data = await fetchMetricData(dataroomId, widget.metricId, widget.type);
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
    switch(widget.type) {
      case CHART_TYPES.PIE_CHART:
        return <PieChartWidget widget={widget} />;
      case CHART_TYPES.BAR_CHART:
        return <BarChartWidget widget={widget} />;
      case CHART_TYPES.LINE_CHART:
        return <LineChartWidget widget={widget} />;
      case CHART_TYPES.SINGLE_METRIC:
        return <SingleMetricWidget widget={widget} />;
      case CHART_TYPES.TEXT:
        return <TextWidget widget={widget} />;
      default:
        return <div>Unsupported widget type</div>;
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
  
  // Component for displaying a single metric
  const SingleMetricWidget = ({ widget }: { widget: Widget }) => {
    const data = widget.data || {};
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-2">
        <div className={`${widget.expanded ? 'text-4xl' : 'text-2xl'} font-bold transition-all duration-300`}>
          {data.value || "Loading..."}
        </div>
        {data.change && (
          <div className={`${widget.expanded ? 'text-lg' : 'text-sm'} ${data.isPositive ? 'text-green-500' : 'text-red-500'} transition-all duration-300`}>
            {data.change}
          </div>
        )}
      </div>
    );
  };
  
  // Component for displaying text
  const TextWidget = ({ widget }: { widget: Widget }) => {
    return (
      <div className="p-2 h-full overflow-auto py-2">
        {widget.data?.text || "Loading content..."}
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
  
  // Save the current dashboard as a template
  const saveAsTemplate = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (!templateName) return;
    
    try {
      const restOperation = post({
        apiName: 'S3_API',
        path: `/dashboard/templates/save`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: templateName,
            description: templateDescription,
            widgets: widgets,
            dataroomId: dataroomId
          })
        }
      });
      
      await restOperation.response;
      
      // Close the dialog
      setIsSaveTemplateOpen(false);
      setTemplateName('');
      setTemplateDescription('');
      
      // Show success message or notification (would implement with a toast system)
    } catch (error) {
      console.error('Error saving dashboard template:', error);
      // Show error message
    }
  };
  
  // Load available dashboard templates
  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    
    try {
      const restOperation = get({
        apiName: 'S3_API',
        path: `/dashboard/templates/list`,
      });
      
      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      
      if (response.templates) {
        setAvailableTemplates(response.templates);
      } else {
        // Mock templates for demonstration
        setAvailableTemplates([
          {
            id: '1',
            name: 'Financial Overview',
            description: 'Key financial metrics in a simple layout',
            widgets: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: '2',
            name: 'Growth Metrics',
            description: 'Focus on customer and revenue growth',
            widgets: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: '3',
            name: 'Operational Dashboard',
            description: 'Headcount and operational efficiency',
            widgets: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      // Mock templates for demonstration
      setAvailableTemplates([
        {
          id: '1',
          name: 'Financial Overview',
          description: 'Key financial metrics in a simple layout',
          widgets: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Growth Metrics',
          description: 'Focus on customer and revenue growth',
          widgets: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };
  
  // Apply a template to the current dashboard
  const applyTemplate = async (templateId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    try {
      const restOperation = get({
        apiName: 'S3_API',
        path: `/dashboard/templates/${templateId}`,
      });
      
      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      
      if (response.template && response.template.widgets) {
        // Confirm with the user before replacing current dashboard
        if (widgets.length > 0) {
          if (!confirm('This will replace your current dashboard. Continue?')) {
            return;
          }
        }
        
        // Apply the template
        setWidgets(response.template.widgets);
        setIsLoadTemplateOpen(false);
        
        // Fetch data for all widgets
        response.template.widgets.forEach((widget: Widget) => {
          fetchWidgetData(widget);
        });
      }
    } catch (error) {
      console.error('Error applying template:', error);
      // Show error message
    }
  };
  
  // Handler functions with stopPropagation to ensure button clicks work
  const handleSaveAsTemplate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent any default behavior
    setIsSaveTemplateOpen(true);
  }, []);

  const handleCancelEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsEditing(false);
  }, []);

  const handleSaveDashboard = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    saveDashboard();
  }, [widgets]); // Depend on widgets array to ensure we save the latest state

  const handleStartEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsEditing(true);
  }, []);

  const handleLoadTemplates = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    loadTemplates();
    setIsLoadTemplateOpen(true);
  }, []);
  
  return (
    <div className="flex-1 p-4 overflow-auto h-full" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Diligence Dashboard</h1>
        <div className="flex gap-2" style={{ position: 'relative', zIndex: 40 }}>
          <Button 
            variant="outline" 
            onClick={handleLoadTemplates}
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
                onClick={handleSaveAsTemplate}
                className="flex items-center gap-2 relative"
                style={{ zIndex: 40, pointerEvents: 'auto' }}
              >
                <Save className="h-4 w-4" />
                <span>Save as Template</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancelEditing}
                className="relative"
                style={{ zIndex: 40, pointerEvents: 'auto' }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveDashboard}
                className="bg-blue-600 hover:bg-blue-700 text-white relative"
                style={{ zIndex: 40, pointerEvents: 'auto' }}
              >
                Save Dashboard
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleStartEditing}
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
          setSelectedWidgetType(null);
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
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CHART_TYPES).map(([key, value]) => (
                  <Button
                    key={key}
                    variant={selectedWidgetType === value ? "default" : "outline"}
                    onClick={() => setSelectedWidgetType(value)}
                    className="justify-start"
                  >
                    {key === 'AUTO' && <Circle className="mr-2 h-4 w-4" />}
                    {key === 'PIE_CHART' && <PieChart className="mr-2 h-4 w-4" />}
                    {key === 'BAR_CHART' && <BarChart2 className="mr-2 h-4 w-4" />}
                    {key === 'LINE_CHART' && (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                    )}
                    {key === 'SINGLE_METRIC' && <Circle className="mr-2 h-4 w-4" />}
                    {key === 'TEXT' && (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" />
                        <line x1="3" y1="12" x2="3.01" y2="12" />
                        <line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                    )}
                    {key.replace(/_/g, ' ')}
                  </Button>
                ))}
              </div>
            </div>
            
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
                setIsAddWidgetOpen(false);
              }}
              className="dark:bg-transparent dark:text-white dark:hover:bg-gray-800 z-10"
            >
              Cancel
            </Button>
            <Button 
              onClick={addWidget}
              disabled={!selectedWidgetType || !customMetric.trim()}
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
      <Dialog open={isSaveTemplateOpen} onOpenChange={(open) => {
        if (!open) {
          setTemplateName('');
          setTemplateDescription('');
        }
        setIsSaveTemplateOpen(open);
      }}>
        <DialogContent className="dark:bg-darkbg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Save Dashboard Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-white">Template Name</label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name"
                className="dark:bg-darkbg dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-white">Description (Optional)</label>
              <Input
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Enter template description"
                className="dark:bg-darkbg dark:text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                setIsSaveTemplateOpen(false);
              }}
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
      <Dialog open={isLoadTemplateOpen} onOpenChange={(open) => {
        setIsLoadTemplateOpen(open);
      }}>
        <DialogContent className="dark:bg-darkbg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Load Dashboard Template</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {isLoadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {availableTemplates.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400">No templates available</p>
                ) : (
                  availableTemplates.map((template) => (
                    <Card 
                      key={template.id} 
                      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" 
                      onClick={(e) => {
                        e.stopPropagation();
                        applyTemplate(template.id);
                      }}
                    >
                      <div className="font-medium">{template.name}</div>
                      {template.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">{template.description}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        Last updated: {new Date(template.updatedAt).toLocaleDateString()}
                      </div>
                    </Card>
                  ))
                )}
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
  
  // Combine both refs for the main widget container
  const setRefs = (element: HTMLElement | null) => {
    setNodeRef(element);
    setDroppableNodeRef(element);
  };
  
  const style = transform ? {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1
  } : {
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1
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
  
  return (
    <Card 
      ref={setRefs}
      style={style}
      className={`p-0 shadow-md relative transition-all duration-300 ease-in-out
        ${widget.width > 1 ? `col-span-${widget.width}` : ''} 
        ${widget.height > 1 ? `row-span-${widget.height}` : ''}
        ${widget.expanded ? 'border-2 border-blue-300 dark:border-blue-700' : 'border border-gray-200 dark:border-gray-800'}
        overflow-hidden
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
    </Card>
  );
} 