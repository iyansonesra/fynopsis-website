import { post, get, del } from 'aws-amplify/api';
// Service for fetching and processing metrics data for the diligence dashboard
// In a real implementation, this would call the backend which would use AI to generate the data

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
  metricId?: string;
  metricName?: string;
  customMetric?: string;
  metricDetails?: string;
  width: number;
  height: number;
  x: number;
  y: number;
  data?: any;
  settings?: any;
  expanded?: boolean;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  widgets: Widget[];
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
 * @returns Promise with the metric data
 */
export async function fetchMetricData(
  dataroomId: string, 
  metricId: string, 
  format: string,
  customMetric?: string,
  metricDetails?: string
): Promise<MetricData> {
  try {
    // Skip the API call that doesn't exist and directly return mock data
    console.log(`Generating mock data for metric: ${metricId}, format: ${format}, query: ${customMetric}`);
    return getMockMetricData(metricId, format, customMetric);
  } catch (error) {
    console.error('Error generating mock metric data:', error);
    
    // Return a simple error response
    return {
      id: metricId,
      timestamp: new Date().toISOString(),
      value: {
        error: 'Failed to generate data'
      },
      confidence: 0
    };
  }
}

/**
 * Gets mock data for development/demo purposes
 */
function getMockMetricData(metricId: string, format: string, customMetric?: string): MetricData {
  const now = new Date().toISOString();
  
  // For Auto mode, select the best visualization based on the metric
  if (format === 'auto') {
    if (customMetric) {
      // Try to determine best format based on custom metric
      const lowerMetric = customMetric.toLowerCase();
      
      if (lowerMetric.includes('breakdown') || lowerMetric.includes('distribution') || lowerMetric.includes('percentage')) {
        format = 'pieChart';
      } else if (lowerMetric.includes('growth') || lowerMetric.includes('trend') || lowerMetric.includes('over time')) {
        format = 'lineChart';
      } else if (lowerMetric.includes('comparison') || lowerMetric.includes('by') || lowerMetric.includes('across')) {
        format = 'barChart';
      } else if (lowerMetric.includes('table') || lowerMetric.includes('report') || lowerMetric.includes('list')) {
        format = 'table';
      } else {
        format = 'singleMetric'; // Default to single metric for unknown metrics
      }
    } else {
      // Fall back to single metric for empty custom metrics
      format = 'singleMetric';
    }
  }
  
  // Use custom metric if provided
  if (customMetric) {
    if (format === 'singleMetric') {
      return {
        id: metricId,
        timestamp: now,
        value: {
          value: getMockValue(customMetric),
          change: getMockChange(),
          isPositive: Math.random() > 0.3 // 70% chance of positive change
        },
        confidence: 0.75 + Math.random() * 0.2
      };
    } else if (format === 'pieChart') {
      return {
        id: metricId,
        timestamp: now,
        value: {
          segments: generateMockPieData(customMetric)
        },
        confidence: 0.75 + Math.random() * 0.2
      };
    } else if (format === 'barChart') {
      return {
        id: metricId,
        timestamp: now,
        value: {
          bars: generateMockBarData(customMetric)
        },
        confidence: 0.75 + Math.random() * 0.2
      };
    } else if (format === 'lineChart') {
      return {
        id: metricId,
        timestamp: now,
        value: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          values: generateMockLineData(),
          unit: customMetric.toLowerCase().includes('revenue') ? '$M' : 
                customMetric.toLowerCase().includes('percentage') ? '%' : ''
        },
        confidence: 0.75 + Math.random() * 0.2
      };
    } else if (format === 'table') {
      return {
        id: metricId,
        timestamp: now,
        value: generateMockTableData(customMetric),
        confidence: 0.75 + Math.random() * 0.2
      };
    }
  }
  
  // Original implementation for standard metrics
  switch (metricId) {
    case 'revenue':
      if (format === 'singleMetric') {
        return {
          id: metricId,
          timestamp: now,
          value: {
            value: '$10.5M',
            change: '+12%',
            isPositive: true
          },
          confidence: 0.92
        };
      } else if (format === 'lineChart') {
        return {
          id: metricId,
          timestamp: now,
          value: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            values: [8.2, 8.7, 9.1, 9.5, 10.0, 10.5],
            unit: 'M$'
          },
          confidence: 0.88
        };
      }
      break;
      
    case 'headcount':
      if (format === 'singleMetric') {
        return {
          id: metricId,
          timestamp: now,
          value: {
            value: '248',
            change: '+5%',
            isPositive: true
          },
          confidence: 0.95
        };
      } else if (format === 'barChart') {
        return {
          id: metricId,
          timestamp: now,
          value: {
            bars: [
              { label: 'Engineering', value: '85', percentage: 34 },
              { label: 'Sales', value: '67', percentage: 27 },
              { label: 'Marketing', value: '42', percentage: 17 },
              { label: 'Admin', value: '32', percentage: 13 },
              { label: 'Other', value: '22', percentage: 9 }
            ]
          },
          confidence: 0.87
        };
      }
      break;
      
    case 'growth':
      return {
        id: metricId,
        timestamp: now,
        value: {
          value: '23.4%',
          change: '+2.1%',
          isPositive: true
        },
        confidence: 0.85
      };
      
    case 'profit':
      return {
        id: metricId,
        timestamp: now,
        value: {
          value: '18.7%',
          change: '-0.5%',
          isPositive: false
        },
        confidence: 0.91
      };
      
    case 'customerCount':
      return {
        id: metricId,
        timestamp: now,
        value: {
          value: '1,248',
          change: '+15%',
          isPositive: true
        },
        confidence: 0.94
      };
      
    case 'churn':
      return {
        id: metricId,
        timestamp: now,
        value: {
          value: '3.2%',
          change: '-0.8%',
          isPositive: true
        },
        confidence: 0.89
      };
      
    case 'cac':
      return {
        id: metricId,
        timestamp: now,
        value: {
          value: '$1,250',
          change: '-5%',
          isPositive: true
        },
        confidence: 0.87
      };
      
    case 'ltv':
      return {
        id: metricId,
        timestamp: now,
        value: {
          value: '$8,500',
          change: '+12%',
          isPositive: true
        },
        confidence: 0.86
      };
      
    case 'revenueBreakdown':
      return {
        id: metricId,
        timestamp: now,
        value: {
          segments: [
            { label: 'Product A', value: 45 },
            { label: 'Product B', value: 30 },
            { label: 'Product C', value: 25 }
          ]
        },
        confidence: 0.84
      };
      
    default:
      return {
        id: metricId,
        timestamp: now,
        value: {
          value: 'N/A',
          change: '0%',
          isPositive: false
        },
        confidence: 0.5
      };
  }
  
  // Fallback
  return {
    id: metricId,
    timestamp: now,
    value: {
      value: 'N/A',
      change: '0%',
      isPositive: false
    },
    confidence: 0.5
  };
}

/**
 * Generate a mock value for a custom metric
 */
function getMockValue(customMetric: string): string {
  const lower = customMetric.toLowerCase();
  
  if (lower.includes('revenue')) {
    const value = Math.floor(5 + Math.random() * 15);
    return `$${value}.${Math.floor(Math.random() * 10)}M`;
  }
  
  if (lower.includes('headcount') || lower.includes('employees') || lower.includes('staff')) {
    return `${Math.floor(100 + Math.random() * 900)}`;
  }
  
  if (lower.includes('growth') || lower.includes('rate') || lower.includes('percentage')) {
    return `${Math.floor(5 + Math.random() * 25)}.${Math.floor(Math.random() * 10)}%`;
  }
  
  if (lower.includes('cost') || lower.includes('price')) {
    return `$${Math.floor(500 + Math.random() * 1500)}`;
  }
  
  if (lower.includes('count') || lower.includes('number')) {
    return `${Math.floor(500 + Math.random() * 5000).toLocaleString()}`;
  }
  
  // Default
  return `${Math.floor(10 + Math.random() * 90)}`;
}

/**
 * Generate a mock change percentage
 */
function getMockChange(): string {
  const isPositive = Math.random() > 0.3; // 70% positive
  const changeValue = (Math.random() * 15).toFixed(1);
  return `${isPositive ? '+' : '-'}${changeValue}%`;
}

/**
 * Generate mock pie chart data based on the custom metric
 */
function generateMockPieData(customMetric: string): { label: string, value: number }[] {
  const lower = customMetric.toLowerCase();
  let labels: string[] = [];
  
  if (lower.includes('revenue') || lower.includes('sales')) {
    labels = ['Product A', 'Product B', 'Product C', 'Other'];
  } else if (lower.includes('customer') || lower.includes('client')) {
    labels = ['Enterprise', 'Mid-market', 'SMB', 'Individual'];
  } else if (lower.includes('expense') || lower.includes('cost')) {
    labels = ['R&D', 'Marketing', 'Operations', 'G&A', 'Sales'];
  } else if (lower.includes('market')) {
    labels = ['North America', 'Europe', 'Asia', 'Rest of World'];
  } else {
    labels = ['Segment A', 'Segment B', 'Segment C', 'Other'];
  }
  
  // Generate random values that sum to 100
  let remaining = 100;
  const result: { label: string, value: number }[] = [];
  
  for (let i = 0; i < labels.length; i++) {
    if (i === labels.length - 1) {
      // Last segment gets whatever is left
      result.push({ label: labels[i], value: remaining });
    } else {
      // Random percentage, but ensure we leave some for the rest
      const maxValue = Math.min(60, remaining - (labels.length - i - 1) * 5);
      const value = Math.max(5, Math.floor(Math.random() * maxValue));
      result.push({ label: labels[i], value });
      remaining -= value;
    }
  }
  
  return result;
}

/**
 * Generate mock bar chart data based on the custom metric
 */
function generateMockBarData(customMetric: string): { label: string, value: string, percentage: number }[] {
  const lower = customMetric.toLowerCase();
  let labels: string[] = [];
  
  if (lower.includes('department') || lower.includes('headcount') || lower.includes('employee')) {
    labels = ['Engineering', 'Sales', 'Marketing', 'Admin', 'Other'];
  } else if (lower.includes('region') || lower.includes('geographic')) {
    labels = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East'];
  } else if (lower.includes('channel') || lower.includes('acquisition')) {
    labels = ['Direct', 'Partner', 'Referral', 'Organic', 'Paid'];
  } else {
    labels = ['Category A', 'Category B', 'Category C', 'Category D', 'Other'];
  }
  
  // Generate values
  const result: { label: string, value: string, percentage: number }[] = [];
  let total = 0;
  
  for (let i = 0; i < labels.length; i++) {
    const randomValue = Math.floor(10 + Math.random() * 90);
    total += randomValue;
    result.push({ 
      label: labels[i], 
      value: lower.includes('revenue') ? `$${randomValue}K` : `${randomValue}`, 
      percentage: 0 // Will be calculated after we have the total
    });
  }
  
  // Calculate percentages
  for (let item of result) {
    const numericValue = parseInt(item.value.replace(/[^0-9]/g, ''));
    item.percentage = Math.floor((numericValue / total) * 100);
  }
  
  return result;
}

/**
 * Generate mock line chart data
 */
function generateMockLineData(): number[] {
  const result: number[] = [];
  let value = 5 + Math.random() * 10;
  
  for (let i = 0; i < 6; i++) {
    result.push(parseFloat(value.toFixed(1)));
    // Random change between -20% and +30%
    const percentChange = -0.2 + Math.random() * 0.5;
    value = value * (1 + percentChange);
  }
  
  return result;
}

/**
 * Generate mock table data based on the custom metric
 */
function generateMockTableData(customMetric: string): { headers: string[], rows: any[][] } {
  const lower = customMetric.toLowerCase();
  let headers: string[] = [];
  let rows: any[][] = [];
  
  if (lower.includes('revenue') || lower.includes('sales')) {
    headers = ['Product', 'Q1', 'Q2', 'Q3', 'Q4', 'Total'];
    rows = [
      ['Product A', '$245K', '$278K', '$312K', '$356K', '$1.19M'],
      ['Product B', '$182K', '$196K', '$210K', '$228K', '$816K'],
      ['Product C', '$95K', '$120K', '$132K', '$145K', '$492K'],
      ['Services', '$87K', '$94K', '$102K', '$110K', '$393K'],
      ['Total', '$609K', '$688K', '$756K', '$839K', '$2.89M']
    ];
  } else if (lower.includes('customer') || lower.includes('client')) {
    headers = ['Segment', 'Count', 'Revenue', 'Avg. Deal Size', 'Churn'];
    rows = [
      ['Enterprise', '26', '$1.45M', '$55.8K', '2.1%'],
      ['Mid-market', '142', '$2.13M', '$15K', '3.8%'],
      ['SMB', '875', '$3.28M', '$3.75K', '5.2%'],
      ['Individual', '3,241', '$1.62M', '$500', '8.4%'],
      ['Total', '4,284', '$8.48M', '-', '4.9%']
    ];
  } else if (lower.includes('employee') || lower.includes('headcount')) {
    headers = ['Department', 'Headcount', 'Open Positions', 'Attrition', 'Avg. Tenure'];
    rows = [
      ['Engineering', '85', '12', '4.2%', '2.8 years'],
      ['Sales', '67', '8', '8.5%', '1.9 years'],
      ['Marketing', '42', '5', '6.1%', '2.2 years'],
      ['Finance', '18', '2', '2.8%', '3.5 years'],
      ['HR', '14', '3', '3.2%', '2.7 years'],
      ['Total', '226', '30', '5.3%', '2.4 years']
    ];
  } else {
    // Default generic table
    headers = ['Category', 'Value 1', 'Value 2', 'Value 3', 'Total'];
    rows = [];
    for (let i = 0; i < 5; i++) {
      rows.push([
        `Category ${String.fromCharCode(65 + i)}`, // A, B, C, etc.
        Math.floor(Math.random() * 100),
        Math.floor(Math.random() * 100),
        Math.floor(Math.random() * 100),
        '-' // Total will be calculated
      ]);
    }
    
    // Calculate totals for generic data
    rows.forEach(row => {
      const total = Number(row[1]) + Number(row[2]) + Number(row[3]);
      row[4] = total;
    });
  }
  
  return { headers, rows };
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
  
  // For demo purposes, all metrics work with all chart types
  // In a real implementation, you would filter based on compatibility
  return allMetrics;
}

export class MetricsService {
  // Save dashboard state
  static async saveDashboardState(bucketId: string, widgets: Widget[]): Promise<Widget[]> {
    try {
      const restOperation = post({
        apiName: 'S3_API',
        path: `/metrics/${bucketId}/dashboard-state`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            widgets
          })
        }
      });
      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      return response.widgets;
    } catch (error) {
      console.error('Error saving dashboard state:', error);
      throw error;
    }
  }

  // Get dashboard state
  static async getDashboardState(bucketId: string): Promise<Widget[]> {
    try {
      const restOperation = get({
        apiName: 'S3_API',
        path: `/metrics/${bucketId}/dashboard-state`
      });
      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
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