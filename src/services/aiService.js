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

module.exports = { analyzeCareer };
