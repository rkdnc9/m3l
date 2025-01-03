import type { Chart as ChartJS } from 'chart.js';

export interface ThemeColors {
    primary: string;
    background: string;
}

export class ThemeService {
    private static themeColors = {
        'purple': {
            primary: 'rgb(149, 76, 233)',
            background: 'rgba(149, 76, 233, 0.2)'
        },
        'amber': {
            primary: 'rgb(251, 191, 36)',
            background: 'rgba(251, 191, 36, 0.2)'
        },
        'white': {
            primary: 'rgb(107, 114, 128)',
            background: 'rgba(107, 114, 128, 0.2)'
        }
    };

    static getCurrentTheme(): string {
        return localStorage.getItem('theme') || 'purple';
    }

    static getThemeColors(): ThemeColors {
        const activeTheme = this.getCurrentTheme();
        return this.themeColors[activeTheme as keyof typeof this.themeColors] || this.themeColors.purple;
    }

    static updateChartTheme(chart: ChartJS, theme: string): void {
        const colors = this.themeColors[theme as keyof typeof this.themeColors];
        const textColor = theme === 'white' ? '#1a1a1a' : '#ffffff';
        
        // Update dataset colors
        if (chart.data.datasets) {
            chart.data.datasets.forEach(dataset => {
                dataset.backgroundColor = colors.background;
                dataset.borderColor = colors.primary;
            });
        }

        // Update text colors and grid
        if (chart.options && chart.options.scales) {
            if (chart.options.scales.y) {
                chart.options.scales.y.ticks = { ...chart.options.scales.y.ticks, color: textColor };
                chart.options.scales.y.grid = { 
                    ...chart.options.scales.y.grid, 
                    color: theme === 'white' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
                };
                // Set axis color
                (chart.options.scales.y as any).border = { display: true, color: textColor };
            }
            if (chart.options.scales.x) {
                chart.options.scales.x.ticks = { ...chart.options.scales.x.ticks, color: textColor };
                chart.options.scales.x.grid = { 
                    ...chart.options.scales.x.grid, 
                    color: theme === 'white' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
                };
                // Set axis color
                (chart.options.scales.x as any).border = { display: true, color: textColor };
            }
        }

        // Update global color
        if (chart.options) {
            chart.options.color = textColor;
        }

        chart.update();
    }
}