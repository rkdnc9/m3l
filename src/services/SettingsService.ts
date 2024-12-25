export interface APISettings {
    apiKey: string;
    provider: 'openai' | 'claude';
    persist: boolean;
}

export class SettingsService {
    private static readonly STORAGE_KEY = 'api_settings';

    static setupSettingsModal() {
        const settingsIcon = document.querySelector('.settings-icon') as HTMLButtonElement;
        const settingsModal = document.querySelector('.settings-modal') as HTMLElement;
        const saveSettings = document.querySelector('.save-settings') as HTMLButtonElement;
        const deleteSettings = document.querySelector('.delete-settings') as HTMLButtonElement;
        const apiKeyInput = document.getElementById('settings-api-key') as HTMLInputElement;
        const providerSelect = document.getElementById('settings-api-provider') as HTMLSelectElement;
        const persistCheckbox = document.getElementById('persist-settings') as HTMLInputElement;

        // Load saved settings
        const savedSettings = this.loadSettings();
        if (savedSettings) {
            apiKeyInput.value = savedSettings.apiKey;
            providerSelect.value = savedSettings.provider;
            persistCheckbox.checked = savedSettings.persist;
        }

        // Show settings modal
        settingsIcon.addEventListener('click', () => {
            settingsModal.removeAttribute('hidden');
        });

        // Save and close settings modal
        saveSettings.addEventListener('click', () => {
            const settings: APISettings = {
                apiKey: apiKeyInput.value,
                provider: providerSelect.value as 'openai' | 'claude',
                persist: persistCheckbox.checked
            };

            if (settings.persist) {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
            } else {
                localStorage.removeItem(this.STORAGE_KEY);
            }

            settingsModal.setAttribute('hidden', '');
        });

        // Delete settings
        deleteSettings.addEventListener('click', () => {
            localStorage.removeItem(this.STORAGE_KEY);
            apiKeyInput.value = '';
            providerSelect.value = 'openai';
            persistCheckbox.checked = false;
            this.showToast('Settings deleted');
        });

        // Close when clicking outside
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.setAttribute('hidden', '');
            }
        });
    }

    static loadSettings(): APISettings | null {
        const savedSettings = localStorage.getItem(this.STORAGE_KEY);
        return savedSettings ? JSON.parse(savedSettings) : null;
    }

    static getCurrentSettings(): APISettings {
        const apiKeyInput = document.getElementById('settings-api-key') as HTMLInputElement;
        const providerSelect = document.getElementById('settings-api-provider') as HTMLSelectElement;
        const persistCheckbox = document.getElementById('persist-settings') as HTMLInputElement;

        return {
            apiKey: apiKeyInput.value,
            provider: providerSelect.value as 'openai' | 'claude',
            persist: persistCheckbox.checked
        };
    }

    private static showToast(message: string) {
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
} 