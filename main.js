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
    if (!text || !text.trim()) return; // Don't add empty messages
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
        // First pass: get AI response with potential commands
        const rawAIResponse = await getAIResponse(text);
        let { commands, speech } = parseAIResponse(rawAIResponse);
        
        // If there's an initial speech part, show it, but don't speak yet.
        if (speech) {
            addMessage('bot', speech);
        }

        // Handle commands if any
        if (commands.length > 0) {
            // For now, handle one command per turn for simplicity
            const command = commands[0];
            setStatus('thinking', 'Accessing memory...');
            const commandResult = await handleMemoryCommand(command);
            
            // Second pass: get a new spoken response from the AI based on the command result
            const finalAIResponse = await getAIResponse(commandResult, false);
            const finalParsed = parseAIResponse(finalAIResponse);
            speech = finalParsed.speech; // This is the new text to be spoken
        }

        addMessage('bot', speech);
        setStatus('speaking', 'Speaking...');

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