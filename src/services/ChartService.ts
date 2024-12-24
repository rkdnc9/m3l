import { ChartConfiguration } from 'chart.js';
import { ThemeService } from './ThemeService';

export class ChartService {
    static createChartConfig(labels: string[], values: number[], query: string): ChartConfiguration {
        const theme = ThemeService.getCurrentTheme();
        const colors = ThemeService.getThemeColors();
        const textColor = theme === 'white' ? '#1a1a1a' : '#ffffff';

        return {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: query,
                    data: values,
                    backgroundColor: colors.background,
                    borderColor: colors.primary,
                    borderWidth: 2,
                    borderRadius: 8,
                    barThickness: 'flex',
                    maxBarThickness: 50,
                    barPercentage: 0.8
                }]
            },
            options: {
                color: textColor,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                        labels: { color: textColor }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        border: { color: textColor },
                        grid: {
                            color: theme === 'white' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                        },
                        ticks: {
                            color: textColor,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12,
                                weight: 500
                            }
                        }
                    },
                    x: {
                        border: { color: textColor },
                        grid: { display: false },
                        ticks: {
                            color: textColor,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12,
                                weight: 500
                            }
                        }
                    }
                }
            }
        };
    }
}