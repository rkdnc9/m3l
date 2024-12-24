export class ModalService {
    static setupModal(modalSelector: string, closeSelector: string): void {
        const modal = document.querySelector(modalSelector) as HTMLElement;
        const closeBtn = document.querySelector(closeSelector) as HTMLElement;

        if (!modal || !closeBtn) return;

        const closeModal = () => modal.setAttribute('hidden', '');

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.hasAttribute('hidden')) {
                closeModal();
            }
        });
    }
} 