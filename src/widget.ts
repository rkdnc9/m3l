class M3LWidget {
    private container: HTMLElement;
    private iframe: HTMLIFrameElement;
    private isOpen: boolean = false;

    constructor() {
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

        // Create iframe
        this.iframe = document.createElement('iframe');
        this.iframe.className = 'm3l-widget-iframe';
        this.iframe.style.cssText = `
            width: 400px;
            height: 600px;
            border: none;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            background: white;
            margin-bottom: 10px;
            display: none;
            position: absolute;
            bottom: 70px;
            right: 0;
        `;

        // Set iframe source based on environment
        const isDevelopment = process.env.NODE_ENV === 'development';
        this.iframe.src = isDevelopment ? 'http://localhost:3000' : 'YOUR_DEPLOYED_APP_URL';

        // Add elements to container
        this.container.appendChild(this.iframe);
        this.container.appendChild(toggleButton);

        // Add click handler
        toggleButton.addEventListener('click', () => this.toggle());

        // Add to page
        document.body.appendChild(this.container);
    }

    private toggle() {
        this.isOpen = !this.isOpen;
        this.iframe.style.display = this.isOpen ? 'block' : 'none';
    }
}

// Initialize widget when script loads
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        new M3LWidget();
    });
}

// Export for use in module systems
export default M3LWidget; 