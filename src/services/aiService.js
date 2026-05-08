const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    // Ép AI trả về đúng định dạng JSON
    generationConfig: {
        responseMimeType: "application/json",
    }
});

/** Thang mức độ phù hợp / cảm xúc với từng khía cạnh nghề — thứ tự: thấp → cao (điểm tương ứng 1–5). */
const CAREER_FIT_LIKERT_OPTIONS = [
    "Không thích",
    "Ít thích",
    "Bình thường",
    "Thích",
    "Rất thích",
];
/**
 * Tư vấn nghề nghiệp tổng quát
 */
async function getCareerAdvice(info) {
    try {
        const prompt = `Bạn là chuyên gia hướng nghiệp. Hãy tư vấn nghề nghiệp cho người dùng dựa trên thông tin sau: ${JSON.stringify(info)}. Trả về kết quả dưới dạng văn bản tư vấn chuyên sâu.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Lỗi AI (Advice):", error);
        return "Xin lỗi, mình đang bận một chút, thử lại sau nhé!";
    }
}

/**
 * Tạo bài đánh giá phù hợp nghề: câu hỏi + thang Likert (không thích → rất thích).
 */
async function generateCareerTest(data) {
    try {
        if (!data || Object.keys(data).length === 0) {
            throw new Error("Không nhận được dữ liệu đầu vào. Vui lòng gửi JSON có chứa targetJob, hobby, age, educationLevel.");
        }

        const { targetJob, hobby, age, educationLevel } = data;
        if (targetJob === undefined || hobby === undefined || age === undefined || educationLevel === undefined) {
            throw new Error("Thiếu trường bắt buộc: targetJob, hobby, age, educationLevel.");
        }

        const scaleJson = JSON.stringify(CAREER_FIT_LIKERT_OPTIONS);
        const prompt = `Bạn là chuyên gia hướng nghiệp. Dựa trên: nghề mục tiêu "${targetJob}", sở thích "${hobby}", độ tuổi ${age}, trình độ học vấn "${educationLevel}".

Tạo đúng 5 câu hỏi đánh giá mức độ phù hợp với nghề đó. Mỗi câu mô tả một tình huống, đặc điểm công việc, kỹ năng hoặc môi trường liên quan nghề — người làm bài chọn mức cảm nhận của họ (không có đáp án đúng/sai).

BẮT BUỘC:
- Trường "options" trong JSON phải là mảng CHÍNH XÁC các chuỗi sau (cùng thứ tự): ${scaleJson}
- Không dùng nhãn khác, không thêm/bớt lựa chọn.
- Không dùng A/B/C/D; không có trường "answer".

Trả về một object JSON duy nhất có dạng:
{
  "testName": "string, tiêu đề ngắn cho bài đánh giá",
  "options": ${scaleJson},
  "questions": [
    { "question": "string, câu hỏi gợi mức độ thích/phù hợp với khía cạnh cụ thể của nghề" }
  ]
}`;

        const result = await model.generateContent(prompt);
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

        parsed.options = [...CAREER_FIT_LIKERT_OPTIONS];
        return parsed;
    } catch (error) {
        console.error("Lỗi AI (Test):", error);
        throw error;
    }
}

/**
 * Đánh giá mức độ phù hợp của user với nghề dựa trên câu trả lời
 * @param {string} testName - Tên bài test
 * @param {Array} questions - Mảng chứa { questionText, userAnswer }
 * @param {object} [userContext] - targetJob, educationLevel, hobby, age (và tùy chọn fullName)
 */
async function evaluateCareerTest(testName, questions, userContext = {}) {
    try {
        if (!questions || questions.length === 0) {
            throw new Error("Không có dữ liệu câu hỏi và câu trả lời để đánh giá.");
        }

        const qaList = questions.map((q, idx) => `Câu ${idx + 1}: ${q.questionText}\nTrả lời: ${q.userAnswer}`).join('\n\n');

        const ctx = userContext || {};
        const profileLine = [
            ctx.targetJob && `Nghề mong muốn: ${ctx.targetJob}`,
            ctx.educationLevel && `Trình độ học vấn: ${ctx.educationLevel}`,
            ctx.hobby != null && ctx.hobby !== "" && `Sở thích: ${ctx.hobby}`,
            ctx.age != null && ctx.age !== "" && `Tuổi: ${ctx.age}`,
            ctx.fullName && `Tên: ${ctx.fullName}`,
        ].filter(Boolean).join("\n");

        const prompt = `Bạn là chuyên gia hướng nghiệp. Người dùng đã làm bài đánh giá tên "${testName}".

Thông tin đăng ký (tham chiếu khi chấm):
${profileLine || "(không có thêm)"}

Các câu hỏi và câu trả lời theo thang mức độ thích/phù hợp:
${qaList}

Dựa trên thông tin trên, hãy phân tích mức độ phù hợp với **nghề mong muốn** của người dùng.

BẮT BUỘC:
Trả về một object JSON duy nhất có định dạng:
{
  "score": number, // ĐIỂM SỐ TỪ 1 ĐẾN 5 (thể hiện mức độ phù hợp). Có thể là số thập phân nhưng CHỈ GIỚI HẠN Ở MỨC 0.5 (Ví dụ: 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0).
  "summary": "string, Đánh giá tổng quan ngắn gọn (tối đa 3-4 câu)",
  "strengths": ["string", "string"], // Những điểm phù hợp thể hiện qua bài test
  "weaknesses": ["string", "string"], // Những điểm chưa phù hợp cần cân nhắc
  "advice": "string, Lời khuyên cuối cùng"
}`;

        const result = await model.generateContent(prompt);
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

        return parsed;
    } catch (error) {
        console.error("Lỗi AI (Evaluate):", error);
        throw error;
    }
}

module.exports = {
    getCareerAdvice,
    generateCareerTest,
    evaluateCareerTest,
    CAREER_FIT_LIKERT_OPTIONS,
};
