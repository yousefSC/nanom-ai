
window.GeminiManager = class {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
        this.systemInstruction = {
            parts: [{ text: "You are Nanom AI, a helpful and creative AI assistant. Answer the user's questions clearly." }]
        };
    }

    async generateResponse(history, prompt) {
        console.log('Gemini: Sending prompt...', prompt);
        try {
            const body = {
                contents: [
                    ...history.map(item => ({
                        role: item.role === 'model' ? 'model' : 'user',
                        parts: item.parts
                    })),
                    {
                        role: 'user',
                        parts: [{ text: prompt }]
                    }
                ],
                system_instruction: this.systemInstruction
            };

            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Gemini API Error details:', errorData);
                return `Error: ${errorData.error?.message || 'Connection failed'}`;
            }

            const data = await response.json();
            console.log('Gemini: Received response', data);

            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            }
            return "I apologize, but I couldn't generate a response. Please try again.";
        } catch (error) {
            console.error('Gemini Fetch Error:', error);
            return `Error: ${error.message}. Please check your internet connection or API settings.`;
        }
    }
}
