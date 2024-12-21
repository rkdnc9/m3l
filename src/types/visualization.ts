export type ChartType = 'line' | 'bar' | 'pie' | 'scatter';

export interface DataPoint {
  [key: string]: string | number | Date;
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  tension?: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface VisualizationProps {
  data: DataPoint[];
  query: string;
  className?: string;
} 