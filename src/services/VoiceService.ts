// Declare global to extend Window interface
declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

// Update the SpeechRecognitionEvent interface to match the actual structure
interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionErrorEvent {
    error: string;
}

class SpeechRecognitionClass {
    continuous: boolean = false;
    interimResults: boolean = false;
    lang: string = 'en-US';
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
    start(): void {}
    stop(): void {}
}

export class VoiceService {
    private recognition: SpeechRecognitionClass | null = null;
    private isListening: boolean = false;
    private voiceButton: HTMLButtonElement;
    private textarea: HTMLTextAreaElement;
    private timeoutId: number | null = null;

    constructor(voiceButton: HTMLButtonElement, textarea: HTMLTextAreaElement) {
        this.voiceButton = voiceButton;
        this.textarea = textarea;
        this.initializeSpeechRecognition();
    }

    private initializeSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            this.voiceButton.style.display = 'none';
            return;
        }

        const SpeechRecognition = (window.SpeechRecognition || window.webkitSpeechRecognition) as typeof SpeechRecognitionClass;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.voiceButton.classList.add('listening');
            this.textarea.placeholder = 'Listening...';
            
            this.timeoutId = window.setTimeout(() => {
                if (this.isListening) {
                    this.stopListening();
                }
            }, 7000);
        };

        this.recognition.onend = () => {
            this.stopListening();
        };

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
                this.timeoutId = window.setTimeout(() => {
                    if (this.isListening) {
                        this.stopListening();
                    }
                }, 2000);
            }

            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            this.textarea.value = finalTranscript || interimTranscript;
        };

        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                this.stopListening();
            } else {
                this.textarea.placeholder = 'Speech recognition error. Please try again.';
            }
        };

        this.voiceButton.addEventListener('click', () => this.toggleListening());
    }

    private toggleListening() {
        if (!this.recognition) return;

        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    private startListening() {
        if (!this.recognition) return;
        this.textarea.value = '';
        this.recognition.start();
    }

    private stopListening() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        
        this.isListening = false;
        this.voiceButton.classList.remove('listening');
        this.textarea.placeholder = 'Ask a question about your data...';
    }
} 