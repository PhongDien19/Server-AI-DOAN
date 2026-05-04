const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const analyzeCareer = async (userData) => {
    try {
        const prompt = `
            Hãy đóng vai một chuyên gia tư vấn hướng nghiệp. 
            Phân tích dữ liệu người dùng sau và đưa ra lời khuyên nghề nghiệp phù hợp.
            Dữ liệu người dùng: ${JSON.stringify(userData)}
            Yêu cầu: Trả về kết quả dưới dạng JSON có cấu trúc rõ ràng.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Service Error:", error);
        throw error;
    }
};

const generateCareerTest = async (data) => {
    try {
        const { targetJob, hobby, age } = data;
        const prompt = `
            Bạn là chuyên gia nhân sự và hướng nghiệp. 
            Dựa trên thông tin sau:
            - Nghề nghiệp mục tiêu: ${targetJob}
            - Sở thích: ${hobby}
            - Độ tuổi: ${age}

            Hãy tạo một bài test gồm 5 câu hỏi trắc nghiệm để kiểm tra mức độ phù hợp của người này với nghề ${targetJob}.
            Yêu cầu:
            1. Câu hỏi phải thực tế và liên quan đến kỹ năng cần thiết cho nghề ${targetJob}.
            2. Trả về định dạng JSON theo cấu trúc:
            {
              "testName": "Bài kiểm tra mức độ phù hợp với nghề ...",
              "questions": [
                {
                  "question": "Nội dung câu hỏi?",
                  "options": ["A", "B", "C", "D"],
                  "answer": "Đáp án đúng (A/B/C/D)"
                }
              ]
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        // Trích xuất JSON từ text (đôi khi AI trả về markdown ```json ... ```)
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Không thể tạo JSON", raw: text };
    } catch (error) {
        console.error("AI Generate Test Error:", error);
        throw error;
    }
};

module.exports = { analyzeCareer, generateCareerTest };
