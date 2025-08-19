import { tts, speechRecognition } from './speech.js';
import { getAIResponse, parseAIResponse } from './ai.js';
import { handleMemoryCommand } from './memory.js';

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const ttsToggle = document.getElementById('tts-toggle');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const conversationLog = document.getElementById('conversation-log');

let isActive = false;

function setStatus(state, text) {
    statusIndicator.className = state;
    statusText.textContent = text;
}

function addMessage(sender, text) {
    const messageElem = document.createElement('div');
    messageElem.classList.add('message', `${sender}-message`);
    messageElem.textContent = text;
    conversationLog.appendChild(messageElem);
    conversationLog.scrollTop = conversationLog.scrollHeight;
}

async function handleUserInput(text) {
    if (!text.trim()) return;
    
    addMessage('user', text);
    setStatus('thinking', 'Thinking...');
    
    try {
        const rawAIResponse = await getAIResponse(text);
        const { commands, speech } = parseAIResponse(rawAIResponse);
        
        let commandResults = '';
        if (commands.length > 0) {
            commandResults = await handleMemoryCommand(commands[0]); // Simple: handle one command
            // Tell the AI what happened
            await getAIResponse(commandResults, false); 
        }

        addMessage('bot', speech);

        tts.speak(speech, () => {
            // on speech end
            if(isActive) {
                speechRecognition.start();
            } else {
                setStatus('idle', 'Session ended');
            }
        });

    } catch (error) {
        console.error('Error processing user input:', error);
        setStatus('idle', 'An error occurred. Click Start.');
        isActive = false;
        toggleButtons();
    }
}

function toggleButtons() {
    startBtn.style.display = isActive ? 'none' : 'block';
    stopBtn.style.display = isActive ? 'block' : 'none';
}

// Event Listeners
startBtn.addEventListener('click', () => {
    isActive = true;
    toggleButtons();
    tts.speak("Hello! How can I help you today?", () => speechRecognition.start());
});

stopBtn.addEventListener('click', () => {
    isActive = false;
    toggleButtons();
    speechRecognition.stop();
    tts.cancel();
    setStatus('idle', 'Session ended');
});

ttsToggle.addEventListener('change', (e) => {
    const engine = e.target.checked ? 'elevenlabs' : 'browser';
    tts.setEngine(engine);
    console.log(`TTS engine switched to: ${engine}`);
});

// Initialize Speech Recognition callbacks
speechRecognition.onStart = () => setStatus('listening', 'Listening...');
speechRecognition.onResult = (transcript) => handleUserInput(transcript);
speechRecognition.onEnd = () => {
    if (isActive) {
      // Don't auto-restart here, wait for TTS to finish
    } else {
        setStatus('idle', 'Click Start to begin');
    }
};
speechRecognition.onError = (event) => {
    console.error('Speech recognition error:', event.error);
    setStatus('idle', 'Speech error. Please restart.');
    isActive = false;
    toggleButtons();
};

// Initial state
setStatus('idle', 'Click Start to begin');

