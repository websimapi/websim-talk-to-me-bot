const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// --- Text-to-Speech ---
class TTS {
    constructor() {
        this.engine = 'browser'; // 'browser' or 'elevenlabs'
        this.onEndCallback = null;
        this.audioElement = new Audio();
    }

    setEngine(engineName) {
        this.engine = engineName;
    }

    speak(text, onEndCallback = () => {}) {
        this.cancel();
        this.onEndCallback = onEndCallback;
        
        if (this.engine === 'elevenlabs') {
            this.speakElevenLabs(text);
        } else {
            this.speakBrowser(text);
        }
    }
    
    async speakElevenLabs(text) {
        try {
            const { url } = await websim.textToSpeech({ text, voice: 'en-female' });
            this.audioElement.src = url;
            this.audioElement.play();
            this.audioElement.onended = () => {
                if (this.onEndCallback) this.onEndCallback();
            };
        } catch (error) {
            console.error("ElevenLabs TTS error:", error);
            // Fallback to browser TTS
            this.speakBrowser("I encountered an error with my voice. I will use a different one for now.");
        }
    }

    speakBrowser(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => {
            if (this.onEndCallback) this.onEndCallback();
        };
        window.speechSynthesis.speak(utterance);
    }
    
    cancel() {
        window.speechSynthesis.cancel();
        if (!this.audioElement.paused) {
            this.audioElement.pause();
            this.audioElement.src = '';
        }
    }
}

// --- Speech-to-Text ---
class STT {
    constructor() {
        if (!SpeechRecognition) {
            console.error("Speech Recognition not supported in this browser.");
            alert("Speech Recognition not supported. Please use Chrome or Edge.");
            return;
        }
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.onStart = () => {};
        this.onResult = () => {};
        this.onEnd = () => {};
        this.onError = () => {};
        
        this.recognition.onstart = () => this.onStart();
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.onResult(transcript);
        };
        this.recognition.onend = () => this.onEnd();
        this.recognition.onerror = (event) => this.onError(event);
    }

    start() {
        try {
            this.recognition.start();
        } catch(e) {
            console.error("Recognition already started.", e);
        }
    }

    stop() {
        this.recognition.stop();
    }
}

export const tts = new TTS();
export const speechRecognition = new STT();

