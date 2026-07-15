const { GoogleGenerativeAI } = require("@google/generative-ai");

// Candidate models in order of preference.
// LƯU Ý: `gemini-2.5-flash-lite` đã bị Google gỡ khỏi free tier cho nhiều project
// (lỗi `Quota exceeded ... limit: 0`).
// `gemini-1.5-flash-8b` cũng trả 404 trên v1beta cho nhiều API key — không dùng nữa.
const MODEL_CANDIDATES = [
    "gemini-2.5-flash",
    "gemini-3.1-flash-lite"
];

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Trích số giây cần chờ từ thông điệp lỗi Gemini (RetryInfo).
 * Gemini trả về cảnh báo kiểu:
 *   "Please retry in 45.19s. ..."
 * Trả về milliseconds, hoặc null nếu không tìm thấy.
 */
function extractRetryDelayMs(errorMessage) {
    if (!errorMessage || typeof errorMessage !== 'string') return null;
    const match = errorMessage.match(/retry in\s+([\d.]+)\s*s/i);
    if (match && match[1]) {
        const seconds = parseFloat(match[1]);
        if (!Number.isNaN(seconds) && seconds > 0 && seconds <= 120) {
            // Cộng thêm 1 giây buffer để chắc chắn quota đã được reset
            return Math.ceil(seconds * 1000) + 1000;
        }
    }
    return null;
}

/**
 * Phân loại lỗi 429 / quota từ Gemini để quyết định hành động:
 *   - 'quota-exhausted': limit = 0 hoặc message không có RetryInfo
 *       -> KHÔNG chờ retry, chuyển thẳng sang model tiếp theo.
 *   - 'rate-limited': có RetryInfo (vd: "Please retry in 45.19s")
 *       -> Chờ đúng khoảng thời gian RetryInfo rồi thử lại cùng model.
 *   - null: không phải lỗi quota, để fallback xử lý chung.
 */
function classifyQuotaError(error) {
    const msg = (error && error.message) ? String(error.message) : '';
    const status = error && error.status;
    const looksLike429 = status === 429 ||
        msg.includes('Quota exceeded') ||
        msg.includes('Too Many Requests') ||
        msg.includes('429');
    if (!looksLike429) return null;

    const retryAfterMs = extractRetryDelayMs(msg);
    // `limit: 0` nghĩa là project này thực sự không có quota cho model, chờ vô ích.
    const hardExhausted = /limit:\s*0/i.test(msg) || /\bquota exceeded\b/i.test(msg) && !retryAfterMs;

    if (retryAfterMs && !hardExhausted) {
        return { kind: 'rate-limited', retryAfterMs };
    }
    return { kind: 'quota-exhausted', retryAfterMs: null };
}

/**
 * Creates a model client wrapper that automatically falls back to other Gemini models
 * when encountering a 429 (Too Many Requests) or other quota/rate limit error.
 *
 * - Tự động chờ theo `RetryInfo` mà Gemini trả về (nếu có) trước khi thử lại cùng model.
 * - Có exponential backoff giữa các lần retry.
 * - Thử lần lượt các model trong MODEL_CANDIDATES.
 */
function getGenerativeModelWithFallback({ model: defaultModelName, generationConfig = {}, tools }) {
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
                        maxOutputTokens: 8192,
                        ...generationConfig
                    },
                    tools: tools
                });

                for (let attempt = 1; attempt <= retries; attempt++) {
                    try {
                        const result = await actualModel.generateContent(prompt);
                        console.log(`[Gemini API] Thành công với model: ${modelName} (Lần thử ${attempt})`);
                        return result;
                    } catch (error) {
                        lastError = error;
                        const quota = classifyQuotaError(error);

                        console.warn(`[Gemini API] Lỗi với model ${modelName} (Lần thử ${attempt}/${retries}):`, error.message || error);

                        // Trường hợp 1: rate-limit có RetryInfo -> chờ rồi thử lại cùng model
                        if (quota && quota.kind === 'rate-limited' && attempt < retries) {
                            console.warn(`[Gemini API] Bị rate-limit 429. Chờ ${quota.retryAfterMs}ms theo RetryInfo rồi thử lại model ${modelName}...`);
                            await new Promise(resolve => setTimeout(resolve, quota.retryAfterMs));
                            continue;
                        }

                        // Trường hợp 2: quota cạn kiệt hoàn toàn (limit:0) hoặc hết retry -> sang model tiếp theo
                        if (quota) {
                            console.warn(`[Gemini API] Bị giới hạn quota với model ${modelName}. Chuyển sang model tiếp theo.`);
                            break;
                        }

                        // Trường hợp 3: lỗi khác (5xx, mạng...) -> exponential backoff
                        if (attempt === retries) {
                            break;
                        }
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

    // Loại bỏ markdown fences (```json ... ```) nếu có
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
        text = fenceMatch[1];
    }

    // Helper: thử parse, nếu lỗi thì thử cắt dần về trước để tìm JSON hợp lệ
    const tryParse = (candidate) => {
        try {
            return JSON.parse(candidate);
        } catch (_) {
            return null;
        }
    };

    // Helper: cắt ngược từ cuối chuỗi tới khi parse được
    // (hữu ích khi Gemini trả về JSON bị truncate giữa chừng do maxOutputTokens)
    const parseWithTruncationRecovery = (candidate) => {
        // Thử parse nguyên bản trước
        let parsed = tryParse(candidate);
        if (parsed) return parsed;

        // Nếu fail, cắt dần ký tự cuối cho tới khi parse được
        // (mỗi bước cắt thử lại; tối đa 500 lần cắt để tránh loop vô hạn)
        let s = candidate;
        for (let i = 0; i < 500 && s.length > 50; i++) {
            s = s.slice(0, s.lastIndexOf(','));
            if (s.length < 10) break;
            // Thêm các dấu đóng cấu trúc phổ biến
            const candidates = [
                s + '}',
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

    // 1) Thử tìm JSON object lớn nhất trong text
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
        const candidate = text.slice(start, end + 1);
        const parsed = parseWithTruncationRecovery(candidate);
        if (parsed) return parsed;
    }

    // 2) Fallback regex
    const jsonMatch = text.match(/\{[\s\S]*\}/);
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
