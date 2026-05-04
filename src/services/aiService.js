const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    // Ép AI trả về đúng định dạng JSON
    generationConfig: {
        responseMimeType: "application/json",
    }
});
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
 * Tạo bài test câu hỏi trắc nghiệm
 */
async function generateCareerTest(data) {
    try {
        if (!data || Object.keys(data).length === 0) {
            throw new Error("Không nhận được dữ liệu đầu vào. Vui lòng gửi JSON có chứa targetJob, hobby, age.");
        }

        const { targetJob, hobby, age } = data;
        const prompt = `
      Bạn là chuyên gia nhân sự. Dựa trên nghề ${targetJob}, sở thích ${hobby}, tuổi ${age}.
      Tạo 5 câu hỏi trắc nghiệm kiểm tra độ phù hợp.
      Trả về JSON: {"testName": "...", "questions": [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "A"}]}
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Trích xuất JSON từ phản hồi của AI
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Không thể tạo JSON", raw: text };
    } catch (error) {
        console.error("Lỗi AI (Test):", error);
        throw error;
    }
}

module.exports = { getCareerAdvice, generateCareerTest };
