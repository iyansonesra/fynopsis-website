import { post, get, del } from 'aws-amplify/api';
// Service for fetching and processing metrics data for the diligence dashboard

export interface Metric {
  id: string;
  name: string;
  description: string;
}

export interface MetricData {
  id: string;
  value: any;
  timestamp: string;
  source?: string;
  confidence?: number;
}

export interface Widget {
  id: string;
  type: string;
  title: string;
  metricName: string;
  extraDetails?: string;
  // Properties for different visualization types
  tableCols?: string[];
  // Chart-specific properties
  chartType?: string;
  xAxis?: string;
  yAxis?: string;
  series1?: string;
  series2?: string;
  categories?: string[];
  values?: string;
  chartDescription?: string;
  // Line chart specific
  timeSeries?: boolean;
  showPoints?: boolean;
  // Bar chart specific
  stacked?: boolean;
  horizontal?: boolean;
  // Pie chart specific
  donut?: boolean;
  showPercentages?: boolean;
  // Graph specific
  graphLayout?: string;
  positionData: {
    width: number;
    height: number;
    x: number;
    y: number;
    expanded?: boolean;
  };
  data?: any;
  formatParams?: Record<string, any>;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  widgets: Widget[];  // Keep this as array for backward compatibility
  dataroomId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetches metrics data from the AI backend
 * 
 * @param dataroomId The ID of the dataroom
 * @param metricId The ID of the metric to fetch
 * @param format The desired format of the data (e.g., 'pieChart', 'barChart')
 * @param customMetric Optional custom metric text
 * @param metricDetails Optional additional details for the AI
 * @param formatParams Optional additional parameters for formatting the response
 * @returns Promise with the metric data
 */
export async function fetchMetricData(
  dataroomId: string, 
  metricId: string, 
  format: string,
  customMetric?: string,
  metricDetails?: string,
  formatParams?: Record<string, any>
): Promise<MetricData> {
  try {
    // Make API call to backend to get real data
    // For now, return empty data structure
    return {
      id: metricId,
      timestamp: new Date().toISOString(),
      value: {},
      confidence: 0
    };
  } catch (error) {
    console.error('Error fetching metric data:', error);
    
    // Return a simple error response
    return {
      id: metricId,
      timestamp: new Date().toISOString(),
      value: {
        error: 'Failed to fetch data'
      },
      confidence: 0
    };
  }
}

/**
 * Gets available metrics for the dashboard
 */
export function getAvailableMetrics(): Metric[] {
  return [
    { id: 'revenue', name: 'Revenue', description: 'Total company revenue' },
    { id: 'headcount', name: 'Headcount', description: 'Total employee count' },
    { id: 'growth', name: 'Growth Rate', description: 'Year-over-year growth percentage' },
    { id: 'profit', name: 'Profit Margin', description: 'Profit as percentage of revenue' },
    { id: 'customerCount', name: 'Customer Count', description: 'Total number of customers' },
    { id: 'churn', name: 'Churn Rate', description: 'Customer churn percentage' },
    { id: 'cac', name: 'Customer Acquisition Cost', description: 'Cost to acquire new customers' },
    { id: 'ltv', name: 'Lifetime Value', description: 'Average revenue per customer' },
    { id: 'revenueBreakdown', name: 'Revenue Breakdown', description: 'Revenue by product/service' },
  ];
}

/**
 * Gets metrics that can be displayed in a specific chart format
 */
export function getCompatibleMetrics(chartType: string): Metric[] {
  const allMetrics = getAvailableMetrics();
  return allMetrics;
}

export class MetricsService {
  // Save dashboard state
  static async saveDashboardState(bucketId: string, widgets: Record<string, Widget>): Promise<any> {
    try {
      console.log('Saving dashboard state for bucket:', bucketId);
      
      // Convert widgets object to array
      const widgetsArray = Object.values(widgets);
      
      // Ensure each widget has proper format parameters
      widgetsArray.forEach(widget => {
        // Add formatParams if not present
        if (!widget.formatParams) {
          const formatParams: Record<string, any> = {
            format_type: widget.type
          };
          
          // Only add parameters that have values
          if (widget.title) formatParams.title = widget.title;
          if (widget.extraDetails) formatParams.description = widget.extraDetails;
          
          // Add type-specific parameters
          if (widget.type === 'table') {
            if (widget.tableCols && widget.tableCols.length > 0) {
              formatParams.table_columns = widget.tableCols;
            }
          } else if (widget.type === 'chart') {
            // Chart specific parameters - only add if they have values
            if (widget.chartType) formatParams.chart_type = widget.chartType;
            if (widget.xAxis) formatParams.x_axis = widget.xAxis;
            if (widget.yAxis) formatParams.y_axis = widget.yAxis;
            if (widget.series1) formatParams.series_1 = widget.series1;
            if (widget.series2) formatParams.series_2 = widget.series2;
            if (widget.categories && widget.categories.length > 0) formatParams.categories = widget.categories;
            if (widget.values) formatParams.values = widget.values;
            if (widget.chartDescription) formatParams.chart_description = widget.chartDescription;
            
            // Boolean flags for specific chart types - only add if they're true
            if (widget.chartType === 'line') {
              if (widget.timeSeries === true) formatParams.time_series = true;
              if (widget.showPoints === true) formatParams.show_points = true;
            } else if (widget.chartType === 'bar') {
              if (widget.stacked === true) formatParams.stacked = true;
              if (widget.horizontal === true) formatParams.horizontal = true;
            } else if (widget.chartType === 'pie') {
              if (widget.donut === true) formatParams.donut = true;
              if (widget.showPercentages === true) formatParams.show_percentages = true;
            }
          } else if (widget.type === 'graph') {
            if (widget.graphLayout) formatParams.graph_layout = widget.graphLayout;
          }
          
          widget.formatParams = formatParams;
        }
      });
      
      // Log what we're sending to help debug
      console.log('Sending widgets array:', JSON.stringify(widgetsArray).substring(0, 200) + '...');
      
      const response = await post({
        apiName: 'S3_API',
        path: `/metrics/${bucketId}/dashboard-state`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dataroomId: bucketId,
            widgets: widgetsArray
          })
        }
      });
      
      const { body } = await response.response;
      const responseText = await body.text();

      console.log("posting dashboard state: ", responseText);
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error saving dashboard state:', error);
      throw error;
    }
  }

  // Get dashboard state
  static async getDashboardState(bucketId: string): Promise<Record<string, Widget>> {
    try {
      const restOperation = get({
        apiName: 'S3_API',
        path: `/metrics/${bucketId}/dashboard-state`
      });
      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      console.log("getting dashboard state: ", response);

      return response.widgets;
    } catch (error) {
      console.error('Error getting dashboard state:', error);
      throw error;
    }
  }

  // Save dashboard template
  static async saveDashboardTemplate(
    name: string,
    description: string,
    widgets: Widget[],
    dataroomId: string
  ): Promise<string> {
    try {
      const restOperation = post({
        apiName: 'S3_API',
        path: '/metrics/templates',
        options: {
          body: JSON.stringify({
            name,
            description,
            widgets,
            dataroomId
          })
        }
      });
      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      return response.templateId;
    } catch (error) {
      console.error('Error saving dashboard template:', error);
      throw error;
    }
  }

  // List dashboard templates
  static async listDashboardTemplates(): Promise<DashboardTemplate[]> {
    try {
      const restOperation = get({
        apiName: 'S3_API',
        path: '/metrics/templates'
      });
      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      return response.templates;
    } catch (error) {
      console.error('Error listing dashboard templates:', error);
      throw error;
    }
  }

  // Get dashboard template
  static async getDashboardTemplate(templateId: string): Promise<DashboardTemplate> {
    try {
      const restOperation = get({
        apiName: 'S3_API',
        path: `/metrics/templates/${templateId}`
      });
      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      return response.template;
    } catch (error) {
      console.error('Error getting dashboard template:', error);
      throw error;
    }
  }

  // Delete dashboard template
  static async deleteDashboardTemplate(templateId: string): Promise<void> {
    try {
      const restOperation = del({
        apiName: 'S3_API',
        path: `/metrics/templates/${templateId}`
      });
      await restOperation.response;
    } catch (error) {
      console.error('Error deleting dashboard template:', error);
      throw error;
    }
  }
} 