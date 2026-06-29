const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Taikhoan: UserAccount, NguoiDung, Chatbox } = require("../models");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite", generationConfig: { temperature: 0.7 } });

// Ghi đè phương thức generateContent để tự động retry khi gặp lỗi (ví dụ lỗi 503 hoặc rate limit)
const originalGenerateContent = model.generateContent.bind(model);
model.generateContent = async function (prompt, retries = 3, delayMs = 1500) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await originalGenerateContent(prompt);
        } catch (error) {
            console.warn(`[Gemini API - Chat] Thử lại lần ${attempt}/${retries} do lỗi:`, error.message || error);
            if (attempt === retries) {
                throw error;
            }
            // Chờ với thời gian tăng dần (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
    }
};

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

        // Lưu log tin nhắn vào bảng Chatbox
        const profile = await NguoiDung.findOne({ where: { userId } });
        if (profile) {
            const chatSessionId = Math.floor(Date.now() / 1000); // Mã phiên chat tạm thời
            await Chatbox.create({
                MaND: profile.id,
                MaChat: chatSessionId,
                NguoiGui: 'user',
                NoiDung: question
            });
            await Chatbox.create({
                MaND: profile.id,
                MaChat: chatSessionId,
                NguoiGui: 'bot',
                NoiDung: answer
            });
        }

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
