import { DuckDBHandler } from './duckdb';
import { LLMHandler } from './llm';

class App {
    private duckdb: DuckDBHandler;
    private llm: LLMHandler | null = null;
    private schema: string = '';

    constructor() {
        this.duckdb = new DuckDBHandler();
        this.initializeApp();
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

        uploadBtn.addEventListener('click', () => this.handleFileUpload());
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
    }

    private async handleFileUpload() {
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        const file = fileInput.files?.[0];
        
        if (!file) {
            this.showToast('Please select a file');
            return;
        }

        try {
            this.schema = await this.duckdb.loadFile(file);
            this.showToast('File loaded successfully!');
        } catch (error) {
            this.showToast(`Error loading file: ${error}`);
            console.error('File loading error:', error);
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
            const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
            this.showToast('Please enter an API key');
            return;
        }

        try {
            const sqlQuery = await this.llm.getNLToSQL(this.schema, query);
            const results = await this.duckdb.executeQuery(sqlQuery);
            this.displayResults(results);
        } catch (error) {
            this.showToast(`Error executing query: ${error}`);
            console.error('Query execution error:', error);
        }
    }

    private showToast(message: string) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Remove toast after animation
        setTimeout(() => {
            toast.remove();
        }, 4000); // Matches the duration of the fade-out animation
    }

    private displayResults(results: any[]) {
        const resultsDiv = document.getElementById('results-table');
        if (!resultsDiv || results.length === 0) {
            if (resultsDiv) {
                resultsDiv.innerHTML = '<p>No results found</p>';
            }
            return;
        }

        const headers = Object.keys(results[0]);
        const table = document.createElement('table');
        
        // Create header row
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

        resultsDiv.innerHTML = '';
        resultsDiv.appendChild(table);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});

export default App;