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
        const closeSettings = document.querySelector('.close-settings') as HTMLButtonElement;
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

        // Close settings modal
        closeSettings.addEventListener('click', () => {
            settingsModal.setAttribute('hidden', '');
        });

        // Close when clicking outside
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.setAttribute('hidden', '');
            }
        });

        // Save settings when inputs change
        const saveSettings = () => {
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

            return settings;
        };

        apiKeyInput.addEventListener('input', saveSettings);
        providerSelect.addEventListener('change', saveSettings);
        persistCheckbox.addEventListener('change', saveSettings);
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
} 