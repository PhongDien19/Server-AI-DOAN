const { GoogleGenerativeAI } = require("@google/generative-ai");
const UserAccount = require("../models/UserAccount");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite", generationConfig: { temperature: 0.7 } });

const askChatbot = async (userId, question) => {
    try {
        const user = await UserAccount.findByPk(userId);
        if (!user) {
            throw new Error('User không tồn tại');
        }

        if (user.tokenCount <= 0) {
            return {
                success: false,
                tokenLimit: true,
                message: 'Hết Token tư vấn. Vui lòng nâng cấp hoặc mua thêm token.'
            };
        }

        // Trừ Token
        user.tokenCount -= 1;
        await user.save();

        const prompt = `Bạn là chuyên gia tư vấn hướng nghiệp xuất sắc. Người dùng hỏi: "${question}". Hãy tư vấn chuyên sâu, ngắn gọn và truyền cảm hứng.`;
        
        const result = await model.generateContent(prompt);
        const answer = result.response.text().trim();

        return {
            success: true,
            answer,
            reply: answer,
            remainingTokens: user.tokenCount
        };
    } catch (error) {
        console.error("Lỗi AI (Chatbox):", error);
        throw error;
    }
};

module.exports = {
    askChatbot
};
