const { Taikhoan: UserAccount, NguoiDung, KetQuaDiscoveryHoc, KetQuaDiscoveryLam, KetQuaTargetHoc, KetQuaTargetLam } = require("../models");
const { getGenerativeModelWithFallback, extractJsonFromText } = require("./geminiClient");

const model = getGenerativeModelWithFallback({
    model: "gemini-3.1-flash-lite",
    generationConfig: { 
        temperature: 0.7
    },
    tools: [{ googleSearch: {} }]
});

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

            const [discHoc, discLam, targetHoc, targetLam] = await Promise.all([
                KetQuaDiscoveryHoc.findAll({ where: { userId } }),
                KetQuaDiscoveryLam.findAll({ where: { userId } }),
                KetQuaTargetHoc.findAll({ where: { userId } }),
                KetQuaTargetLam.findAll({ where: { userId } }),
            ]);

            if (discHoc.length > 0 || discLam.length > 0 || targetHoc.length > 0 || targetLam.length > 0) {
                userContextInfo += `- Kết quả khảo sát nghề nghiệp mới nhất:\n`;
                if (discHoc.length > 0) {
                    const careers = discHoc.map(c => c.careerName).filter((v, i, a) => a.indexOf(v) === i);
                    const schools = discHoc.map(s => s.schoolName).filter((v, i, a) => a.indexOf(v) === i);
                    userContextInfo += `  + Các ngành học phù hợp gợi ý: ${careers.join(', ')}\n`;
                    userContextInfo += `  + Các trường đề xuất: ${schools.join(', ')}\n`;
                }
                if (discLam.length > 0) {
                    const careers = discLam.map(c => c.careerName).filter((v, i, a) => a.indexOf(v) === i);
                    userContextInfo += `  + Các ngành nghề gợi ý: ${careers.join(', ')}\n`;
                }
                if (targetHoc.length > 0) {
                    const career = targetHoc[0].careerName;
                    const schools = targetHoc.map(s => s.schoolName);
                    userContextInfo += `  + Ngành học mục tiêu: ${career}\n`;
                    userContextInfo += `  + Các trường đào tạo thuộc khu vực mong muốn: ${schools.join(', ')}\n`;
                }
                if (targetLam.length > 0) {
                    const career = targetLam[0].careerName;
                    const companies = targetLam.map(c => c.companyName);
                    userContextInfo += `  + Ngành nghề mục tiêu: ${career}\n`;
                    userContextInfo += `  + Các công ty tiêu biểu theo khu vực mong muốn: ${companies.join(', ')}\n`;
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

        const { Prompt } = require("../models");
        let chatbotPromptText = `Bạn là chuyên gia tư vấn hướng nghiệp xuất sắc. Bạn đang trò chuyện và định hướng sự nghiệp cho một người dùng.
Dưới đây là thông tin và kết quả từ các bài test/khảo sát gần đây của người dùng:
{{userContextInfo}}

Người dùng gửi tin nhắn/lựa chọn như sau: "{{question}}"

YÊU CẦU:
1. Hãy đọc kỹ thông tin và câu hỏi/lựa chọn của họ để đưa ra câu trả lời tư vấn sâu sắc, ngắn gọn, truyền cảm hứng.
2. Đưa ra các gợi ý câu hỏi nhanh hoặc định hướng tiếp theo để dẫn dắt họ khám phá sâu hơn (Ví dụ: đề xuất họ tìm hiểu sâu hơn về một ngành nghề, lộ trình học tập, hoặc gợi ý tìm hiểu về một trường đào tạo cụ thể trong kết quả test của họ).
3. Đưa ra đúng từ 3 đến 4 đáp án gợi ý sẵn (dạng câu trả lời ngắn hoặc lựa chọn hành động) để người dùng có thể nhấp chọn ở lượt tiếp theo (ví dụ: "Tìm hiểu lộ trình ngành CNTT", "Xem thông tin tuyển sinh Đại học Bách Khoa", "Hỏi chuyên gia về ngành nghề khác").
4. QUY TẮC THANG ĐIỂM 30: Nếu người dùng hỏi về điểm chuẩn của các trường Đại học/Cao đẳng, BẮT BUỘC trả về theo thang điểm tốt nghiệp THPT Quốc gia truyền thống (tối đa là 30.0). Nếu trường dùng thang 100 (như Bách khoa TP.HCM) hoặc nhân hệ số (thang 40), hãy tự động quy đổi tương đương về thang điểm 30.

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

        try {
            const dbPrompt = await Prompt.findOne({ where: { MaPrompt: 101, TrangThaiHD: true } });
            if (dbPrompt && dbPrompt.NoiDung) {
                chatbotPromptText = dbPrompt.NoiDung;
            }
        } catch (dbErr) {
            console.error("[Chatbot] Lỗi đọc prompt từ DB, sử dụng mặc định:", dbErr);
        }

        const finalPrompt = chatbotPromptText
            .replace(/\{\{userContextInfo\}\}/g, userContextInfo || '(Không có kết quả test trước đó)')
            .replace(/\{\{question\}\}/g, question)
            .replace(/\$\{userContextInfo\}/g, userContextInfo || '(Không có kết quả test trước đó)')
            .replace(/\$\{question\}/g, question);
        
        const result = await model.generateContent(finalPrompt);
        let text = result.response.text().trim();

        let parsedResult = extractJsonFromText(text);
        if (!parsedResult) {
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

        // Bỏ qua việc lưu log tin nhắn vào bảng Chatbox để tối giản dữ liệu

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
