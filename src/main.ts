import { DuckDBHandler } from './duckdb';
import { LLMHandler } from './llm';
import html2pdf from 'html2pdf.js';
import { detectVisualizationIntent } from './utils/visualizationUtils';
import { Chart as ChartJS } from 'chart.js/auto';
import {
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
);

// Add this function at the top level of your file, before any other functions
function getThemeColor(): { primary: string; background: string } {
    // Look for the active theme button instead of data-theme attribute
    const activeThemeButton = document.querySelector('.color-option.active');
    const theme = activeThemeButton?.getAttribute('data-theme') || 'purple';
    console.log('Current theme:', theme);

    const themeColors = {
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
    
    const colors = themeColors[theme as keyof typeof themeColors] || themeColors.purple;
    console.log('Using colors:', colors);
    return colors;
}

class App {
    private duckdb: DuckDBHandler;
    private llm: LLMHandler | null = null;
    private schema: string = '';

    constructor() {
        this.duckdb = new DuckDBHandler();
        this.initializeApp();
        this.showHelpModal();
        this.setupThemeSelector();
    }

    private async initializeApp() {
        await this.duckdb.initialize();
        this.setupEventListeners();
    }

    private setupEventListeners() {
        const uploadBtn = document.getElementById('upload-btn') as HTMLButtonElement;
        const submitBtn = document.getElementById('submit-query') as HTMLButtonElement;
        const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
        const providerSelect = document.getElementById('api-provider') as HTMLSelectElement;
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        const fileSection = document.querySelector('.file-section') as HTMLElement;
        const fileName = document.querySelector('.file-name') as HTMLElement;

        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
        submitBtn.addEventListener('click', () => this.handleQuery());
        
        // Update LLM handler immediately if API key is present
        if (apiKeyInput.value) {
            this.llm = new LLMHandler(
                apiKeyInput.value,
                providerSelect.value as 'openai' | 'claude'
            );
        }

        // Listen for changes in API key
        apiKeyInput.addEventListener('input', () => {
            if (apiKeyInput.value) {
                this.llm = new LLMHandler(
                    apiKeyInput.value,
                    providerSelect.value as 'openai' | 'claude'
                );
            } else {
                this.llm = null;
            }
        });

        // Listen for changes in provider
        providerSelect.addEventListener('change', () => {
            if (apiKeyInput.value) {
                this.llm = new LLMHandler(
                    apiKeyInput.value,
                    providerSelect.value as 'openai' | 'claude'
                );
            }
        });

        // Help modal functionality
        const helpIcon = document.querySelector('.help-icon') as HTMLButtonElement;
        const helpModal = document.querySelector('.help-modal') as HTMLDivElement;
        const closeHelp = document.querySelector('.close-help') as HTMLButtonElement;

        // Show modal on help icon click
        helpIcon?.addEventListener('click', () => {
            helpModal?.removeAttribute('hidden');
        });

        // Close modal on close button click
        closeHelp?.addEventListener('click', () => {
            helpModal?.setAttribute('hidden', '');
        });

        // Close modal on backdrop click
        helpModal?.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.setAttribute('hidden', '');
            }
        });

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !helpModal?.hasAttribute('hidden')) {
                helpModal?.setAttribute('hidden', '');
            }
        });

        // Handle file selection
        fileInput.addEventListener('change', async (event) => {
            const target = event.target as HTMLInputElement;
            if (target.files && target.files[0]) {
                try {
                    this.schema = await this.duckdb.loadFile(target.files[0]);
                    fileName.textContent = target.files[0].name;
                    fileSection.classList.add('has-file');
                    this.showToast('File loaded successfully');
                } catch (error) {
                    fileName.textContent = 'No file selected';
                    fileSection.classList.remove('has-file');
                    this.showToast(`Error loading file: ${error}`);
                    console.error('File loading error:', error);
                }
            } else {
                fileName.textContent = 'No file selected';
                fileSection.classList.remove('has-file');
            }
        });

        const textarea = document.getElementById('nl-query') as HTMLTextAreaElement;
        const shortcutCheckbox = document.getElementById('enable-shortcut') as HTMLInputElement;
        const submitButton = document.getElementById('submit-query') as HTMLButtonElement;
        
        // Save checkbox state to localStorage
        shortcutCheckbox.addEventListener('change', () => {
            localStorage.setItem('enableShortcut', shortcutCheckbox.checked.toString());
        });

        // Load saved checkbox state
        const savedShortcutState = localStorage.getItem('enableShortcut');
        if (savedShortcutState !== null) {
            shortcutCheckbox.checked = savedShortcutState === 'true';
        }

        // Handle keyboard shortcuts
        textarea.addEventListener('keydown', async (e) => {
            if (!shortcutCheckbox.checked) return;
            
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            
            // Check for both Command+Enter (Mac) and Ctrl+Enter (Windows)
            // Also allow plain Enter if checkbox is checked
            const shouldTrigger = e.key === 'Enter' && (
                (!isMac && !e.shiftKey) || // Windows/Linux: Enter without shift
                (isMac && (e.metaKey || !e.shiftKey)) // Mac: Command+Enter or Enter without shift
            );

            if (shouldTrigger) {
                e.preventDefault();
                submitButton.click(); // Trigger the button click event
            }
        });

        const exportButton = document.getElementById('export-pdf');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportToPDF());
        }
    }

    private async handleQuery() {
        if (!this.schema) {
            this.showToast('Please load a file first');
            return;
        }

        const queryInput = document.getElementById('nl-query') as HTMLTextAreaElement;
        const query = queryInput.value;

        if (!query) {
            this.showToast('Please enter a query');
            return;
        }

        if (!this.llm) {
            this.showToast('Please enter an API key');
            return;
        }

        try {
            const shouldVisualize = detectVisualizationIntent(query);
            console.log('Question:', query);
            console.log('Should visualize:', shouldVisualize);

            const sqlQuery = await this.llm.getNLToSQL(this.schema, query);
            console.log('SQL Query:', sqlQuery);

            const results = await this.duckdb.executeQuery(sqlQuery);
            console.log('Query Results:', results);

            const resultsContainer = document.querySelector('.results-container');
            if (!resultsContainer) {
                console.error('Results container not found');
                return;
            }

            // Create a new result block
            const resultBlock = document.createElement('div');
            resultBlock.className = 'result-block';

            // Add question display
            const questionDisplay = document.createElement('div');
            questionDisplay.className = 'question-display';
            questionDisplay.textContent = query;
            resultBlock.appendChild(questionDisplay);

            if (shouldVisualize) {
                console.log('Attempting to create visualization...');
                
                // Create canvas for chart
                const canvas = document.createElement('canvas');
                resultBlock.appendChild(canvas);
                
                const activeThemeButton = document.querySelector('.color-option.active');
                const theme = activeThemeButton?.getAttribute('data-theme') || 'purple';
                console.log('Theme:', theme);
                const currentTheme = getThemeColor();
                
                // Extract labels and values from results
                const labels = results.map(row => Object.values(row)[0].toString());
                const values = results.map(row => Number(Object.values(row)[1]));

                const chartConfig = {
                    type: 'bar' as const,
                    data: {
                        labels: labels,
                        datasets: [{
                            label: query,
                            data: values,
                            backgroundColor: currentTheme.background,
                            borderColor: currentTheme.primary,
                            borderWidth: 2,
                            borderRadius: 8,
                            barThickness: 'flex',
                            maxBarThickness: 50,
                            barPercentage: 0.8
                        }]
                    },
                    options: {
                        color: theme === 'white' ? '#1a1a1a' : '#ffffff',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false,
                                labels: {
                                    color: theme === 'white' ? '#1a1a1a' : '#ffffff'
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                border: {
                                    color: theme === 'white' ? '#1a1a1a' : '#ffffff'
                                },
                                grid: {
                                    color: theme === 'white' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                                },
                                ticks: {
                                    color: theme === 'white' ? '#1a1a1a' : '#ffffff',
                                    font: {
                                        family: "'Inter', sans-serif",
                                        size: 12,
                                        weight: '500'
                                    }
                                }
                            },
                            x: {
                                border: {
                                    color: theme === 'white' ? '#1a1a1a' : '#ffffff'
                                },
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    color: theme === 'white' ? '#1a1a1a' : '#ffffff',
                                    font: {
                                        family: "'Inter', sans-serif",
                                        size: 12,
                                        weight: '500'
                                    }
                                }
                            }
                        }
                    }
                };

                new ChartJS(canvas, chartConfig);
            } else {
                console.log('Creating table view...');
                const table = this.createResultsTable(results);
                resultBlock.appendChild(table);
            }

            // Add the new result block and scroll to it
            resultsContainer.appendChild(resultBlock);
            resultsContainer.scrollTop = resultsContainer.scrollHeight;

            // Clear the query input
            queryInput.value = '';
            
        } catch (error) {
            this.showToast(`Error executing query: ${error}`);
            console.error('Query execution error:', error);
        }
    }

    private createResultsTable(results: any[]): HTMLTableElement {
        const table = document.createElement('table');
        
        // Create header row
        const headers = Object.keys(results[0]);
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        // Create data rows
        results.forEach(row => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                td.textContent = row[header]?.toString() ?? '';
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });

        return table;
    }

    private showToast(message: string) {
        // Remove existing toast if present
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Remove toast after animation completes
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    private showHelpModal() {
        const helpModal = document.querySelector('.help-modal') as HTMLElement;
        if (helpModal) {
            helpModal.removeAttribute('hidden');
        }

        // Add event listener for closing modal if not already added
        const closeHelp = document.querySelector('.close-help') as HTMLElement;
        if (closeHelp) {
            closeHelp.addEventListener('click', () => {
                helpModal.setAttribute('hidden', '');
            });
        }

        // Close on backdrop click
        helpModal?.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.setAttribute('hidden', '');
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !helpModal?.hasAttribute('hidden')) {
                helpModal?.setAttribute('hidden', '');
            }
        });
    }

    private setupThemeSelector() {
        const colorOptions = document.querySelectorAll('.color-option');
        const body = document.body;

        // Set initial theme
        const currentTheme = localStorage.getItem('theme') || 'purple';
        body.className = `theme-${currentTheme}`;
        document.querySelector(`.color-option.${currentTheme}`)?.classList.add('active');

        colorOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const theme = target.dataset.theme;
                
                // Remove active class from all options
                colorOptions.forEach(opt => opt.classList.remove('active'));
                
                // Add active class to selected option
                target.classList.add('active');
                
                // Apply theme
                body.className = `theme-${theme}`;
                
                // Save theme preference
                if (theme) {
                    localStorage.setItem('theme', theme);
                }

                // Update all charts with new theme colors
                const charts = document.querySelectorAll('canvas');
                charts.forEach(canvas => {
                    const chart = ChartJS.getChart(canvas);
                    if (chart) {
                        const themeColors = getThemeColor();
                        chart.data.datasets[0].backgroundColor = themeColors.background;
                        chart.data.datasets[0].borderColor = themeColors.primary;
                        
                        // Update text colors
                        chart.options.color = theme === 'white' ? '#1a1a1a' : '#ffffff';
                        if (chart.options.scales?.y) {
                            chart.options.scales.y.ticks.color = theme === 'white' ? '#1a1a1a' : '#ffffff';
                            chart.options.scales.y.border.color = theme === 'white' ? '#1a1a1a' : '#ffffff';
                            chart.options.scales.y.grid.color = theme === 'white' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
                        }
                        if (chart.options.scales?.x) {
                            chart.options.scales.x.ticks.color = theme === 'white' ? '#1a1a1a' : '#ffffff';
                            chart.options.scales.x.border.color = theme === 'white' ? '#1a1a1a' : '#ffffff';
                        }
                        chart.update();
                    }
                });
            });
        });
    }

    private async exportToPDF() {
        const resultsContainer = document.querySelector('.results-container');
        if (!resultsContainer) return;

        // Wait for charts to render
        await new Promise(resolve => setTimeout(resolve, 100));

        const opt = {
            margin: 1,
            filename: 'results.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: false
            },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(resultsContainer).save();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});

export default App;