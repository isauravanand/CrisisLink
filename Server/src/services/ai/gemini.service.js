import { GoogleGenAI } from "@google/genai";

/**
 * Base Gemini Service
 * Isolates direct interaction with Google GenAI API.
 */
class GeminiService {
    /**
     * Check if GEMINI_API_KEY is defined and non-empty
     */
    isConfigured() {
        const apiKey = process.env.GEMINI_API_KEY;
        return Boolean(apiKey && apiKey.trim().length > 0 && apiKey !== "your_gemini_api_key_here");
    }

    /**
     * Call Gemini model to generate content
     * @param {Object} options - { prompt, systemInstruction, model }
     * @returns {Promise<string>} raw text response
     */
    async generateText({ prompt, systemInstruction, model = "gemini-2.5-flash" }) {
        if (!this.isConfigured()) {
            throw new Error("GEMINI_API_KEY is missing or unconfigured in environment variables.");
        }

        try {
            const apiKey = process.env.GEMINI_API_KEY;
            const ai = new GoogleGenAI({ apiKey });

            const config = {};
            if (systemInstruction) {
                config.systemInstruction = systemInstruction;
            }

            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config
            });

            if (!response || !response.text) {
                throw new Error("Gemini returned an empty response");
            }

            return response.text;
        } catch (error) {
            // Mask any API keys that might accidentally be present in raw error messages
            const sanitizedMessage = error.message.replace(/key=[A-Za-z0-9_-]+/g, "key=***");
            console.error(`[GeminiService Error]: ${sanitizedMessage}`);
            throw new Error(`Gemini API error: ${sanitizedMessage}`);
        }
    }
}

export default new GeminiService();
