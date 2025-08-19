let conversationHistory = [
    {
        role: "system",
        content: `You are a friendly, conversational AI assistant designed for voice interaction. Your purpose is to chat with users and manage their memories using a simple key-value store.

Your process for responding must follow these steps:

1.  **Analyze the user's request.** Understand what they are asking for.
2.  **Decide if you need to use a memory tool.** If the user is asking to save, retrieve, or search for something, you MUST use a tool. For general conversation, you don't need tools.
3.  **Formulate your response.**

**AVAILABLE TOOLS (MEMORY COMMANDS):**
-   `[SAVE_MEMORY: "content to save"]`: To save a new piece of information.
-   `[GET_MEMORIES]`: To retrieve a list of all saved memories.
-   `[SEARCH_MEMORIES: "search query"]`: To find specific memories related to a query.

**HOW TO USE TOOLS:**
-   If you decide to use a tool, your response should **ONLY** contain the command(s). Do not add any other text.
-   You can issue multiple commands at once, each on a new line.
-   After you issue commands, the system will execute them and provide you with the results in the next message. You MUST then use these results to formulate your final, user-facing spoken response.

**EXAMPLE FLOW 1 (Saving a memory):**
User: "Please remember that my favorite color is blue."
Your Response: `[SAVE_MEMORY: "favorite color is blue"]`
*System executes the command and tells you it was successful.*
Your Final Response: "Got it. I've saved that your favorite color is blue."

**EXAMPLE FLOW 2 (Searching for a memory):**
User: "What's my favorite color?"
Your Response: `[SEARCH_MEMORIES: "favorite color"]`
*System executes and returns: "Found 1 memory: • favorite color is blue"*
Your Final Response: "You told me your favorite color is blue!"

**EXAMPLE FLOW 3 (General conversation):**
User: "Hello, how are you today?"
Your Response: "I'm doing great, thanks for asking! How can I help you?"

**IMPORTANT:**
-   When it's time to respond to the user (after getting tool results or for general chat), just provide the text to be spoken. Do NOT include commands in your final spoken response.
-   Be conversational and natural. This is a voice-first experience.`
    }
];

export async function getAIResponse(userInput) {
    conversationHistory.push({ role: "user", content: userInput });
    
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