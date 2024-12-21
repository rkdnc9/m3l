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

    static updateChartTheme(chart: Chart, theme: string): void {
        const colors = this.getThemeColors();
        const textColor = theme === 'white' ? '#1a1a1a' : '#ffffff';
        
        chart.data.datasets[0].backgroundColor = colors.background;
        chart.data.datasets[0].borderColor = colors.primary;
        chart.options.color = textColor;
        
        if (chart.options.scales?.y) {
            chart.options.scales.y.ticks.color = textColor;
            chart.options.scales.y.border.color = textColor;
            chart.options.scales.y.grid.color = theme === 'white' 
                ? 'rgba(0, 0, 0, 0.1)' 
                : 'rgba(255, 255, 255, 0.1)';
        }
        if (chart.options.scales?.x) {
            chart.options.scales.x.ticks.color = textColor;
            chart.options.scales.x.border.color = textColor;
        }
        chart.update();
    }
} 