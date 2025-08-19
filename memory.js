const MEMORY_KEY = 'talkBotMemories';

function getMemories() {
    try {
        const memories = localStorage.getItem(MEMORY_KEY);
        return memories ? JSON.parse(memories) : [];
    } catch (e) {
        console.error("Error reading memories from localStorage", e);
        return [];
    }
}

function saveMemories(memories) {
    try {
        localStorage.setItem(MEMORY_KEY, JSON.stringify(memories));
    } catch (e) {
        console.error("Error saving memories to localStorage", e);
    }
}

export async function handleMemoryCommand(command) {
    const memories = getMemories();
    
    switch (command.type) {
        case 'SAVE_MEMORY':
            memories.push({
                date: new Date().toISOString(),
                content: command.payload
            });
            saveMemories(memories);
            return `Memory saved: "${command.payload}"`;

        case 'GET_MEMORIES':
            if (memories.length === 0) {
                return "No memories found.";
            }
            const summary = memories.map(mem => `- ${mem.content}`).join('\n');
            return `Here are the memories I have:\n${summary}`;

        case 'SEARCH_MEMORIES':
            const query = command.payload.toLowerCase();
            const results = memories.filter(mem => mem.content.toLowerCase().includes(query));
            if (results.length === 0) {
                return `No memories found matching "${command.payload}".`;
            }
            const searchSummary = results.map(mem => `- ${mem.content}`).join('\n');
            return `I found these memories related to "${command.payload}":\n${searchSummary}`;
            
        default:
            return "Unknown memory command.";
    }
}

