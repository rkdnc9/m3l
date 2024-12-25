export class ModalService {
    static setupModal(modalSelector: string, closeButtonSelector: string) {
        const modal = document.querySelector(modalSelector) as HTMLElement;
        const closeButton = document.querySelector(closeButtonSelector) as HTMLElement;

        if (!modal || !closeButton) {
            console.error('Modal elements not found');
            return;
        }

        // Close modal when clicking the close button
        closeButton.addEventListener('click', () => {
            modal.setAttribute('hidden', '');
        });

        // Close modal when clicking outside the modal content
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.setAttribute('hidden', '');
            }
        });
    }
} 