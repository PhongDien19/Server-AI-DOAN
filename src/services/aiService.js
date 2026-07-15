const { getGenerativeModelWithFallback } = require("./geminiClient");
const { getBenchmarkFromAI } = require("./searchService");

const model = getGenerativeModelWithFallback({
    model: "gemini-2.5-flash", // Default model, falls back to others on error
    generationConfig: {
        temperature: 0.2, // Giảm randomness để response nhanh hơn
        maxOutputTokens: 4096, // Tăng giới hạn output để tránh bị cắt cụt JSON
    },
    tools: [{ googleSearch: {} }]
});

const groundedModel = getGenerativeModelWithFallback({
    model: "gemini-2.5-flash",
    generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 8192
    },
    tools: [
        {
            googleSearch: {}
        }
    ]
});

// Simple cache để tránh gọi API trùng lặp
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 phút

/**
 * Chuyển lỗi thô từ Gemini thành thông điệp thân thiện với người dùng cuối.
 * Phân biệt 3 loại:
 *   - Timeout khi đang chờ quota -> "đang chờ quota được khôi phục"
 *   - 429 / Quota exceeded     -> "API miễn phí đã hết hạn mức hôm nay" + RetryInfo
 *   - Lỗi khác                 -> giữ nguyên message gốc hoặc fallback mặc định
 */
function friendlyAiError(error) {
    const rawMessage = (error && error.message) || '';
    if (rawMessage.includes('AI request timeout')) {
        return 'Hệ thống đang chờ quota Gemini được khôi phục. Vui lòng thử lại sau ít phút hoặc vào ngày mai.';
    }
    if (rawMessage.includes('429') ||
        rawMessage.includes('Quota exceeded') ||
        rawMessage.includes('Too Many Requests')) {
        const retryMatch = rawMessage.match(/retry in\s+([\d.]+)\s*s/i);
        const waitHint = retryMatch
            ? ` Vui lòng đợi khoảng ${Math.ceil(parseFloat(retryMatch[1]))} giây rồi thử lại.`
            : ' Vui lòng thử lại sau ít phút.';
        return 'API Gemini miễn phí đã hết hạn mức hôm nay.' + waitHint;
    }
    return rawMessage || 'Dịch vụ tư vấn AI tạm thời gián đoạn. Vui lòng thử lại sau!';
}

function getCacheKey(functionName, input) {
    return `${functionName}_${JSON.stringify(input)}`;
}

function getCachedResponse(key) {
    const cached = responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    responseCache.delete(key);
    return null;
}

function setCachedResponse(key, data) {
    responseCache.set(key, { data, timestamp: Date.now() });
}

// Timeout cho API calls (90 giây — đủ dài để chờ 1 lần RetryInfo của Gemini ~45s và thử model khác)
const API_TIMEOUT = 90000;

/** Thang mức độ phù hợp / cảm xúc với từng khía cạnh nghề — thứ tự: thấp → cao (điểm tương ứng 1–5). */
const CAREER_FIT_LIKERT_OPTIONS = [
    "Không thích",
    "Ít thích",
    "Bình thường",
    "Thích",
    "Rất thích",
];

/** Holland Career Interest Types */
const HOLLAND_TYPES = {
    R: "Realistic - Kỹ thuật (Thích làm việc với máy móc, công cụ, thực tế)",
    I: "Investigative - Nghiên cứu (Thích nghiên cứu, phân tích, khám phá)",
    A: "Artistic - Nghệ thuật (Thích sáng tạo, nghệ thuật, biểu đạt)",
    S: "Social - Xã hội (Thích giúp đỡ, dạy dỗ, tương tác với người khác)",
    E: "Enterprising - Quản lý (Thích lãnh đạo, thuyết phục, kinh doanh)",
    C: "Conventional - Nghiệp vụ (Thích tổ chức, quản lý dữ liệu, thủ tục)"
};

/** MBTI Personality Types */
const MBTI_TYPES = [
    "INTJ - Kiến trúc sư",
    "INTP - Nhà logic học",
    "ENTJ - Chỉ huy",
    "ENTP - Người tranh luận",
    "INFJ - Người bảo hộ",
    "INFP - Người lý tưởng hóa",
    "ENFJ - Người cho đi",
    "ENFP - Người truyền cảm hứng",
    "ISTJ - Người logistics",
    "ISFJ - Người nuôi dưỡng",
    "ESTJ - Giám đốc điều hành",
    "ESFJ - Người cung cấp",
    "ISTP - Nhà cơ khí",
    "ISFP - Người nghệ sĩ",
    "ESTP - Người thực thi",
    "ESFP - Người giải trí"
];

/** Big 5 Personality Traits */
const BIG5_TRAITS = {
    openness: "Mở rộng (Sáng tạo, tò mò, cởi mở với trải nghiệm mới)",
    conscientiousness: "Tận tâm (Có trách nhiệm, kỷ luật, đáng tin cậy)",
    extraversion: "Hướng ngoại (Vui vẻ, năng động, thích giao tiếp)",
    agreeableness: "Hòa đồng (Thân thiện, hợp tác, quan tâm đến người khác)",
    neuroticism: "Bất ổn cảm xúc (Dễ lo lắng, nhạy cảm, dễ bị stress)"
};

/** Cognitive Ability Test Types */
const COGNITIVE_TESTS = {
    logical: "Tư duy logic (Giải quyết vấn đề, suy luận logic)",
    verbal: "Khả năng ngôn ngữ (Hiểu biết từ vựng, đọc hiểu)",
    numerical: "Khả năng số học (Tính toán, phân tích số liệu)",
    analytical: "Khả năng phân tích (Phân tích thông tin, đưa ra kết luận)"
};

/** Values Assessment Types */
const VALUES_TYPES = {
    stability: "Ổn định (Công việc an toàn, ít biến động, lương ổn định)",
    achievement: "Thành tựu (Mục tiêu rõ ràng, thăng tiến nhanh, cạnh tranh)",
    balance: "Cân bằng (Thời gian cho gia đình, sức khỏe, sở thích cá nhân)",
    contribution: "Đóng góp (Công việc có ý nghĩa xã hội, giúp đỡ người khác)",
    autonomy: "Tự chủ (Làm việc độc lập, sáng tạo, tự quyết định)",
    relationships: "Mối quan hệ (Làm việc nhóm, giao tiếp, xây dựng mạng lưới)"
};

/** Likert options cho các loại test khác nhau */
const ASSESSMENT_LIKERT_OPTIONS = [
    "Hoàn toàn không đúng",
    "Không đúng",
    "Khó nói",
    "Đúng",
    "Hoàn toàn đúng"
];

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

/**
 * Tư vấn nghề nghiệp tổng quát
 *
 * Hỗ trợ 3 chế độ:
 *  - requestType = 'HOC' : trả về JSON { summary, schools[] } - danh sách trường đào tạo
 *  - requestType = 'LAM' : trả về JSON { summary, companies[] } - danh sách công ty tuyển dụng
 *  - mặc định          : trả về lời tư vấn dạng văn bản tự do
 */
async function getCareerAdvice(info) {
    const cacheKey = getCacheKey('getCareerAdvice', info);
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
        const query = info && info.question ? info.question : (typeof info === 'string' ? info : JSON.stringify(info));
        const context = (info && info.userContext) || {};

        if (context.requestType === 'HOC' || context.requestType === 'LAM') {
            return await getCareerAdviceStructured(query, context);
        }

        const contextStr = [
            context.educationLevel && `Học vấn: ${context.educationLevel}`,
            context.age && `Tuổi: ${context.age}`,
            context.hobby && `Sở thích: ${context.hobby}`
        ].filter(Boolean).join(', ');

        const prompt = `Bạn là chuyên gia tư vấn hướng nghiệp xuất sắc. 
Hãy trả lời trực tiếp câu hỏi/yêu cầu sau của người dùng: "${query}".

Thông tin bối cảnh của người dùng (chỉ sử dụng để điều chỉnh giọng điệu và mức độ tư vấn cho phù hợp, tránh gây mâu thuẫn):
- ${contextStr || "Không có thông tin thêm"}
${context.targetJob ? `- Ngành nghề mục tiêu hiện tại trong hồ sơ của họ (nhưng chỉ đề cập hoặc so sánh nếu câu hỏi của người dùng có liên quan trực tiếp đến việc chọn/chuyển đổi ngành nghề): ${context.targetJob}` : ''}

Yêu cầu tư vấn:
- Trả lời trực tiếp, chính xác vào câu hỏi/ngành nghề mà người dùng đang hỏi. Ví dụ, nếu họ hỏi về "kỹ sư xây dựng", hãy tư vấn về ngành kỹ sư xây dựng, không tư vấn về lập trình hay các ngành khác trừ khi họ yêu cầu so sánh.
- Tư vấn chuyên sâu, thiết thực, có tính định hướng và truyền cảm hứng.
- Ngắn gọn trong khoảng 200 - 300 từ.`;

        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AI request timeout')), API_TIMEOUT)
            )
        ]);
        const response = await result.response;
        const advice = response.text();

        setCachedResponse(cacheKey, advice);
        return advice;
    } catch (error) {
        console.error("Lỗi AI (Advice):", error);
        // Trả về object đặc biệt __error để /api/consult biết mà trả success=false
        return {
            __error: true,
            message: friendlyAiError(error),
        };
    }
}

/**
 * Tạo lời tư vấn hướng nghiệp nhanh dạng cấu trúc (JSON):
 *  - requestType = 'HOC' : danh sách trường đào tạo (kèm điểm chuẩn, link trường & link tuyển sinh)
 *  - requestType = 'LAM' : danh sách công ty tuyển dụng (kèm mô tả, vị trí & link)
 */
async function getCareerAdviceStructured(query, context = {}) {
    const requestType = context.requestType;
    const location = context.location || 'Việt Nam';
    const career = (query || '').trim() || context.targetJob || 'ngành nghề';

    if (requestType === 'HOC') {
        const prompt = `Bạn là chuyên gia tư vấn hướng nghiệp xuất sắc về GIÁO DỤC ĐẠI HỌC/CAO ĐẲNG tại Việt Nam.
Người dùng muốn hỏi: "${career}".

NHIỆM VỤ: Gợi ý danh sách các trường Đại học/Cao đẳng tại Việt Nam có đào tạo ngành "${career}" (ưu tiên khu vực "${location}", nếu không có thì mở rộng toàn quốc).

QUY TẮC BẮT BUỘC:
1. Chỉ trả về JSON hợp lệ, KHÔNG kèm markdown, KHÔNG giải thích thêm.
2. Cung cấp ĐÚNG từ 4 đến 6 trường.
3. Mỗi trường PHẢI có đầy đủ: schoolName, major (tên ngành), location (tỉnh/thành phố), description (mô tả ngắn 1-2 câu về điểm mạnh đào tạo ngành này), benchmarks (mô tả điểm chuẩn NĂM GẦN NHẤT, ví dụ "2025: 26.5"), benchmarkYear (năm của điểm chuẩn, ví dụ 2025), officialLink (URL trang chủ), admissionLink (URL cổng tuyển sinh).
4. QUY TẮC THANG ĐIỂM 30: Điểm chuẩn benchmarks PHẢI ở thang điểm tốt nghiệp THPT Quốc gia truyền thống (tối đa là 30.0). Tuyệt đối không dùng thang điểm 100 hay thang khác. Nếu trường dùng thang 100 (như Bách khoa TP.HCM) hoặc nhân hệ số (thang 40), hãy tự động quy đổi tương đương về thang điểm 30 (ví dụ 80/100 -> quy đổi thành điểm thi THPT tương ứng từ 24.0 đến 28.0).
5. CHỈ trả điểm chuẩn MỘT NĂM GẦN NHẤT (ưu tiên 2025), KHÔNG trả 3 năm.
6. Nếu không chắc chắn điểm chuẩn chính xác thì đặt "Đang cập nhật" và benchmarkYear = null.
7. BẮT BUỘC trả về JSON theo cấu trúc:
{
  "summary": "Tóm tắt ngắn 2-3 câu về ngành ${career} và triển vọng học tập tại Việt Nam.",
  "schools": [
    {
      "schoolName": "Tên trường",
      "major": "Tên ngành đào tạo",
      "location": "Tỉnh/Thành phố",
      "description": "Mô tả ngắn gọn...",
      "benchmarks": "Điểm chuẩn năm gần nhất (ví dụ: 2025: 26.5)",
      "benchmarkYear": 2025,
      "officialLink": "https://...",
      "admissionLink": "https://..."
    }
  ]
}
Chỉ trả về JSON.`;

        try {
            const result = await Promise.race([
                groundedModel.generateContent(prompt),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('AI request timeout')), API_TIMEOUT)
                )
            ]);
            const response = await result.response;
            const text = response.text().trim();
            const parsed = extractJsonFromText(text);
            if (parsed && Array.isArray(parsed.schools) && parsed.schools.length > 0) {
                parsed.schools = parsed.schools.filter(school => {
                    const bm = school.benchmarks;
                    return bm && bm !== 'null' && bm !== 'Đang cập nhật' && school.benchmarkYear !== null && school.benchmarkYear !== undefined;
                });
                return parsed;
            }
            return { __error: true, message: 'AI không trả về JSON hợp lệ cho danh sách trường.' };
        } catch (error) {
            console.error("Lỗi AI (Advice Structured - HOC):", error);
            return {
                __error: true,
                message: friendlyAiError(error),
            };
        }
    }

    if (requestType === 'LAM') {
        const prompt = `Bạn là chuyên gia tư vấn hướng nghiệp và nhân sự xuất sắc tại Việt Nam.
Người dùng muốn hỏi về CƠ HỘI VIỆC LÀM cho ngành: "${career}".

NHIỆM VỤ: Gợi ý danh sách các CÔNG TY/DOANH NGHIỆP tiêu biểu đang có nhu cầu tuyển dụng ngành "${career}" (ưu tiên khu vực "${location}", nếu không có thì mở rộng toàn quốc).

QUY TẮC BẮT BUỘC:
1. Chỉ trả về JSON hợp lệ, KHÔNG kèm markdown, KHÔNG giải thích thêm.
2. Cung cấp ĐÚNG từ 4 đến 6 công ty.
3. Mỗi công ty PHẢI có đầy đủ: companyName, industry (lĩnh vực), location (trụ sở chính), description (mô tả ngắn 1-2 câu về quy mô & môi trường), positions (chuỗi liệt kê các vị trí thường tuyển, ví dụ: "Lập trình viên Frontend, Kỹ sư Backend, BrSE"), careerLink (URL trang tuyển dụng hoặc trang chủ), demandLevel (mức độ tuyển dụng hiện tại: "Cao" / "Trung bình" / "Đang tuyển").
4. BẮT BUỘC trả về JSON theo cấu trúc:
{
  "summary": "Tóm tắt ngắn 2-3 câu về cơ hội việc làm ngành ${career} tại Việt Nam.",
  "companies": [
    {
      "companyName": "Tên công ty",
      "industry": "Lĩnh vực hoạt động",
      "location": "Tỉnh/Thành phố",
      "description": "Mô tả ngắn gọn...",
      "positions": "Các vị trí tuyển dụng",
      "careerLink": "https://...",
      "demandLevel": "Cao"
    }
  ]
}
Chỉ trả về JSON.`;

        try {
            const result = await Promise.race([
                groundedModel.generateContent(prompt),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('AI request timeout')), API_TIMEOUT)
                )
            ]);
            const response = await result.response;
            const text = response.text().trim();
            const parsed = extractJsonFromText(text);
            if (parsed && Array.isArray(parsed.companies) && parsed.companies.length > 0) {
                return parsed;
            }
            return { __error: true, message: 'AI không trả về JSON hợp lệ cho danh sách công ty.' };
        } catch (error) {
            console.error("Lỗi AI (Advice Structured - LAM):", error);
            return {
                __error: true,
                message: friendlyAiError(error),
            };
        }
    }

    return { __error: true, message: 'Chế độ tư vấn không hợp lệ.' };
}

/**
 * Tạo bài đánh giá phù hợp nghề: câu hỏi + thang Likert (không thích → rất thích).
 */
async function generateCareerTest(data) {
    const cacheKey = getCacheKey('generateCareerTest', data);
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
        if (!data || Object.keys(data).length === 0) {
            throw new Error("Không nhận được dữ liệu đầu vào. Vui lòng gửi JSON có chứa targetJob, hobby, age, educationLevel.");
        }

        const { targetJob, hobby, age, educationLevel } = data;
        if (targetJob === undefined || hobby === undefined || age === undefined || educationLevel === undefined) {
            throw new Error("Thiếu trường bắt buộc: targetJob, hobby, age, educationLevel.");
        }

        const prompt = `Tạo bài test nghề nghiệp cho: nghề "${targetJob}", sở thích "${hobby}", tuổi ${age}, học vấn "${educationLevel}".

QUY TẮC NGHIÊM NGẮT:
1. PHÙ HỢP VỚI LỨA TUỔI:
   - Tuổi ${age}: ${age < 18 ? 'Hỏi về sở thích học tập, hoạt động ngoại khóa, không hỏi kinh nghiệm làm việc' : age < 25 ? 'Hỏi về sở thích, kỹ năng học được ở trường, hoạt động nhóm' : 'Hỏi về sở thích công việc, kỹ năng chuyên môn, môi trường làm việc'}

2. PHÙ HỢP VỚI TRÌNH ĐỘ HỌC VẤN:
   - Học vấn "${educationLevel}": ${educationLevel.toLowerCase().includes('cấp 3') || educationLevel.toLowerCase().includes('thpt') ? 'Dùng ngôn ngữ đơn giản, tránh thuật ngữ chuyên môn cao' : educationLevel.toLowerCase().includes('đại học') || educationLevel.toLowerCase().includes('cao đẳng') ? 'Dùng thuật ngữ chuyên môn vừa phải' : 'Có thể dùng thuật ngữ chuyên môn'}

3. TRÁNH TỪ NHẠY CẢM:
   - KHÔNG hỏi về: tiền lương, chính trị, tôn giáo, giới tính, sắc tộc, sức khỏe cá nhân, hoàn cảnh gia đình
   - KHÔNG dùng từ: lương, tiền, chính trị, tôn giáo, bệnh, nghèo, giàu, phân biệt

4. TẬP TRUNG VÀO:
   - Sở thích cá nhân liên quan đến công việc
   - Kỹ năng mềm (giao tiếp, làm việc nhóm, sáng tạo)
   - Sở thích với các hoạt động cụ thể của nghề
   - Tính cách phù hợp với môi trường làm việc

Yêu cầu: Tạo đúng 5 câu hỏi về mức độ phù hợp với nghề. Mỗi câu hỏi phải:
- Dễ hiểu, tích cực
- Liên quan trực tiếp đến khía cạnh công việc
- Sử dụng ngôn ngữ phù hợp với lứa tuổi và học vấn
- Tránh mọi từ nhạy cảm

Trả về JSON:
{
  "testName": "Tên bài test ngắn, phù hợp với lứa tuổi",
  "options": ["Không thích", "Ít thích", "Bình thường", "Thích", "Rất thích"],
  "questions": [
    {"question": "Câu hỏi 1 - phù hợp với quy tắc trên"},
    {"question": "Câu hỏi 2 - phù hợp với quy tắc trên"},
    {"question": "Câu hỏi 3 - phù hợp với quy tắc trên"},
    {"question": "Câu hỏi 4 - phù hợp với quy tắc trên"},
    {"question": "Câu hỏi 5 - phù hợp với quy tắc trên"}
  ]
}`;

        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AI request timeout')), API_TIMEOUT)
            )
        ]);
        const response = await result.response;
        const text = response.text().trim();

        const parsed = extractJsonFromText(text);

        if (!parsed || !Array.isArray(parsed.questions)) {
            return { error: "Không thể tạo JSON", raw: text };
        }

        parsed.options = [...CAREER_FIT_LIKERT_OPTIONS];
        setCachedResponse(cacheKey, parsed);
        return parsed;
    } catch (error) {
        console.error("Lỗi AI (Test):", error);
        throw error;
    }
}

/**
 * Trích xuất điểm chuẩn từ raw snippet của SerpAPI
 */
function extractSpecificBenchmarks(snippets) {
    const scores = [];
    const scoreRegex = /\b(1[5-9]|2\d|30)(?:[.,]\d{1,2})?\b/g;

    for (const snippet of snippets) {
        const snippetText = snippet.snippet || '';
        // Loại bỏ các mẫu ngày tháng dạng dd/mm hoặc mm/dd trước để tránh nhận diện sai
        const cleanedText = snippetText.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, '');
        // Tìm pattern điểm chuẩn: VD "26.5", "25.0", "28.25", "24" trong snippet
        const scoreMatches = cleanedText.match(scoreRegex);
        if (scoreMatches) {
            const validScores = scoreMatches
                .map(s => parseFloat(s.replace(',', '.')))
                .filter(n => n >= 15 && n <= 30); // Lọc điểm hợp lệ (15-30)
            if (validScores.length > 0) {
                scores.push(...validScores);
            }
        }
    }
    // Trả về điểm trung bình hoặc điểm cao nhất tìm được
    if (scores.length === 0) return null;
    // Lấy median
    scores.sort((a, b) => a - b);
    const mid = Math.floor(scores.length / 2);
    return scores.length % 2 !== 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
}

/**
 * Bước 1: Đánh giá phù hợp nghề - AI tạo danh sách trường theo ngành + khu vực
 * (Chưa có điểm chuẩn, sẽ được bổ sung sau bằng AI Grounding)
 */
async function evaluateCareerTest(testName, questions, userContext = {}) {
    const cacheKey = getCacheKey('evaluateCareerTest', { testName, questions, userContext });
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
        if (!questions || questions.length === 0) {
            throw new Error("Không có dữ liệu câu hỏi và câu trả lời để đánh giá.");
        }

        const qaList = questions.map((q, idx) => `Q${idx + 1}: ${q.questionText} → ${q.userAnswer}`).join('\n');

        const ctx = userContext || {};
        const isStudent = ctx.status === 'student';
        const location = ctx.location || 'Việt Nam';

        // Prompt cho học sinh - ưu tiên trường theo khu vực
        const studentJsonFormat = `{
  "score": 1-5 (decimal 0.5 steps),
  "summary": "Phân tích ngắn gọn cho học sinh, tập trung vào tiềm năng và định hướng.",
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "weaknesses": ["Điểm yếu cần cải thiện 1", "Điểm yếu cần cải thiện 2"],
  "advice": "Lời khuyên cụ thể cho học sinh để chuẩn bị cho ngành này.",
  "trainingInstitutions": [
    {
      "schoolName": "Tên trường đại học/cao đẳng phù hợp với khu vực ${location}",
      "schoolLocation": "Tỉnh/Thành phố của trường",
      "description": "Mô tả ngắn về điểm nổi bật của trường liên quan đến ngành này.",
      "benchmark": null,
      "benchmarkYear": null,
      "officialLink": null,
      "admissionLink": null
    }
  ]
}`;

        const workingJsonFormat = `{
  "score": 1-5 (decimal 0.5 steps),
  "summary": "Phân tích ngắn gọn cho sinh viên/người đi làm, tập trung vào phát triển sự nghiệp.",
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "weaknesses": ["Điểm yếu cần cải thiện 1", "Điểm yếu cần cải thiện 2"],
  "advice": "Lời khuyên cụ thể để thăng tiến trong ngành này.",
  "roadmap": [
    "Giai đoạn 1: Học các kiến thức nền tảng về ngành.",
    "Giai đoạn 2: Xây dựng 1-2 dự án cá nhân để áp dụng kiến thức.",
    "Giai đoạn 3: Tìm hiểu và thi các chứng chỉ cơ bản."
  ],
  "certificates": ["Chứng chỉ A", "Chứng chỉ B"],
  "basicSalary": "Mức lương khởi điểm cho vị trí Junior dao động từ 10-15 triệu VNĐ/tháng.",
  "laborMarket": "Nhu cầu nhân lực cho ngành này đang tăng trưởng mạnh, đặc biệt ở các thành phố lớn."
}`;

        // Prompt cho AI - ưu tiên trường theo khu vực, KHÔNG cần điền điểm chuẩn
        const prompt = `Đánh giá phù hợp nghề cho "${testName}".

THÔNG TIN USER:
- Ngành nghề quan tâm: ${ctx.targetJob || 'Chưa xác định'}
- Khu vực sinh sống/mong muốn: ${location}
- Học vấn: ${ctx.educationLevel || 'THPT'}
- Độ tuổi: ${ctx.age || 'N/A'}

QUY TẮC BẮT BUỘC:
1. Ưu tiên các trường Đại học/Cao đẳng nằm trong khu vực "${location}" hoặc lân cận.
2. Nếu ngành nghề phù hợp nhưng không có trường tốt trong khu vực, hãy gợi ý trường ở khu vực gần nhất có đào tạo.
3. CHỈ cung cấp danh sách trường phù hợp, KHÔNG cần điền điểm chuẩn (sẽ được cập nhật tự động sau).

Câu trả lời của học sinh:
${qaList}

Hãy trả về JSON theo định dạng sau:
${isStudent ? studentJsonFormat : workingJsonFormat}

Chỉ trả về JSON, không kèm giải thích.`;

        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AI request timeout')), API_TIMEOUT)
            )
        ]);
        const response = await result.response;
        const text = response.text().trim();

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }

        if (!parsed) {
            return { error: "Không thể tạo JSON", raw: text };
        }

        // BƯỚC 2: Gọi AI Grounding để lấy điểm chuẩn cho TỪNG trường trong danh sách
        if (isStudent && parsed.trainingInstitutions && Array.isArray(parsed.trainingInstitutions)) {
            const targetJob = ctx.targetJob || '';
            const filteredInstitutions = [];

            for (const school of parsed.trainingInstitutions) {
                if (school.schoolName && targetJob) {
                    try {
                        const benchmarkResult = await getBenchmarkFromAI(school.schoolName, targetJob);
                        if (benchmarkResult && benchmarkResult.benchmark !== null && benchmarkResult.benchmark !== undefined) {
                            school.benchmark = benchmarkResult.benchmark;
                            school.benchmarkYear = benchmarkResult.year;
                            filteredInstitutions.push(school);
                        }
                        // Delay nhẹ để tránh rate limit
                        await new Promise(resolve => setTimeout(resolve, 800));
                    } catch (err) {
                        console.warn(`[AI Service] Lỗi khi lấy điểm chuẩn cho ${school.schoolName}:`, err.message);
                    }
                }
            }
            parsed.trainingInstitutions = filteredInstitutions;
            parsed.benchmarkSource = 'gemini-grounding';
        } else {
            parsed.benchmarkSource = 'ai_estimation';
        }

        setCachedResponse(cacheKey, parsed);
        return parsed;
    } catch (error) {
        console.error("Lỗi AI (Evaluate):", error);
        throw error;
    }
}

/**
 * Tạo bài test sở thích nghề nghiệp theo lý thuyết Holland
 */
async function generateHollandTest(data) {
    const cacheKey = getCacheKey('generateHollandTest', data);
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
        if (!data || Object.keys(data).length === 0) {
            throw new Error("Không nhận được dữ liệu đầu vào.");
        }

        const { targetJob, age, educationLevel } = data;

        const hollandTypes = Object.entries(HOLLAND_TYPES).map(([code, desc]) => `${code}: ${desc}`).join('\n');

        const prompt = `Tạo bài test sở thích nghề nghiệp theo lý thuyết Holland cho: nghề "${targetJob}", tuổi ${age}, học vấn "${educationLevel}".

Lý thuyết Holland gồm 6 loại sở thích:
${hollandTypes}

Yêu cầu: Tạo 12 câu hỏi (2 câu cho mỗi loại sở thích Holland). Mỗi câu hỏi phải:
- Phù hợp với lứa tuổi ${age} và trình độ "${educationLevel}"
- Không dùng từ nhạy cảm
- Tập trung vào sở thích và hoạt động

Trả về JSON:
{
  "testName": "Bài test sở thích nghề nghiệp Holland",
  "hollandTypes": ${JSON.stringify(HOLLAND_TYPES)},
  "options": ["Hoàn toàn không đúng", "Không đúng", "Khó nói", "Đúng", "Hoàn toàn đúng"],
  "questions": [
    {"question": "Câu hỏi về Realistic", "hollandType": "R"},
    {"question": "Câu hỏi về Investigative", "hollandType": "I"},
    {"question": "Câu hỏi về Artistic", "hollandType": "A"},
    {"question": "Câu hỏi về Social", "hollandType": "S"},
    {"question": "Câu hỏi về Enterprising", "hollandType": "E"},
    {"question": "Câu hỏi về Conventional", "hollandType": "C"}
  ]
}`;

        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AI request timeout')), API_TIMEOUT)
            )
        ]);
        const response = await result.response;
        const text = response.text().trim();

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }

        if (!parsed || !Array.isArray(parsed.questions)) {
            return { error: "Không thể tạo JSON", raw: text };
        }

        parsed.options = [...ASSESSMENT_LIKERT_OPTIONS];
        setCachedResponse(cacheKey, parsed);
        return parsed;
    } catch (error) {
        console.error("Lỗi AI (Holland Test):", error);
        throw error;
    }
}

/**
 * Tạo bài test tính cách (MBTI & Big 5)
 */
async function generatePersonalityTest(data) {
    const cacheKey = getCacheKey('generatePersonalityTest', data);
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
        if (!data || Object.keys(data).length === 0) {
            throw new Error("Không nhận được dữ liệu đầu vào.");
        }

        const { targetJob, age, educationLevel } = data;

        const big5Traits = Object.entries(BIG5_TRAITS).map(([key, desc]) => `${key}: ${desc}`).join('\n');

        const prompt = `Tạo bài test tính cách cho: nghề "${targetJob}", tuổi ${age}, học vấn "${educationLevel}".

Big 5 Personality Traits:
${big5Traits}

Yêu cầu: Tạo 15 câu hỏi (3 câu cho mỗi đặc điểm Big 5). Mỗi câu hỏi phải:
- Phù hợp với lứa tuổi ${age} và trình độ "${educationLevel}"
- Không dùng từ nhạy cảm
- Tập trung vào hành vi và sở thích

Trả về JSON:
{
  "testName": "Bài test tính cách Big 5",
  "big5Traits": ${JSON.stringify(BIG5_TRAITS)},
  "mbtiTypes": ${JSON.stringify(MBTI_TYPES)},
  "options": ["Hoàn toàn không đúng", "Không đúng", "Khó nói", "Đúng", "Hoàn toàn đúng"],
  "questions": [
    {"question": "Câu hỏi về openness", "trait": "openness"},
    {"question": "Câu hỏi về conscientiousness", "trait": "conscientiousness"},
    {"question": "Câu hỏi về extraversion", "trait": "extraversion"},
    {"question": "Câu hỏi về agreeableness", "trait": "agreeableness"},
    {"question": "Câu hỏi về neuroticism", "trait": "neuroticism"}
  ]
}`;

        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AI request timeout')), API_TIMEOUT)
            )
        ]);
        const response = await result.response;
        const text = response.text().trim();

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }

        if (!parsed || !Array.isArray(parsed.questions)) {
            return { error: "Không thể tạo JSON", raw: text };
        }

        parsed.options = [...ASSESSMENT_LIKERT_OPTIONS];
        setCachedResponse(cacheKey, parsed);
        return parsed;
    } catch (error) {
        console.error("Lỗi AI (Personality Test):", error);
        throw error;
    }
}

/**
 * Tạo bài test năng lực nhận thức
 */
async function generateCognitiveTest(data) {
    const cacheKey = getCacheKey('generateCognitiveTest', data);
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
        if (!data || Object.keys(data).length === 0) {
            throw new Error("Không nhận được dữ liệu đầu vào.");
        }

        const { targetJob, age, educationLevel } = data;

        const cognitiveTypes = Object.entries(COGNITIVE_TESTS).map(([key, desc]) => `${key}: ${desc}`).join('\n');

        const prompt = `Tạo bài test năng lực nhận thức cho: nghề "${targetJob}", tuổi ${age}, học vấn "${educationLevel}".

Các loại năng lực:
${cognitiveTypes}

Yêu cầu: Tạo 12 câu hỏi trắc nghiệm (3 câu cho mỗi loại năng lực). Mỗi câu hỏi phải:
- Phù hợp với lứa tuổi ${age} và trình độ "${educationLevel}"
- Có 4 lựa chọn A, B, C, D
- Có 1 đáp án đúng
- Kiểm tra tư duy logic, ngôn ngữ, phân tích

Trả về JSON:
{
  "testName": "Bài test năng lực nhận thức",
  "cognitiveTypes": ${JSON.stringify(COGNITIVE_TESTS)},
  "questions": [
    {
      "question": "Câu hỏi logic",
      "type": "logical",
      "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
      "correctAnswer": "A"
    }
  ]
}`;

        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AI request timeout')), API_TIMEOUT)
            )
        ]);
        const response = await result.response;
        const text = response.text().trim();

        const parsed = extractJsonFromText(text);

        if (!parsed || !Array.isArray(parsed.questions)) {
            return { error: "Không thể tạo JSON", raw: text };
        }

        setCachedResponse(cacheKey, parsed);
        return parsed;
    } catch (error) {
        console.error("Lỗi AI (Cognitive Test):", error);
        throw error;
    }
}

/**
 * Đánh giá kết quả bài test Holland
 */
async function evaluateHollandTest(questions, userContext = {}) {
    const cacheKey = getCacheKey('evaluateHollandTest', { questions, userContext });
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
        if (!questions || questions.length === 0) {
            throw new Error("Không có dữ liệu câu hỏi và câu trả lời để đánh giá.");
        }

        const qaList = questions.map((q, idx) => `Q${idx + 1}: ${q.questionText} → ${q.userAnswer} (${q.hollandType})`).join('\n');

        const ctx = userContext || {};
        const profile = [
            ctx.targetJob && `Job: ${ctx.targetJob}`,
            ctx.educationLevel && `Education: ${ctx.educationLevel}`,
            ctx.age && `Age: ${ctx.age}`,
        ].filter(Boolean).join(', ');

        const prompt = `Đánh giá sở thích nghề nghiệp theo Holland.

Profile: ${profile || "N/A"}

Answers:
${qaList}

Tính điểm cho 6 loại Holland (R, I, A, S, E, C) dựa trên câu trả lời.
Điểm từ 1-5 cho mỗi loại (1: thấp, 5: cao).

Return JSON:
{
  "hollandScores": {"R": 3.5, "I": 4.2, "A": 2.1, "S": 4.8, "E": 3.2, "C": 2.9},
  "topTypes": ["S", "I", "E"],
  "summary": "Phân tích sở thích chính",
  "careerSuggestions": ["Nghề phù hợp 1", "Nghề phù hợp 2", "Nghề phù hợp 3"],
  "advice": "Lời khuyên phát triển"
}`;

        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AI request timeout')), API_TIMEOUT)
            )
        ]);
        const response = await result.response;
        const text = response.text().trim();

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }

        if (!parsed) {
            return { error: "Không thể tạo JSON", raw: text };
        }

        setCachedResponse(cacheKey, parsed);
        return parsed;
    } catch (error) {
        console.error("Lỗi AI (Evaluate Holland):", error);
        throw error;
    }
}

/**
 * Đánh giá kết quả bài test tính cách
 */
async function evaluatePersonalityTest(questions, userContext = {}) {
    const cacheKey = getCacheKey('evaluatePersonalityTest', { questions, userContext });
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
        if (!questions || questions.length === 0) {
            throw new Error("Không có dữ liệu câu hỏi và câu trả lời để đánh giá.");
        }

        const qaList = questions.map((q, idx) => `Q${idx + 1}: ${q.questionText} → ${q.userAnswer} (${q.trait})`).join('\n');

        const ctx = userContext || {};
        const profile = [
            ctx.targetJob && `Job: ${ctx.targetJob}`,
            ctx.educationLevel && `Education: ${ctx.educationLevel}`,
            ctx.age && `Age: ${ctx.age}`,
        ].filter(Boolean).join(', ');

        const prompt = `Đánh giá tính cách Big 5 và gợi ý MBTI.

Profile: ${profile || "N/A"}

Answers:
${qaList}

Tính điểm Big 5 (1-5 cho mỗi trait) và gợi ý loại MBTI phù hợp nhất.

Return JSON:
{
  "big5Scores": {
    "openness": 4.2,
    "conscientiousness": 3.8,
    "extraversion": 2.9,
    "agreeableness": 4.1,
    "neuroticism": 2.3
  },
  "suggestedMBTI": "INFJ - Người bảo hộ",
  "personalitySummary": "Phân tích tính cách tổng quan",
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "careerFit": ["Nghề phù hợp với tính cách này"],
  "developmentAdvice": "Lời khuyên phát triển cá nhân"
}`;

        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AI request timeout')), API_TIMEOUT)
            )
        ]);
        const response = await result.response;
        const text = response.text().trim();

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }

        if (!parsed) {
            return { error: "Không thể tạo JSON", raw: text };
        }

        setCachedResponse(cacheKey, parsed);
        return parsed;
    } catch (error) {
        console.error("Lỗi AI (Evaluate Personality):", error);
        throw error;
    }
}

/**
 * Đánh giá kết quả bài test năng lực
 */
async function evaluateCognitiveTest(questions, userAnswers, userContext = {}) {
    const cacheKey = getCacheKey('evaluateCognitiveTest', { questions, userAnswers, userContext });
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
        if (!questions || questions.length === 0 || !userAnswers || userAnswers.length === 0) {
            throw new Error("Không có dữ liệu câu hỏi và câu trả lời để đánh giá.");
        }

        const results = questions.map((q, idx) => {
            const userAnswer = userAnswers[idx];
            const isCorrect = userAnswer === q.correctAnswer;
            return `Q${idx + 1}: ${q.question} → User: ${userAnswer}, Correct: ${q.correctAnswer}, Result: ${isCorrect ? 'Đúng' : 'Sai'} (${q.type})`;
        }).join('\n');

        const ctx = userContext || {};
        const profile = [
            ctx.targetJob && `Job: ${ctx.targetJob}`,
            ctx.educationLevel && `Education: ${ctx.educationLevel}`,
            ctx.age && `Age: ${ctx.age}`,
        ].filter(Boolean).join(', ');

        const prompt = `Đánh giá năng lực nhận thức.

Profile: ${profile || "N/A"}

Results:
${results}

Tính điểm cho từng loại năng lực (logical, verbal, numerical, analytical) từ 1-5.
Tính tỷ lệ đúng tổng thể.

Return JSON:
{
  "cognitiveScores": {
    "logical": 4.2,
    "verbal": 3.8,
    "numerical": 4.5,
    "analytical": 3.9
  },
  "overallScore": 4.1,
  "correctPercentage": 85,
  "strengths": ["Năng lực mạnh 1", "Năng lực mạnh 2"],
  "weaknesses": ["Năng lực cần cải thiện 1", "Năng lực cần cải thiện 2"],
  "careerImplications": "Ý nghĩa cho sự nghiệp",
  "improvementSuggestions": ["Gợi ý cải thiện 1", "Gợi ý cải thiện 2"]
}`;

        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AI request timeout')), API_TIMEOUT)
            )
        ]);
        const response = await result.response;
        const text = response.text().trim();

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }

        if (!parsed) {
            return { error: "Không thể tạo JSON", raw: text };
        }

        setCachedResponse(cacheKey, parsed);
        return parsed;
    } catch (error) {
        console.error("Lỗi AI (Evaluate Cognitive):", error);
        throw error;
    }
}

/**
 * Tạo bài test hệ giá trị cá nhân
 */
async function generateValuesTest(data) {
    const cacheKey = getCacheKey('generateValuesTest', data);
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
        if (!data || Object.keys(data).length === 0) {
            throw new Error("Không nhận được dữ liệu đầu vào.");
        }

        const { targetJob, age, educationLevel } = data;

        const valuesTypes = Object.entries(VALUES_TYPES).map(([key, desc]) => `${key}: ${desc}`).join('\n');

        const prompt = `Tạo bài test hệ giá trị cá nhân cho: nghề "${targetJob}", tuổi ${age}, học vấn "${educationLevel}".

Hệ giá trị cá nhân gồm 6 loại:
${valuesTypes}

Yêu cầu: Tạo 12 câu hỏi (2 câu cho mỗi giá trị). Mỗi câu hỏi phải:
- Phù hợp với lứa tuổi ${age} và trình độ "${educationLevel}"
- Không dùng từ nhạy cảm
- Tập trung vào điều quan trọng với cá nhân

Trả về JSON:
{
  "testName": "Bài test hệ giá trị cá nhân",
  "valuesTypes": ${JSON.stringify(VALUES_TYPES)},
  "options": ["Hoàn toàn không đúng", "Không đúng", "Khó nói", "Đúng", "Hoàn toàn đúng"],
  "questions": [
    {"question": "Câu hỏi về stability", "valueType": "stability"},
    {"question": "Câu hỏi về achievement", "valueType": "achievement"},
    {"question": "Câu hỏi về balance", "valueType": "balance"},
    {"question": "Câu hỏi về contribution", "valueType": "contribution"},
    {"question": "Câu hỏi về autonomy", "valueType": "autonomy"},
    {"question": "Câu hỏi về relationships", "valueType": "relationships"}
  ]
}`;

        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AI request timeout')), API_TIMEOUT)
            )
        ]);
        const response = await result.response;
        const text = response.text().trim();

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }

        if (!parsed || !Array.isArray(parsed.questions)) {
            return { error: "Không thể tạo JSON", raw: text };
        }

        parsed.options = [...ASSESSMENT_LIKERT_OPTIONS];
        setCachedResponse(cacheKey, parsed);
        return parsed;
    } catch (error) {
        console.error("Lỗi AI (Values Test):", error);
        throw error;
    }
}

/**
 * Đánh giá kết quả bài test Values
 */
async function evaluateValuesTest(questions, userContext = {}) {
    const cacheKey = getCacheKey('evaluateValuesTest', { questions, userContext });
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
        if (!questions || questions.length === 0) {
            throw new Error("Không có dữ liệu câu hỏi và câu trả lời để đánh giá.");
        }

        const qaList = questions.map((q, idx) => `Q${idx + 1}: ${q.questionText} → ${q.userAnswer} (${q.valueType})`).join('\n');

        const ctx = userContext || {};
        const profile = [
            ctx.targetJob && `Job: ${ctx.targetJob}`,
            ctx.educationLevel && `Education: ${ctx.educationLevel}`,
            ctx.age && `Age: ${ctx.age}`,
        ].filter(Boolean).join(', ');

        const prompt = `Đánh giá hệ giá trị cá nhân.

Profile: ${profile || "N/A"}

Answers:
${qaList}

Tính điểm cho 6 giá trị (stability, achievement, balance, contribution, autonomy, relationships) từ 1-5.
Điểm từ 1-5 cho mỗi giá trị (1: thấp, 5: cao).

Return JSON:
{
  "valuesScores": {"stability": 3.5, "achievement": 4.2, "balance": 4.8, "contribution": 3.2, "autonomy": 2.9, "relationships": 4.1},
  "topValues": ["balance", "contribution", "relationships"],
  "valuesSummary": "Phân tích hệ giá trị chính",
  "workEnvironment": "Môi trường làm việc phù hợp với giá trị này",
  "advice": "Lời khuyên phát triển giá trị cá nhân"
}`;

        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AI request timeout')), API_TIMEOUT)
            )
        ]);
        const response = await result.response;
        const text = response.text().trim();

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }

        if (!parsed) {
            return { error: "Không thể tạo JSON", raw: text };
        }

        setCachedResponse(cacheKey, parsed);
        return parsed;
    } catch (error) {
        console.error("Lỗi AI (Evaluate Values):", error);
        throw error;
    }
}

/**
 * Tổng hợp đánh giá từ 4 trụ cột chính
 */
async function generateComprehensiveAssessment(allResults, userContext = {}) {
    const cacheKey = getCacheKey('generateComprehensiveAssessment', { allResults, userContext });
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
        const ctx = userContext || {};
        const profile = [
            ctx.targetJob && `Nghề mục tiêu: ${ctx.targetJob}`,
            ctx.educationLevel && `Học vấn: ${ctx.educationLevel}`,
            ctx.age && `Tuổi: ${ctx.age}`,
            ctx.hobby && `Sở thích: ${ctx.hobby}`,
        ].filter(Boolean).join('\n');

        // Chuẩn bị dữ liệu từ các bài test
        const hollandData = allResults.holland ? `
Holland Scores: ${JSON.stringify(allResults.holland.hollandScores)}
Top Holland Types: ${allResults.holland.topTypes?.join(', ')}
Holland Summary: ${allResults.holland.summary}
` : 'Không có dữ liệu Holland';

        const personalityData = allResults.personality ? `
Big5 Scores: ${JSON.stringify(allResults.personality.big5Scores)}
Suggested MBTI: ${allResults.personality.suggestedMBTI}
Personality Summary: ${allResults.personality.personalitySummary}
` : 'Không có dữ liệu Personality';

        const cognitiveData = allResults.cognitive ? `
Cognitive Scores: ${JSON.stringify(allResults.cognitive.cognitiveScores)}
Overall Cognitive: ${allResults.cognitive.overallScore}/5
Correct Percentage: ${allResults.cognitive.correctPercentage}%
` : 'Không có dữ liệu Cognitive';

        const valuesData = allResults.values ? `
Values Scores: ${JSON.stringify(allResults.values.valuesScores)}
Top Values: ${allResults.values.topValues?.join(', ')}
Values Summary: ${allResults.values.valuesSummary}
` : 'Không có dữ liệu Values';

        const careerFitData = allResults.careerFit ? `
Career Fit Score: ${allResults.careerFit.score}/5
Career Fit Summary: ${allResults.careerFit.summary}
` : 'Không có dữ liệu Career Fit';

        const prompt = `TỔNG HỢP ĐÁNH GIÁ PHÙ HỢP NGHỀ NGHIỆP THEO 4 TRỤ CỘT

PROFILE:
${profile}

=== 4 TRỤ CỘT ĐÁNH GIÁ ===

1. SỞ THÍCH NGHỀ NGHIỆP (RIASEC/Holland):
${hollandData}

2. TÍNH CÁCH (Personality):
${personalityData}

3. NĂNG LỰC (Cognitive Ability):
${cognitiveData}

4. HỆ GIÁ TRỊ (Values):
${valuesData}

5. PHÙ HỢP NGHỀ TỔNG QUAN:
${careerFitData}

YÊU CẦU PHÂN TÍCH:
- Tính điểm phù hợp tổng thể (0-100%)
- Xác định vùng: Tối ưu (80-100%), Tiềm năng (50-79%), Rủi ro (<50%)
- Phân tích sự giao thoa giữa 4 trụ cột
- Đưa ra khuyến nghị nghề nghiệp cụ thể
- Gợi ý phát triển kỹ năng

Return JSON:
{
  "overallCompatibility": 75,
  "compatibilityZone": "Tiềm năng",
  "pillarScores": {
    "interest": 4.2,
    "personality": 3.8,
    "ability": 4.1,
    "values": 4.5
  },
  "comprehensiveSummary": "Phân tích tổng hợp 4 trụ cột",
  "strengths": ["Điểm mạnh từ các trụ cột"],
  "weaknesses": ["Điểm yếu cần cải thiện"],
  "recommendedCareers": ["Nghề 1", "Nghề 2", "Nghề 3"],
  "skillDevelopment": ["Kỹ năng cần phát triển"],
  "workEnvironment": "Môi trường làm việc phù hợp",
  "careerAdvice": "Lời khuyên nghề nghiệp tổng thể"
}`;

        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AI request timeout')), API_TIMEOUT)
            )
        ]);
        const response = await result.response;
        const text = response.text().trim();

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }

        if (!parsed) {
            return { error: "Không thể tạo JSON", raw: text };
        }

        setCachedResponse(cacheKey, parsed);
        return parsed;
    } catch (error) {
        console.error("Lỗi AI (Comprehensive Assessment):", error);
        throw error;
    }
}

module.exports = {
    getCareerAdvice,
    generateCareerTest,
    evaluateCareerTest,
    generateHollandTest,
    generatePersonalityTest,
    generateCognitiveTest,
    generateValuesTest,
    evaluateHollandTest,
    evaluatePersonalityTest,
    evaluateCognitiveTest,
    evaluateValuesTest,
    generateComprehensiveAssessment,
    CAREER_FIT_LIKERT_OPTIONS,
    ASSESSMENT_LIKERT_OPTIONS,
    HOLLAND_TYPES,
    MBTI_TYPES,
    BIG5_TRAITS,
    COGNITIVE_TESTS,
    VALUES_TYPES,
};
