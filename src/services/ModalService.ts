export class ModalService {
    static setupModal(modalSelector: string, closeButtonSelector: string) {
        const modal = document.querySelector(modalSelector) as HTMLElement;
        const closeButton = modal?.querySelector(closeButtonSelector) as HTMLElement;

        if (!modal || !closeButton) return;

        // Close button click handler
        closeButton.addEventListener('click', () => {
            modal.setAttribute('hidden', '');
        });

        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.setAttribute('hidden', '');
            }
        });

        // Add escape key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Close any visible modal
                const visibleModals = document.querySelectorAll('.help-modal:not([hidden]), .settings-modal:not([hidden])');
                visibleModals.forEach(modal => {
                    (modal as HTMLElement).setAttribute('hidden', '');
                });
            }
        });
    }
} 