const axios = require("axios");

/**
 * Creates a model client wrapper for DeepSeek API that matches the interface
 * of the previous Gemini client wrapper, ensuring zero code change on call sites.
 */
function getGenerativeModelWithFallback({ model: defaultModelName, generationConfig = {}, tools }) {
    // Map any model requested to deepseek-chat
    const dsModel = "deepseek-chat";

    return {
        generateContent: async function (prompt, retries = 3, delayMs = 1500) {
            const apiKey = process.env.DEEPSEEK_API_KEY;
            if (!apiKey) {
                throw new Error("Không tìm thấy DEEPSEEK_API_KEY trong file .env");
            }

            let lastError = null;

            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    console.log(`[DeepSeek API] Đang thử sử dụng model: ${dsModel} (Lần thử ${attempt}/${retries})`);
                    
                    const temperature = generationConfig.temperature !== undefined ? generationConfig.temperature : 0.5;
                    const maxTokens = generationConfig.maxOutputTokens !== undefined ? generationConfig.maxOutputTokens : 4096;

                    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
                        model: dsModel,
                        messages: [
                            { role: "user", content: prompt }
                        ],
                        temperature: temperature,
                        max_tokens: maxTokens
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        timeout: 90000 // 90 seconds timeout
                    });

                    if (!response.data || !response.data.choices || response.data.choices.length === 0) {
                        throw new Error("DeepSeek API trả về phản hồi rỗng hoặc không hợp lệ.");
                    }

                    const textContent = response.data.choices[0].message.content;
                    console.log(`[DeepSeek API] Thành công với model: ${dsModel} (Lần thử ${attempt})`);

                    // Return a compatibility wrapper mirroring Gemini response format
                    return {
                        response: {
                            text: () => textContent
                        }
                    };
                } catch (error) {
                    lastError = error;
                    const status = error.response?.status;
                    const errorMsg = error.response?.data?.error?.message || error.message;
                    console.warn(`[DeepSeek API] Lỗi với model ${dsModel} (Lần thử ${attempt}/${retries}):`, errorMsg);

                    if (status === 429 && attempt < retries) {
                        const waitTime = delayMs * attempt;
                        console.warn(`[DeepSeek API] Bị rate-limit 429. Chờ ${waitTime}ms rồi thử lại...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue;
                    }

                    if (attempt === retries) {
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
                }
            }

            throw lastError || new Error("Tất cả các lần thử tới DeepSeek đều không thể xử lý yêu cầu.");
        }
    };
}

/**
 * Extracts and parses JSON from standard AI text responses, handling markdown codeblocks.
 */
function extractJsonFromText(text) {
    if (!text || typeof text !== 'string') return null;

    // Loại bỏ markdown fences (```json ... ```) nếu có
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
        text = fenceMatch[1];
    }

    let cleaned = text.trim();
    
    // Thử parse trực tiếp toàn bộ chuỗi
    try {
        return JSON.parse(cleaned);
    } catch (_) {}

    // Helper: thử parse, nếu lỗi thì thử cắt dần về trước để tìm JSON hợp lệ
    const tryParse = (candidate) => {
        try {
            return JSON.parse(candidate);
        } catch (_) {
            return null;
        }
    };

    // Helper: cắt ngược từ cuối chuỗi tới khi parse được
    const parseWithTruncationRecovery = (candidate) => {
        // Thử parse nguyên bản trước
        let parsed = tryParse(candidate);
        if (parsed) return parsed;

        // Nếu fail, cắt dần ký tự cuối cho tới khi parse được
        let s = candidate;
        for (let i = 0; i < 500 && s.length > 50; i++) {
            s = s.slice(0, s.lastIndexOf(','));
            if (s.length < 10) break;
            const candidates = [
                s + '}',
                s + ']',
                s + '"}',
                s + '"]',
                s + ']}',
                s + '"]}',
                s + '}]}',
                s + '}}',
            ];
            for (const c of candidates) {
                parsed = tryParse(c);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        }
        return null;
    };

    // 1) Thử tìm JSON object hoặc array lớn nhất trong text
    const startObj = cleaned.indexOf('{');
    const endObj = cleaned.lastIndexOf('}');
    const startArr = cleaned.indexOf('[');
    const endArr = cleaned.lastIndexOf(']');

    let start = -1;
    let end = -1;

    // Xác định xem cái nào bao ngoài cùng (hoặc xuất hiện trước)
    if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
        start = startObj;
        end = endObj;
    } else if (startArr !== -1) {
        start = startArr;
        end = endArr;
    }

    if (start !== -1 && end !== -1 && end > start) {
        const candidate = cleaned.slice(start, end + 1);
        const parsed = parseWithTruncationRecovery(candidate);
        if (parsed) return parsed;
    }

    // 2) Fallback regex cho object hoặc array
    const jsonMatch = cleaned.match(/[\{\[][\s\S]*[\}\]]/);
    if (jsonMatch) {
        const parsed = parseWithTruncationRecovery(jsonMatch[0]);
        if (parsed) return parsed;
    }

    return null;
}

module.exports = {
    getGenerativeModelWithFallback,
    extractJsonFromText
};
