const { GoogleGenerativeAI } = require("@google/generative-ai");

// Candidate models in order of preference
const MODEL_CANDIDATES = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.5-flash-lite"
];

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Creates a model client wrapper that automatically falls back to other Gemini models
 * when encountering a 429 (Too Many Requests) or other quota/rate limit error.
 */
function getGenerativeModelWithFallback({ model: defaultModelName, generationConfig = {} }) {
    return {
        generateContent: async function (prompt, retries = 3, delayMs = 1500) {
            let lastError = null;

            // Put defaultModelName at the front of candidates
            const candidates = [defaultModelName, ...MODEL_CANDIDATES.filter(m => m !== defaultModelName)];

            for (const modelName of candidates) {
                console.log(`[Gemini API] Đang thử sử dụng model: ${modelName}`);
                const actualModel = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: 0.5,
                        ...generationConfig
                    }
                });

                for (let attempt = 1; attempt <= retries; attempt++) {
                    try {
                        const result = await actualModel.generateContent(prompt);
                        console.log(`[Gemini API] Thành công với model: ${modelName} (Lần thử ${attempt})`);
                        return result;
                    } catch (error) {
                        lastError = error;
                        const status = error.status || (error.message && error.message.includes('429') ? 429 : null);
                        const isRateLimit = status === 429 || 
                                            error.message?.includes("Quota exceeded") || 
                                            error.message?.includes("Too Many Requests") || 
                                            error.message?.includes("429");

                        console.warn(`[Gemini API] Lỗi với model ${modelName} (Lần thử ${attempt}/${retries}):`, error.message || error);

                        if (isRateLimit) {
                            console.warn(`[Gemini API] Bị giới hạn quota/rate limit (429) với model ${modelName}. Chuyển sang model tiếp theo.`);
                            break; // break out of retry loop for this model, fallback to next model
                        }

                        if (attempt === retries) {
                            break; // try next model
                        }

                        // Exponential backoff
                        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
                    }
                }
            }

            throw lastError || new Error("Tất cả các model Gemini đều không thể xử lý yêu cầu.");
        }
    };
}

/**
 * Extracts and parses JSON from standard AI text responses, handling markdown codeblocks.
 */
function extractJsonFromText(text) {
    if (!text || typeof text !== 'string') return null;

    // Remove markdown fences and leading labels
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
        text = fenceMatch[1];
    }

    // Find the first JSON object by braces
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
        const candidate = text.slice(start, end + 1);
        try {
            return JSON.parse(candidate);
        } catch (_) {
            // continue to fallback
        }
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch (_) {
            return null;
        }
    }

    return null;
}

module.exports = {
    getGenerativeModelWithFallback,
    extractJsonFromText
};
