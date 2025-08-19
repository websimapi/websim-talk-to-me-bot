let conversationHistory = [
    {
        role: "system",
        content: `You are a friendly, conversational AI assistant. Your primary purpose is to talk with the user and help them manage memories.
        To manage memories, you must use special commands in your response. The user will not see these commands.
        The available commands are:
        - [SAVE_MEMORY: "The content of the memory to save."] - Use this when the user wants to remember something.
        - [GET_MEMORIES] - Use this to retrieve a summary of all saved memories.
        - [SEARCH_MEMORIES: "search query"] - Use this to find specific memories.
        
        Example Interaction:
        User: "Remind me that my anniversary is on June 5th."
        Your Response: "Okay, I'll remember that for you. [SAVE_MEMORY: "Anniversary is on June 5th."]"
        
        The system will process the command and provide you with the result in the next turn. 
        Always provide a friendly, spoken response to the user in addition to any commands.`
    }
];

export async function getAIResponse(userInput, addToHistory = true) {
    if(addToHistory) {
        conversationHistory.push({ role: "user", content: userInput });
    } else {
        // This is for system messages/command results
        conversationHistory.push({ role: "system", content: `SYSTEM_INFO: ${userInput}` });
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
        
        if (addToHistory) {
            conversationHistory.push({ role: "assistant", content: aiResponse });
        }
        
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

