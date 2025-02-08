import { DuckDBHandler } from './duckdb';
import { LLMHandler } from './llm';
import { detectVisualizationIntent } from './utils/visualizationUtils';
import { Chart as ChartJS, ChartConfiguration } from 'chart.js/auto';
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
import { ThemeService } from './services/ThemeService';
import { ModalService } from './services/ModalService';
import { ChartService } from './services/ChartService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SettingsService } from './services/SettingsService';
import { VoiceService } from './services/VoiceService';

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

class App {
    private duckdb: DuckDBHandler;
    private llm: LLMHandler | null = null;
    private schema: string = '';
    private pendingTables: Array<{ name: string, data: string }> | null = null;

    constructor() {
        // Add iframe-specific styles
        if (window.self !== window.top) {
            document.body.classList.add('in-iframe');
            // Explicitly hide the mobile query button
            const mobileQueryBtn = document.getElementById('mobile-query-btn');
            if (mobileQueryBtn) {
                mobileQueryBtn.remove(); // Remove it completely when in iframe
            }
        }
        
        this.duckdb = new DuckDBHandler();
        this.initializeApp();
        this.setupThemeSelector();
        ModalService.setupModal('.help-modal', '.close-help');
        SettingsService.setupSettingsModal();
        
        // Show help modal on first visit
        if (!localStorage.getItem('hasVisited')) {
            const helpModal = document.querySelector('.help-modal') as HTMLElement;
            if (helpModal) {
                helpModal.removeAttribute('hidden');
            }
            localStorage.setItem('hasVisited', 'true');
        }

        // Add message listener for table data
        if (window.self !== window.top) {
            console.log('App running in iframe, setting up message listener');
            window.addEventListener('message', async (event) => {
                console.log('Received message in iframe:', event.data);
                if (event.data.type === 'LOAD_TABLES') {
                    console.log('Processing tables:', event.data.tables);
                    this.pendingTables = event.data.tables;
                    await this.loadTablesFromParent(event.data.tables);
                } else if (event.data.type === 'NO_TABLES_FOUND') {
                    this.showToast('No tables found on the page');
                }
            });
        }
    }

    private async initializeApp() {
        await this.duckdb.initialize();
        // Process any pending tables after initialization
        if (this.pendingTables) {
            await this.loadTablesFromParent(this.pendingTables);
            this.pendingTables = null;
        }
        this.setupEventListeners();
    }

    private isValidUrl(str: string): boolean {
        try {
            new URL(str);
            return true;
        } catch {
            return false;
        }
    }

    private setupEventListeners() {
        const uploadBtn = document.getElementById('upload-btn') as HTMLButtonElement;
        const submitBtn = document.getElementById('submit-query') as HTMLButtonElement;
        const dataSourceInput = document.getElementById('data-source') as HTMLInputElement;
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        const fileSelectBtn = document.querySelector('.file-select-btn') as HTMLButtonElement;
        const smartInputWrapper = document.querySelector('.smart-input-wrapper') as HTMLElement;
        const urlInput = document.querySelector('input[placeholder="Load File or URL"]') as HTMLInputElement;

        console.log('URL input element:', urlInput); // Debug log
        console.log('File select button:', fileSelectBtn); // Debug log

        // File upload button click
        uploadBtn?.addEventListener('click', () => {
            fileInput?.click();
        });

        // Submit query button click
        submitBtn?.addEventListener('click', () => this.handleQuery());

        // Handle drag and drop
        smartInputWrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            smartInputWrapper.classList.add('dragging');
        });

        smartInputWrapper.addEventListener('dragleave', () => {
            smartInputWrapper.classList.remove('dragging');
        });

        smartInputWrapper.addEventListener('drop', async (e) => {
            e.preventDefault();
            smartInputWrapper.classList.remove('dragging');
            
            if (e.dataTransfer?.files.length) {
                const file = e.dataTransfer.files[0];
                await this.handleFileInput(file);
            }
        });

        // Update URL input handler to only set the data-type attribute
        dataSourceInput.addEventListener('input', (e) => {
            const input = e.target as HTMLInputElement;
            const value = input.value.trim();

            // Skip processing if the input is empty
            if (!value) {
                input.removeAttribute('data-type');
                return;
            }

            if (this.isValidUrl(value)) {
                input.setAttribute('data-type', 'url');
            } else {
                input.removeAttribute('data-type');
            }
        });

        // File select button click handler
        if (fileSelectBtn) {
            fileSelectBtn.addEventListener('click', async () => {
                console.log('File select button clicked');
                console.log('URL input value:', urlInput?.value);

                if (window.self !== window.top) {
                    console.log('Requesting parent to scan tables');
                    window.parent.postMessage({ type: 'SCAN_PAGE_TABLES' }, '*');
                } else {
                    // Check if URL is provided
                    const url = urlInput?.value?.trim();
                    console.log('Processed URL value:', url);

                    if (url && url.length > 0) {
                        console.log('URL provided, attempting to fetch:', url);
                        try {
                            const response = await fetch(url);
                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }

                            const contentType = response.headers.get('content-type');
                            console.log('Content type:', contentType);

                            let data: string;
                            let fileType: string;

                            if (contentType?.includes('application/json')) {
                                const jsonData = await response.json();
                                data = JSON.stringify(jsonData);
                                fileType = 'json';
                            } else {
                                data = await response.text();
                                fileType = 'csv';
                            }

                            console.log('Data format:', fileType);
                            const file = new File([data], `data.${fileType}`, { type: `text/${fileType}` });
                            await this.loadFile(file);
                        } catch (error) {
                            console.error('Error fetching URL:', error);
                            this.showToast(`Error fetching data from URL: ${error.message}`);
                        }
                    } else {
                        console.log('No URL provided, opening file dialog');
                        fileInput.click();
                    }
                }
            });
        }

        // Handle file selection
        if (fileInput) {
            fileInput.addEventListener('change', async (event) => {
                const files = (event.target as HTMLInputElement).files;
                if (files && files.length > 0) {
                    await this.loadFile(files[0]);
                }
            });
        }

        // Handle keyboard shortcuts for query
        const textarea = document.getElementById('nl-query') as HTMLTextAreaElement;
        const shortcutCheckbox = document.getElementById('enable-shortcut') as HTMLInputElement;
        
        // Save checkbox state to localStorage
        shortcutCheckbox?.addEventListener('change', () => {
            localStorage.setItem('enableShortcut', shortcutCheckbox.checked.toString());
        });

        // Load saved checkbox state
        const savedShortcutState = localStorage.getItem('enableShortcut');
        if (savedShortcutState !== null && shortcutCheckbox) {
            shortcutCheckbox.checked = savedShortcutState === 'true';
        }

        // Handle keyboard shortcuts
        textarea?.addEventListener('keydown', async (e) => {
            if (!shortcutCheckbox?.checked) return;
            
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            
            const shouldTrigger = e.key === 'Enter' && (
                (!isMac && !e.shiftKey) || // Windows/Linux: Enter without shift
                (isMac && (e.metaKey || !e.shiftKey)) // Mac: Command+Enter or Enter without shift
            );

            if (shouldTrigger) {
                e.preventDefault();
                submitBtn?.click();
            }
        });

        // Export button
        const exportButton = document.getElementById('export-pdf');
        exportButton?.addEventListener('click', () => this.exportToPDF());

        // Help icon
        const helpIcon = document.querySelector('.help-icon') as HTMLButtonElement;
        helpIcon?.addEventListener('click', () => {
            const helpModal = document.querySelector('.help-modal') as HTMLElement;
            if (helpModal) {
                helpModal.removeAttribute('hidden');
            }
        });

        // Add clear results button handler
        const clearButton = document.getElementById('clear-results');
        clearButton?.addEventListener('click', () => this.clearAllResults());

        // Initialize voice input
        const voiceButton = document.querySelector('.voice-input-btn') as HTMLButtonElement;
        const queryTextarea = document.getElementById('nl-query') as HTMLTextAreaElement;
        if (voiceButton && queryTextarea) {
            new VoiceService(voiceButton, queryTextarea);
        }
    }

    private async handleQuery() {
        if (!this.validateQueryPrerequisites()) return;

        try {
            const settings = SettingsService.getCurrentSettings();
            this.llm = new LLMHandler(settings.apiKey, settings.provider);
            
            const queryInput = document.getElementById('nl-query') as HTMLTextAreaElement;
            const query = queryInput.value;
            const shouldVisualize = detectVisualizationIntent(query);

            const sqlQuery = await this.llm!.getNLToSQL(this.schema, query);
            const results = await this.duckdb.executeQuery(sqlQuery);
            
            this.displayResults(results, query, shouldVisualize);
            queryInput.value = '';
            
        } catch (error) {
            this.showToast(`Error executing query: ${error}`);
        }
    }

    private validateQueryPrerequisites(): boolean {
        if (!this.schema) {
            this.showToast('Please load a file first');
            return false;
        }

        const settings = SettingsService.getCurrentSettings();
        if (!settings.apiKey) {
            this.showToast('Please enter an API key in settings');
            return false;
        }

        return true;
    }

    private displayResults(results: Record<string, any>[], query: string, shouldVisualize: boolean) {
        const resultsContainer = document.querySelector('.results-container');
        if (!resultsContainer) {
            console.error('Results container not found');
            return;
        }

        // Create a new result block
        const resultBlock = document.createElement('div');
        resultBlock.className = 'result-block';

        // Add delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-result';
        deleteButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 21c-.55 0-1.02-.196-1.412-.587A1.927 1.927 0 0 1 5 19V6H4V4h5V3h6v1h5v2h-1v13c0 .55-.196 1.02-.587 1.413A1.927 1.927 0 0 1 17 21H7ZM17 6H7v13h10V6ZM9 17h2V8H9v9Zm4 0h2V8h-2v9ZM7 6v13V6Z" fill="currentColor"/>
            </svg>
        `;
        deleteButton.addEventListener('click', () => {
            resultBlock.remove();
        });
        resultBlock.appendChild(deleteButton);

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
            
            // Fix the Object.values type issue
            const labels = results.map(row => String(Object.values(row)[0]));
            const values = results.map(row => Number(Object.values(row)[1]));

            const chartConfig = ChartService.createChartConfig(labels, values, query);

            new ChartJS(canvas, chartConfig);
        } else {
            console.log('Creating table view...');
            const table = this.createResultsTable(results);
            resultBlock.appendChild(table);
        }

        // Add the new result block and scroll to it
        resultsContainer.appendChild(resultBlock);
        resultsContainer.scrollTop = resultsContainer.scrollHeight;
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
                    if (chart && theme) {
                        ThemeService.updateChartTheme(chart, theme);
                    }
                });
            });
        });
    }

    private async exportToPDF() {
        const resultBlocks = document.querySelectorAll('.result-block');
        if (!resultBlocks.length) return;

        // Add type augmentation for jsPDF
        const doc = new jsPDF({
            unit: 'px',
            format: 'letter',
            orientation: 'portrait'
        }) as jsPDF & { autoTable: typeof autoTable };

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 40;
        const contentWidth = pageWidth - (margin * 2);
        
        let yOffset = margin;

        for (let i = 0; i < resultBlocks.length; i++) {
            const block = resultBlocks[i] as HTMLElement;
            
            // Add question text
            const questionEl = block.querySelector('.question-display');
            if (questionEl) {
                const questionText = questionEl.textContent || '';
                doc.setFontSize(12);
                doc.text(questionText, margin, yOffset);
                yOffset += 20;
            }

            // Handle table
            const table = block.querySelector('table');
            if (table) {
                const tableData = this.extractTableData(table);
                autoTable(doc, {
                    head: [tableData.headers],
                    body: tableData.rows,
                    startY: yOffset,
                    margin: { left: margin, right: margin },
                    styles: { fontSize: 10 },
                    headStyles: { fillColor: [200, 200, 200] }
                });
                yOffset = (doc as any).lastAutoTable.finalY + 20;
            }

            // Handle chart
            const canvas = block.querySelector('canvas');
            if (canvas) {
                const chart = ChartJS.getChart(canvas);
                if (chart) {
                    try {
                        const tempCanvas = document.createElement('canvas');
                        document.body.appendChild(tempCanvas);
                        tempCanvas.style.position = 'absolute';
                        tempCanvas.style.left = '-9999px';
                        
                        tempCanvas.width = contentWidth * 2;
                        tempCanvas.height = (contentWidth * 2) * (9/16);
                        
                        // Create configuration with proper typing
                        const tempConfig: ChartConfiguration = {
                            type: (chart.config as any).type,  // Type assertion for now
                            data: JSON.parse(JSON.stringify(chart.data)),
                            options: {
                                ...JSON.parse(JSON.stringify(chart.config.options)),
                                responsive: false,
                                animation: false,
                                color: '#000000',
                                scales: {
                                    x: {
                                        ticks: { color: '#000000' },
                                        grid: { color: '#E5E5E5' },
                                        border: { color: '#000000' }
                                    },
                                    y: {
                                        ticks: { color: '#000000' },
                                        grid: { color: '#E5E5E5' },
                                        border: { color: '#000000' }
                                    }
                                },
                                plugins: {
                                    legend: {
                                        labels: { color: '#000000' }
                                    }
                                }
                            }
                        };
                        
                        const tempChart = new ChartJS(tempCanvas, tempConfig);
                        await tempChart.render();
                        
                        const imgData = tempCanvas.toDataURL('image/png', 1.0);
                        doc.addImage(imgData, 'PNG', margin, yOffset, contentWidth, contentWidth * (9/16));
                        
                        tempChart.destroy();
                        document.body.removeChild(tempCanvas);
                        yOffset += (contentWidth * (9/16)) + 20;
                    } catch (error) {
                        console.error('Error exporting chart:', error);
                    }
                }
            }

            // Add new page if needed
            if (i < resultBlocks.length - 1 && yOffset > pageHeight - margin) {
                doc.addPage();
                yOffset = margin;
            }
        }

        doc.save('results.pdf');
    }

    private extractTableData(table: HTMLTableElement) {
        const headers: string[] = [];
        const rows: string[][] = [];

        // Extract headers
        const headerCells = table.querySelectorAll('th');
        headerCells.forEach(cell => headers.push(cell.textContent || ''));

        // Extract rows
        const rowElements = table.querySelectorAll('tr');
        rowElements.forEach(row => {
            if (row.querySelector('th')) return; // Skip header row
            const rowData: string[] = [];
            row.querySelectorAll('td').forEach(cell => {
                rowData.push(cell.textContent || '');
            });
            if (rowData.length) rows.push(rowData);
        });

        return { headers, rows };
    }

    private async handleFileInput(file: File) {
        const dataSourceInput = document.getElementById('data-source') as HTMLInputElement;
        try {
            this.schema = await this.duckdb.loadFile(file);
            dataSourceInput.value = file.name;
            this.showToast('File loaded successfully');
        } catch (error) {
            console.error('Error loading file:', error);
            dataSourceInput.value = '';
            this.showToast(`Error loading file: ${error}`);
        }
    }

    private async handleUrlInput(url: string) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            
            // Convert the JSON data to a Blob that can be handled by DuckDB
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            const file = new File([blob], 'api-data.json', { type: 'application/json' });
            
            this.schema = await this.duckdb.loadFile(file);
            this.showToast('API data loaded successfully');
        } catch (error) {
            console.error('Error loading API data:', error);
            this.showToast(`Error loading API data: ${error}`);
            throw error;
        }
    }

    private clearAllResults() {
        const resultsContainer = document.querySelector('.results-container');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
    }

    private async loadTablesFromParent(tables: Array<{ name: string, data: string }>) {
        try {
            console.log('Starting to load tables into DuckDB');
            for (const table of tables) {
                console.log(`Processing table: ${table.name}`);
                // Create a Blob from the CSV data
                const blob = new Blob([table.data], { type: 'text/csv' });
                const file = new File([blob], `${table.name}.csv`, { type: 'text/csv' });

                // Load the file into DuckDB
                this.schema = await this.duckdb.loadFile(file);
                console.log(`Table ${table.name} loaded successfully`);
            }

            // Update UI to show tables are loaded
            const dataSourceInput = document.getElementById('data-source') as HTMLInputElement;
            if (dataSourceInput) {
                dataSourceInput.value = `${tables.length} table(s) from page`;
                console.log('Updated data source input');
            }

            this.showToast('Tables loaded successfully');
        } catch (error) {
            console.error('Error loading tables:', error);
            this.showToast(`Error loading tables: ${error}`);
        }
    }

    private async loadFile(file: File) {
        try {
            const dataSourceInput = document.getElementById('data-source') as HTMLInputElement;
            
            if (file.type.includes('json') || file.name.endsWith('.json')) {
                console.log('Loading JSON file');
                const text = await file.text();
                const jsonData = JSON.parse(text);
                this.schema = await this.duckdb.loadJSON(jsonData);
            } else {
                console.log('Loading CSV file');
                this.schema = await this.duckdb.loadFile(file);
            }

            if (dataSourceInput) {
                dataSourceInput.value = file.name;
            }
            this.showToast('File loaded successfully');
        } catch (error) {
            console.error('Error loading file:', error);
            this.showToast(`Error loading file: ${error}`);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});

export default App;