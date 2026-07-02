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

        // Lấy thông tin hồ sơ và kết quả test của người dùng
        const profile = await NguoiDung.findOne({ where: { userId } });
        let userContextInfo = '';
        if (profile) {
            userContextInfo += `Thông tin cá nhân & định hướng của người dùng:\n`;
            if (profile.fullName) userContextInfo += `- Họ tên: ${profile.fullName}\n`;
            if (profile.educationLevel) userContextInfo += `- Trình độ học vấn: ${profile.educationLevel}\n`;
            if (profile.targetJob) userContextInfo += `- Nghề nghiệp mục tiêu: ${profile.targetJob}\n`;
            
            if (profile.interests) {
                try {
                    const interestsObj = typeof profile.interests === 'string' 
                        ? JSON.parse(profile.interests) 
                        : profile.interests;
                    const hobbies = interestsObj.hobbies || JSON.stringify(interestsObj);
                    userContextInfo += `- Sở thích: ${hobbies}\n`;
                } catch (e) {
                    userContextInfo += `- Sở thích: ${profile.interests}\n`;
                }
            }

            if (profile.careerFitResult) {
                try {
                    const cfr = typeof profile.careerFitResult === 'string'
                        ? JSON.parse(profile.careerFitResult)
                        : profile.careerFitResult;
                    userContextInfo += `- Kết quả khảo sát nghề nghiệp mới nhất:\n`;
                    if (cfr.summary) userContextInfo += `  + Tóm tắt: ${cfr.summary}\n`;
                    if (cfr.strengths && Array.isArray(cfr.strengths)) {
                        userContextInfo += `  + Điểm mạnh: ${cfr.strengths.join(', ')}\n`;
                    }
                    if (cfr.compatibleCareers && Array.isArray(cfr.compatibleCareers)) {
                        const careersStr = cfr.compatibleCareers.map(c => c.career || c).join(', ');
                        userContextInfo += `  + Các ngành nghề tương thích gợi ý: ${careersStr}\n`;
                    }
                    if (cfr.trainingInstitutions && Array.isArray(cfr.trainingInstitutions)) {
                        const insts = cfr.trainingInstitutions.map(inst => inst.schoolName || inst).join(', ');
                        userContextInfo += `  + Các trường đào tạo đề xuất: ${insts}\n`;
                    }
                } catch (e) {
                    // Tránh crash nếu JSON hỏng
                }
            }

            if (profile.hollandResult) {
                try {
                    const hr = typeof profile.hollandResult === 'string'
                        ? JSON.parse(profile.hollandResult)
                        : profile.hollandResult;
                    userContextInfo += `- Kết quả Holland (RIASEC):\n`;
                    if (hr.summary) userContextInfo += `  + Tóm tắt: ${hr.summary}\n`;
                    if (hr.topTypes) userContextInfo += `  + Nhóm trội: ${JSON.stringify(hr.topTypes)}\n`;
                } catch (e) {
                    // Tránh crash nếu JSON hỏng
                }
            }
        }

        // Trừ Token
        user.tokenCount -= 1;
        await user.save();

        const prompt = `Bạn là chuyên gia tư vấn hướng nghiệp xuất sắc. Bạn đang trò chuyện và định hướng sự nghiệp cho một người dùng.
Dưới đây là thông tin và kết quả từ các bài test/khảo sát gần đây của người dùng:
${userContextInfo || '(Không có kết quả test trước đó)'}

Người dùng gửi tin nhắn/lựa chọn như sau: "${question}"

YÊU CẦU:
1. Hãy đọc kỹ thông tin và câu hỏi/lựa chọn của họ để đưa ra câu trả lời tư vấn sâu sắc, ngắn gọn, truyền cảm hứng.
2. Đưa ra các gợi ý câu hỏi nhanh hoặc định hướng tiếp theo để dẫn dắt họ khám phá sâu hơn (Ví dụ: đề xuất họ tìm hiểu sâu hơn về một ngành nghề, lộ trình học tập, hoặc gợi ý tìm hiểu về một trường đào tạo cụ thể trong kết quả test của họ).
3. Đưa ra đúng từ 3 đến 4 đáp án gợi ý sẵn (dạng câu trả lời ngắn hoặc lựa chọn hành động) để người dùng có thể nhấp chọn ở lượt tiếp theo (ví dụ: "Tìm hiểu lộ trình ngành CNTT", "Xem thông tin tuyển sinh Đại học Bách Khoa", "Hỏi chuyên gia về ngành nghề khác").

Hãy trả về định dạng JSON chuẩn xác như sau:
{
  "answer": "Nội dung câu trả lời hoặc câu hỏi gợi mở tiếp theo của bạn...",
  "options": [
     "Đáp án lựa chọn gợi ý 1 để người dùng nhấp vào",
     "Đáp án lựa chọn gợi ý 2 để người dùng nhấp vào",
     "Đáp án lựa chọn gợi ý 3 để người dùng nhấp vào"
  ]
}
Chỉ trả về JSON, không kèm bất kỳ markdown hay text giải thích nào khác.`;
        
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();

        // Trích xuất JSON từ phản hồi AI
        if (text.startsWith('```json')) {
            text = text.substring(7, text.length - 3).trim();
        } else if (text.startsWith('```')) {
            text = text.substring(3, text.length - 3).trim();
        }

        let parsedResult;
        try {
            parsedResult = JSON.parse(text);
        } catch (e) {
            console.warn("[Chatbot] Không thể parse JSON từ AI, sử dụng fallback plain text.");
            parsedResult = {
                answer: text,
                options: [
                    "Tìm hiểu lộ trình chi tiết ngành này",
                    "Gợi ý các trường đào tạo nổi bật",
                    "Tư vấn về các kỹ năng cần thiết"
                ]
            };
        }

        const answerText = parsedResult.answer || text;
        const optionsList = parsedResult.options || [];

        // Lưu log tin nhắn vào bảng Chatbox (sử dụng text thuần cho sạch)
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
                NoiDung: answerText
            });
        }

        return {
            success: true,
            answer: answerText,
            reply: answerText, // for backward compatibility
            options: optionsList,
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
