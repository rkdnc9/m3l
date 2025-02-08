class M3LWidget {
    private container: HTMLElement;
    private iframe: HTMLIFrameElement;
    private isOpen: boolean = false;
    private static instance: M3LWidget | null = null;

    constructor() {
        // Ensure only one instance is created
        if (M3LWidget.instance) {
            return M3LWidget.instance;
        }
        M3LWidget.instance = this;

        console.log('M3L Widget constructor started');
        
        // Create container for the widget
        this.container = document.createElement('div');
        this.container.className = 'm3l-widget-container';
        this.container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
        `;

        // Create toggle button
        const toggleButton = document.createElement('button');
        toggleButton.className = 'm3l-widget-toggle';
        toggleButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" fill="currentColor"/>
            </svg>
        `;
        toggleButton.style.cssText = `
            width: 50px;
            height: 50px;
            border-radius: 25px;
            background: #6750A4;
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            position: absolute;
            bottom: 0;
            right: 0;
        `;

        // Create iframe with explicit origin
        this.iframe = document.createElement('iframe');
        this.iframe.className = 'm3l-widget-iframe';
        this.iframe.style.cssText = `
            width: 450px;
            height: 700px;
            border: none;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            background: white;
            margin-bottom: 10px;
            display: none;
            position: fixed;
            bottom: 80px;
            right: 20px;
            transition: all 0.3s ease;
        `;

        // Set iframe source with explicit origin
        const origin = window.location.origin;
        console.log('Setting iframe source with origin:', origin);
        this.iframe.src = `${origin}`;

        // Add elements to container
        this.container.appendChild(this.iframe);
        this.container.appendChild(toggleButton);

        // Add click handler
        toggleButton.addEventListener('click', () => {
            console.log('Toggle button clicked');
            this.toggle();
        });

        // Add to page
        document.body.appendChild(this.container);
        console.log('M3L Widget constructor completed');

        // Listen for messages from iframe
        window.addEventListener('message', (event) => {
            if (event.data.type === 'SCAN_PAGE_TABLES') {
                console.log('Received request to scan tables');
                this.detectAndProcessTables();
            }
        });
    }

    private toggle() {
        this.isOpen = !this.isOpen;
        if (this.iframe) {
            this.iframe.style.display = this.isOpen ? 'block' : 'none';
            
            // Log state for debugging
            console.log('Widget toggled:', this.isOpen ? 'open' : 'closed');
        }
    }

    private detectAndProcessTables() {
        console.log('Detecting tables...');
        const tables = document.getElementsByTagName('table');
        console.log(`Found ${tables.length} tables`);

        if (tables.length === 0) {
            // Notify iframe that no tables were found
            this.iframe.contentWindow?.postMessage({
                type: 'NO_TABLES_FOUND'
            }, '*');
            return;
        }

        const tableData = Array.from(tables).map((table, index) => {
            const csvData = this.tableToCSV(table);
            console.log(`Table ${index + 1} data:`, csvData.substring(0, 100));
            return {
                name: `table_${index + 1}`,
                data: csvData
            };
        });

        console.log('Sending table data to iframe:', tableData);
        this.iframe.contentWindow?.postMessage({
            type: 'LOAD_TABLES',
            tables: tableData
        }, '*');
    }

    private tableToCSV(table: HTMLTableElement): string {
        const rows = table.rows;
        const csvRows: string[] = [];

        // Get headers
        const headers = Array.from(rows[0].cells).map(cell => 
            this.cleanCSVValue(cell.textContent || '')
        );
        csvRows.push(headers.join(','));

        // Get data rows
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const rowData = Array.from(row.cells).map(cell => 
                this.cleanCSVValue(cell.textContent || '')
            );
            csvRows.push(rowData.join(','));
        }

        return csvRows.join('\n');
    }

    private cleanCSVValue(value: string): string {
        // Remove newlines and extra spaces
        value = value.replace(/[\n\r]+/g, ' ').trim();
        // Escape quotes and wrap in quotes if contains comma
        if (value.includes(',') || value.includes('"')) {
            value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }
}

// Initialize widget when script loads
console.log('Widget script loaded, initializing...');
if (typeof window !== 'undefined') {
    let widgetInstance: M3LWidget | null = null;
    window.addEventListener('load', () => {
        console.log('Window loaded, creating widget...');
        if (!widgetInstance) {
            widgetInstance = new M3LWidget();
        }
    });
}

// Export for use in module systems
export default M3LWidget; 