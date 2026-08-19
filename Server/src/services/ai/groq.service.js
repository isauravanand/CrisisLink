import Groq from "groq-sdk";

/**
 * Base Groq Service
 * Provides ultra-fast LLM inference using Groq API.
 */
class GroqService {
    /**
     * Check if GROQ_API_KEY is defined and non-empty
     */
    isConfigured() {
        const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
        return Boolean(apiKey && apiKey.trim().length > 0 && apiKey !== "your_groq_api_key_here");
    }

    /**
     * Call Groq model to generate JSON content
     * @param {Object} options - { prompt, systemInstruction, model }
     * @returns {Promise<string>} raw text response
     */
    async generateText({ prompt, systemInstruction, model = "llama-3.3-70b-versatile" }) {
        if (!this.isConfigured()) {
            throw new Error("GROQ_API_KEY is missing or unconfigured in environment variables.");
        }

        const apiKey = (process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY).trim();

        try {
            const groq = new Groq({ apiKey });

            const messages = [];
            if (systemInstruction) {
                messages.push({ role: "system", content: systemInstruction });
            }
            messages.push({ role: "user", content: prompt });

            const completion = await groq.chat.completions.create({
                messages,
                model,
                temperature: 0.2,
                response_format: { type: "json_object" }
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) {
                throw new Error("Groq API returned an empty response");
            }

            return content;
        } catch (error) {
            console.error(`[GroqService Error]: ${error.message}`);
            throw new Error(`Groq API error: ${error.message}`);
        }
    }
}

export default new GroqService();
