let conversationHistory = [
    {
        role: "system",
        content: `You are a friendly, conversational AI assistant designed for voice interaction. Your primary purpose is to talk with users and help them manage memories using local storage.

        IMPORTANT MULTI-STEP PROCESS:
        When a user asks about memories, you must work in steps:
        
        STEP 1: Identify what memories are needed and issue commands
        STEP 2: Use the retrieved memory information to provide a complete, contextual response
        
        Available memory commands (user cannot see these):
        - [SAVE_MEMORY: "content"] - Save new memory
        - [GET_MEMORIES] - Retrieve all memories  
        - [SEARCH_MEMORIES: "query"] - Search for specific memories
        
        CRITICAL: When you issue memory commands, you will receive the results in a follow-up system message. You MUST then use that information to provide a complete answer to the user's original question.
        
        Example flow:
        User: "Do you remember anything about my anniversary?"
        Step 1 Response: "Let me check my memories for you. [SEARCH_MEMORIES: anniversary]"
        System provides: "Anniversary is on June 5th with Sarah"
        Step 2 Response: "Yes! I remember that your anniversary is on June 5th with Sarah."
        
        Always speak naturally and conversationally since this is voice-based interaction.`
    }
];

export async function getAIResponse(userInput, isSystemMessage = false, originalUserQuestion = null) {
    if (isSystemMessage) {
        // When providing memory results, give clear context about the original question
        const contextMessage = originalUserQuestion ? 
            `MEMORY_RESULTS for "${originalUserQuestion}": ${userInput}` : 
            `SYSTEM_INFO: ${userInput}`;
        conversationHistory.push({ role: "system", content: contextMessage });
    } else {
        conversationHistory.push({ role: "user", content: userInput });
    }
    
    // Keep history from getting too long
    if (conversationHistory.length > 15) {
        conversationHistory = [conversationHistory[0], ...conversationHistory.slice(-14)];
    }

    try {
        const completion = await websim.chat.completions.create({
            messages: conversationHistory,
        });

        const aiResponse = completion.content;
        
        // Always add the assistant's response to the history.
        conversationHistory.push({ role: "assistant", content: aiResponse });
        
        return aiResponse;
    } catch (error) {
        console.error("Error getting AI response:", error);
        return "I'm sorry, I'm having trouble connecting to my brain right now.";
    }
}

export function parseAIResponse(response) {
    const commandRegex = /\[(SAVE_MEMORY|GET_MEMORIES|SEARCH_MEMORIES):?\s?"?([^"\]]*)"?\]/g;
    const commands = [];
    let match;
    while((match = commandRegex.exec(response)) !== null) {
        commands.push({
            type: match[1],
            payload: match[2]
        });
    }

    const speech = response.replace(commandRegex, '').trim();
    
    return { commands, speech };
}