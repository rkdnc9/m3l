export type ChartType = 'bar' | 'line' | 'pie' | 'scatter';

export interface DataPoint {
    [key: string]: number | string | Date;
}

export interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        backgroundColor?: string | string[];
        borderColor?: string | string[];
        tension?: number;
    }[];
}