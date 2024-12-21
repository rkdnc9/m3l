import { ChartType, DataPoint, ChartData } from '../../types/visualization';

export function detectVisualizationIntent(question: string): boolean {
  const visualizationKeywords = [
    'graph',
    'plot',
    'chart',
    'visualize',
    'visualization',
    'show me',
    'display',
    'trend',
    'distribution'
  ];
  
  const questionLower = question.toLowerCase();
  const hasVisualizationKeyword = visualizationKeywords.some(keyword => 
    questionLower.includes(keyword)
  );
  
  console.log('Question:', question);
  console.log('Contains visualization keyword:', hasVisualizationKeyword);
  
  return hasVisualizationKeyword;
}

export function determineChartType(data: DataPoint[], query: string): ChartType {
  const q = query.toLowerCase();
  
  // Check for specific chart requests in query
  if (q.includes('pie chart') || q.includes('distribution')) return 'pie';
  if (q.includes('line graph') || q.includes('trend')) return 'line';
  if (q.includes('scatter plot')) return 'scatter';
  if (q.includes('bar graph') || q.includes('bar chart')) return 'bar';

  // Analyze data structure if no specific chart type requested
  if (data.length > 0) {
    // Time series detection
    if (data.every(item => 
      Object.values(item).some(val => val instanceof Date || isDateString(val))
    )) {
      return 'line';
    }

    // Categorical data with few items
    if (data.length <= 8 && Object.keys(data[0]).length === 2) {
      return 'pie';
    }

    // Multiple numeric columns
    if (Object.values(data[0]).filter(val => typeof val === 'number').length > 1) {
      return 'bar';
    }
  }

  return 'bar';
}

function isDateString(value: any): boolean {
  if (typeof value !== 'string') return false;
  return !isNaN(Date.parse(value));
}

export function formatChartData(data: DataPoint[], chartType: ChartType): ChartData {
  const keys = Object.keys(data[0]);
  const numericKeys = keys.filter(key => 
    typeof data[0][key] === 'number'
  );
  const labelKey = keys.find(key => !numericKeys.includes(key)) || keys[0];

  const colors = generateColors(numericKeys.length);

  switch (chartType) {
    case 'pie':
      return {
        labels: data.map(item => String(item[labelKey])),
        datasets: [{
          data: data.map(item => Number(item[numericKeys[0]])),
          backgroundColor: colors,
          borderColor: colors,
        }]
      };

    case 'line':
      return {
        labels: data.map(item => String(item[labelKey])),
        datasets: numericKeys.map((key, index) => ({
          label: key,
          data: data.map(item => Number(item[key])),
          borderColor: colors[index],
          tension: 0.1
        }))
      };

    case 'scatter':
      return {
        labels: data.map(item => String(item[labelKey])),
        datasets: [{
          label: numericKeys[0],
          data: data.map(item => Number(item[numericKeys[0]])),
          backgroundColor: colors[0]
        }]
      };

    case 'bar':
    default:
      return {
        labels: data.map(item => String(item[labelKey])),
        datasets: numericKeys.map((key, index) => ({
          label: key,
          data: data.map(item => Number(item[key])),
          backgroundColor: colors[index]
        }))
      };
  }
}

function generateColors(count: number): string[] {
  const baseColors = [
    '#FF6384',
    '#36A2EB',
    '#FFCE56',
    '#4BC0C0',
    '#9966FF',
    '#FF9F40'
  ];

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  // Generate additional colors if needed
  const colors = [...baseColors];
  for (let i = baseColors.length; i < count; i++) {
    colors.push(`hsl(${(i * 137.508) % 360}, 70%, 60%)`);
  }
  return colors;
} 