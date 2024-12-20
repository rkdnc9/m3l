import { DuckDBHandler } from './duckdb';
import { LLMHandler } from './llm';

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
            const sqlQuery = await this.llm.getNLToSQL(this.schema, query);
            const results = await this.duckdb.executeQuery(sqlQuery);
            
            // Create and add the result block
            const resultsContainer = document.querySelector('.results-container');
            if (!resultsContainer) {
                console.error('Results container not found');
                return;
            }

            const resultBlock = document.createElement('div');
            resultBlock.className = 'result-block';
            
            // Add the query
            const queryDisplay = document.createElement('div');
            queryDisplay.className = 'query-display';
            queryDisplay.textContent = `Q: ${query}`;
            resultBlock.appendChild(queryDisplay);
            
            // Add the results table
            if (results.length > 0) {
                const table = this.createResultsTable(results);
                resultBlock.appendChild(table);
            } else {
                const noResults = document.createElement('p');
                noResults.textContent = 'No results found';
                resultBlock.appendChild(noResults);
            }
            
            // Add to container
            resultsContainer.appendChild(resultBlock);
            
            // Scroll to bottom
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
                const theme = (e.currentTarget as HTMLElement).dataset.theme;
                
                // Remove active class from all options
                colorOptions.forEach(opt => opt.classList.remove('active'));
                
                // Add active class to selected option
                e.currentTarget.classList.add('active');
                
                // Apply theme
                body.className = `theme-${theme}`;
                
                // Save theme preference
                localStorage.setItem('theme', theme);
            });
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});

export default App;