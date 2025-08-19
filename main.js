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
    if (!text.trim()) {
        if (isActive) {
            // If silence was detected, just restart listening without processing
            speechRecognition.start();
        }
        return;
    }
    
    addMessage('user', text);
    setStatus('thinking', 'Thinking...');
    
    try {
        // --- Agentic Loop ---
        const MAX_STEPS = 5;
        let currentStep = 0;
        let isDone = false;
        let currentInput = text;
        let finalSpeech = "I'm not sure how to respond to that.";
        
        while (currentStep < MAX_STEPS && !isDone) {
            currentStep++;

            const rawAIResponse = await getAIResponse(currentInput);
            const parsed = parseAIResponse(rawAIResponse);

            if (parsed.commands && parsed.commands.length > 0) {
                // ACTION STEP: AI wants to use a tool (memory)
                setStatus('thinking', 'Accessing memories...');
                
                const commandPromises = parsed.commands.map(handleMemoryCommand);
                const commandResults = await Promise.all(commandPromises);
                const resultsText = commandResults.join('\n');
                
                // Create a new input for the AI that includes the tool results
                currentInput = `Here are the results from your memory command(s):\n${resultsText}\n\nBased on these results, what is your final response to the user?`;

            } else {
                // RESPONSE STEP: AI has a final answer
                finalSpeech = parsed.speech || "I seem to be at a loss for words.";
                isDone = true;
            }
        }
        // --- End Agentic Loop ---

        if (!isDone) {
            finalSpeech = "I got stuck in a thought loop. Could you rephrase that?";
        }

        addMessage('bot', finalSpeech);
        setStatus('speaking', 'Speaking...');

        tts.speak(finalSpeech, () => {
            // on speech end
            if(isActive) {
                speechRecognition.start();
            } else {
                setStatus('idle', 'Session ended');
            }
        });

    } catch (error) {
        console.error('Error processing user input:', error);
        const errorMessage = "Sorry, I ran into a little trouble. Could you try that again?";
        addMessage('bot', errorMessage);
        tts.speak(errorMessage, () => {
            if (isActive) {
                speechRecognition.start();
            } else {
                 setStatus('idle', 'An error occurred. Click Start.');
            }
        });
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