const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Question = require("../models/Question");
const SurveyFeedback = require("../models/SurveyFeedback");
const { setSessionContext, getSessionContext, setPendingEvaluation } = require("./sessionContextStore");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite", generationConfig: { temperature: 0.5 } });

const generateSessionId = () => {
    return 'survey_' + Math.random().toString(36).substr(2, 9);
};

const initSurvey = async (mode, targetCareer) => {
    try {
        const questionBankPath = path.join(__dirname, '../data/questionBank.json');
        const questionBankRaw = fs.readFileSync(questionBankPath, 'utf8');
        const surveyData = JSON.parse(questionBankRaw);

        const sessionId = generateSessionId();

        // Lưu câu hỏi vào database tạm thời
        const questionRecords = surveyData.questions.map((q, index) => ({
            sessionId,
            testName: surveyData.testName,
            testType: 'career', // fallback to career type
            questionText: q.questionText,
            options: q.options,
            order: index + 1
        }));
        
        await Question.bulkCreate(questionRecords);

        // Lưu thông tin context vào sessionContextStore
        setSessionContext(sessionId, { mode, targetCareer });

        return { sessionId, survey: surveyData };
    } catch (error) {
        console.error("Lỗi Init Survey:", error);
        throw error;
    }
};

const processSurveySubmit = async (sessionId, answers) => {
    try {
        const questions = await Question.findAll({ where: { sessionId }, order: [['order', 'ASC']] });
        if (!questions.length) {
            throw new Error("Không tìm thấy dữ liệu khảo sát.");
        }

        // 1. Áp dụng Thuật toán phân tích tương thích (Weight-based Scoring)
        // Interest Fit (50%), Behavioral Fit (30%), Efficacy Fit (20%)
        let interestScore = 0, interestMax = 0;
        let behavioralScore = 0, behavioralMax = 0;
        let efficacyScore = 0, efficacyMax = 0;
        
        const parsedAnswers = [];

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const answerWeight = answers[i] || 3; // default neutral if missing
            
            // update userAnswer vào DB
            q.userAnswer = String(answerWeight);
            await q.save();
            
            parsedAnswers.push({ question: q.questionText, weight: answerWeight });

            // Phân loại 15 câu theo thứ tự (5 Holland, 5 Big Five, 5 SCCT)
            if (i < 5) {
                interestScore += answerWeight;
                interestMax += 5;
            } else if (i < 10) {
                behavioralScore += answerWeight;
                behavioralMax += 5;
            } else {
                efficacyScore += answerWeight;
                efficacyMax += 5;
            }
        }

        const normalizedInterest = interestScore / interestMax; // 0 to 1
        const normalizedBehavioral = behavioralScore / behavioralMax;
        const normalizedEfficacy = efficacyScore / efficacyMax;

        const totalScore = (normalizedInterest * 5 * 0.5) + (normalizedBehavioral * 5 * 0.3) + (normalizedEfficacy * 5 * 0.2);

        // Đọc lại context từ sessionContextStore
        const ctx = getSessionContext(sessionId) || {};
        const mode = ctx.mode || 'Discovery';
        const targetCareer = ctx.targetCareer || '';

        // Gọi Gemini để phân tích chi tiết và sinh kết quả động
        let prompt = '';
        if (mode === 'Discovery') {
            prompt = `Bạn là chuyên gia nhân sự và cố vấn hướng nghiệp AI. Hãy phân tích kết quả bài khảo sát của người dùng:
Chế độ: Khám phá (Discovery) - Người dùng đang muốn tìm định hướng nghề nghiệp phù hợp nhất dựa trên hành vi và sở thích.
Tổng điểm đánh giá định lượng (1-5): ${totalScore.toFixed(2)}/5.

Các câu hỏi và trả lời của người dùng (trọng số câu trả lời 1-5):
${JSON.stringify(parsedAnswers)}

YÊU CẦU QUAN TRỌNG VỀ DANH SÁCH NGÀNH NGHỀ:
- Trong mảng "compatibleCareers", thuộc tính "career" PHẢI LÀ tên của NGÀNH NGHỀ/LĨNH VỰC hoạt động (Ví dụ: "Công nghệ thông tin", "Marketing & Truyền thông", "Y tế & Chăm sóc sức khỏe", "Quản trị kinh doanh", "Kiến trúc & Xây dựng", "Tài chính - Ngân hàng", "Giáo dục & Đào tạo").
- Tuyệt đối KHÔNG trả về CHỨC DANH công việc cụ thể hay VỊ TRÍ nhân sự (Ví dụ: KHÔNG được trả về "Project Manager", "Data Scientist", "Product Manager", "Software Engineer", "Giám đốc Marketing", "Tư vấn viên").

Hãy thực hiện đánh giá tương thích và trả về cấu trúc JSON chính xác như sau:
{
  "score": ${totalScore.toFixed(2)},
  "status": "${totalScore > 3.0 ? 'Passed' : 'Failed'}",
  "summary": "Tóm tắt phân tích kết quả tương thích tổng quan về nhóm tính cách/sở thích của họ (khoảng 3-4 câu ngắn gọn)",
  "strengths": ["Điểm mạnh phù hợp 1", "Điểm mạnh phù hợp 2"],
  "weaknesses": ["Điểm yếu hoặc hạn chế cần cải thiện 1", "Điểm yếu 2..."],
  "advice": "Lời khuyên định hướng sự nghiệp cốt lõi và hướng phát triển tiếp theo",
  "compatibleCareers": [
    {"career": "Tên ngành nghề/lĩnh vực tương thích 1", "reason": "Giải thích tại sao ngành này cực kỳ phù hợp với họ dựa trên hành vi và sở thích"},
    {"career": "Tên ngành nghề/lĩnh vực tương thích 2", "reason": "Giải thích lý do..."},
    {"career": "Tên ngành nghề/lĩnh vực tương thích 3", "reason": "Giải thích lý do..."},
    {"career": "Tên ngành nghề/lĩnh vực tương thích 4", "reason": "Giải thích lý do..."},
    {"career": "Tên ngành nghề/lĩnh vực tương thích 5", "reason": "Giải thích lý do..."}
  ]
}
Chỉ trả về JSON, không kèm bất kỳ markdown hay text giải thích nào khác.`;
        } else {
            prompt = `Bạn là chuyên gia nhân sự và cố vấn hướng nghiệp AI. Hãy phân tích kết quả bài khảo sát của người dùng:
Chế độ: Mục tiêu (Targeted) - Ngành nghề mục tiêu của người dùng: ${targetCareer}.
Tổng điểm tương thích định lượng (1-5): ${totalScore.toFixed(2)}/5 (Trong đó: Điểm > 3.0 là Phù hợp, Điểm <= 3.0 là Chưa phù hợp).

Các câu hỏi và trả lời của người dùng (trọng số câu trả lời 1-5):
${JSON.stringify(parsedAnswers)}

Hãy thực hiện đánh giá tương thích và trả về cấu trúc JSON chính xác như sau:
{
  "score": ${totalScore.toFixed(2)},
  "status": "${totalScore > 3.0 ? 'Passed' : 'Failed'}",
  "summary": "Tóm tắt phân tích kết quả tương thích tổng quan với ngành ${targetCareer} (khoảng 3-4 câu ngắn gọn)",
  "strengths": ["Điểm mạnh phù hợp với ngành này 1", "Điểm mạnh phù hợp 2"],
  "weaknesses": ["Điểm yếu hoặc hạn chế cần cải thiện để làm ngành này 1", "Điểm yếu 2..."],
  "advice": "Lời khuyên định hướng sự nghiệp cốt lõi và hướng phát triển tiếp theo đối với ngành ${targetCareer}",
  "roadmap": ["Lộ trình học tập/làm việc bước 1 để phát triển trong ngành", "Bước 2...", "Bước 3..."],
  "certificates": ["Chứng chỉ chuyên môn nên học 1", "Chứng chỉ 2..."],
  "onetMatches": ["Vị trí công việc liên quan theo O*NET 1", "Vị trí 2..."],
  "basicSalary": "Mức lương cơ bản cho ngành ${targetCareer} tại Việt Nam (Ví dụ: Khởi điểm: ... VNĐ/tháng, 3-5 năm kinh nghiệm: ... VNĐ/tháng)",
  "laborMarket": "Thông tin về thị trường lao động tại Việt Nam cho ngành ${targetCareer} (Nhu cầu tuyển dụng, xu hướng và cơ hội phát triển)"
}
Chỉ trả về JSON, không kèm bất kỳ markdown hay text giải thích nào khác.`;
        }

        const aiResult = await model.generateContent(prompt);
        let text = aiResult.response.text().trim();
        if (text.startsWith('```json')) {
            text = text.substring(7, text.length - 3).trim();
        } else if (text.startsWith('```')) {
            text = text.substring(3, text.length - 3).trim();
        }
        
        const evaluation = JSON.parse(text);
        evaluation.mode = mode;
        evaluation.targetCareer = targetCareer;

        // Lưu kết quả vào trạng thái chờ (Pending)
        setPendingEvaluation(sessionId, evaluation, ctx);

        return {
            requiresLogin: true,
            sessionId,
            evaluation,
            message: 'Khảo sát đã hoàn thành và được AI chấm điểm. Vui lòng đăng nhập hoặc tạo tài khoản để nhận báo cáo hướng nghiệp chi tiết.'
        };
    } catch (error) {
        console.error("Lỗi AI (Submit Survey):", error);
        throw error;
    }
};

const saveFeedback = async (surveyId, ratingScore, comment, userId) => {
    return await SurveyFeedback.create({
        surveyId,
        ratingScore,
        comment,
        userId
    });
};

module.exports = {
    initSurvey,
    processSurveySubmit,
    saveFeedback
};
