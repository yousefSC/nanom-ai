
window.MessageParser = class {
    static parseResponse(response) {
        // Regex Cleaning
        // 1. Remove [REASONING_START] blocks
        const reasoningRegex = /\[REASONING_START\][\s\S]*?(?:\[REASONING_END\]|$)/g;
        // Adjust regex based on prompt needs "search for ... then search for best JSON"

        let cleaned = response.replace(reasoningRegex, '');

        // 2. Extract JSON "Active Pattern"
        // Search for JSON block
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        const markdownJsonMatch = cleaned.match(/```json\n([\s\S]*?)\n```/);

        if (markdownJsonMatch) {
            try {
                return JSON.parse(markdownJsonMatch[1]);
            } catch (e) {
                console.error('Failed to parse Markdown JSON', e);
            }
        }

        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e) {
                // Fallback
            }
        }

        return { text: cleaned }; // Fallback simple text
    }

    static checkAndroidConstraint(json) {
        if (json.manifest && json.layout_xml && json.main_activity_kt) {
            console.log("Android App Detected - Triggering Emulator Fake");
            return true;
        }
        return false;
    }
}
