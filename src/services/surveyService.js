const { GoogleGenerativeAI } = require("@google/generative-ai");
const Question = require("../models/Question");
const SurveyFeedback = require("../models/SurveyFeedback");
const { setSessionContext, getSessionContext, setPendingEvaluation } = require("./sessionContextStore");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { temperature: 0.7 } });

const generateSessionId = () => {
    return 'survey_' + Math.random().toString(36).substr(2, 9);
};

const initSurvey = async (mode, targetCareer) => {
    try {
        const prompt = `Bạn là chuyên gia tư vấn hướng nghiệp. Hãy tạo một bộ khảo sát động (AI-driven) gồm đúng 15 câu hỏi trắc nghiệm tình huống (Scenario-based).
        
Chế độ: ${mode === 'Discovery' ? 'Khám phá (dành cho người chưa biết mình muốn làm gì)' : 'Mục tiêu (đã có nghề mục tiêu là ' + targetCareer + ')'}.

Bắt buộc tuân thủ 3 quy tắc sau:
1. Khai thác đa tầng: Sử dụng lý thuyết Holland, Big Five, và SCCT (Lý thuyết nhận thức xã hội nghề nghiệp). 
   - 5 câu đánh giá mức độ yêu thích (Interest Fit - Holland)
   - 5 câu đánh giá hành vi và phản ứng (Behavioral Fit - Big Five)
   - 5 câu đánh giá năng lực tự nhận thức (Efficacy Fit - SCCT)
2. Đối chiếu chéo: Các tình huống phải có sự liên kết, đối chiếu chéo với nhau để phát hiện sự mâu thuẫn trong câu trả lời nếu có.
3. Thang đo Likert ngầm 5 mức độ: Câu trả lời phải tương ứng với thang đo từ 1 (Rất không đồng ý/Rất không phù hợp) đến 5 (Rất đồng ý/Rất phù hợp), nhưng không được hiển thị số 1-5 mà hiển thị dạng text tự nhiên (Ví dụ: "Hoàn toàn không phù hợp", "Có thể thử", "Hoàn toàn sẵn sàng").

Yêu cầu trả về dạng JSON chuẩn xác:
{
  "testName": "Tên bài khảo sát",
  "questions": [
    {
      "category": "Interest/Behavioral/Efficacy",
      "questionText": "Tình huống ... Bạn sẽ làm gì?",
      "options": [
         {"text": "Phản ứng rất tiêu cực / né tránh", "weight": 1},
         {"text": "Miễn cưỡng làm / không thích", "weight": 2},
         {"text": "Bình thường / tùy hoàn cảnh", "weight": 3},
         {"text": "Khá sẵn sàng / quan tâm", "weight": 4},
         {"text": "Rất hào hứng / chủ động", "weight": 5}
      ]
    }
    // ... 15 câu hỏi ...
  ]
}
Chỉ trả về JSON, không kèm markdown hay text giải thích nào khác.`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        
        // Remove markdown formatting if any
        if (text.startsWith('```json')) {
            text = text.substring(7, text.length - 3).trim();
        } else if (text.startsWith('```')) {
            text = text.substring(3, text.length - 3).trim();
        }
        
        const surveyData = JSON.parse(text);
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
        console.error("Lỗi AI (Init Survey):", error);
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

Hãy thực hiện đánh giá tương thích và trả về cấu trúc JSON chính xác như sau:
{
  "score": ${totalScore.toFixed(2)},
  "status": "${totalScore > 3.0 ? 'Passed' : 'Failed'}",
  "summary": "Tóm tắt phân tích kết quả tương thích tổng quan về nhóm tính cách/sở thích của họ (khoảng 3-4 câu ngắn gọn)",
  "strengths": ["Điểm mạnh phù hợp 1", "Điểm mạnh phù hợp 2"],
  "weaknesses": ["Điểm yếu hoặc hạn chế cần cải thiện 1", "Điểm yếu 2..."],
  "advice": "Lời khuyên định hướng sự nghiệp cốt lõi và hướng phát triển tiếp theo",
  "compatibleCareers": [
    {"career": "Ngành nghề tối tương thích 1", "reason": "Giải thích tại sao ngành này cực kỳ phù hợp với họ dựa trên hành vi và sở thích"},
    {"career": "Ngành nghề tối tương thích 2", "reason": "Giải thích lý do..."},
    {"career": "Ngành nghề tối tương thích 3", "reason": "Giải thích lý do..."},
    {"career": "Ngành nghề tối tương thích 4", "reason": "Giải thích lý do..."},
    {"career": "Ngành nghề tối tương thích 5", "reason": "Giải thích lý do..."}
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
