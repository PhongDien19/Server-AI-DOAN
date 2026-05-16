const { GoogleGenerativeAI } = require("@google/generative-ai");
const Question = require("../models/Question");
const SurveyFeedback = require("../models/SurveyFeedback");

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
            
            // update userAnswer into db
            q.userAnswer = String(answerWeight);
            await q.save();
            
            parsedAnswers.push({ question: q.questionText, weight: answerWeight });

            // Phân loại (ở đây dùng logic đơn giản là chia đều 3 nhóm vì AI trả về 15 câu theo thứ tự)
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

        // Chuẩn bị kết quả trả về dựa trên điểm số
        if (totalScore > 3.0) {
            // Quantitative data
            return {
                score: totalScore.toFixed(2),
                status: 'Passed',
                message: 'Bạn rất phù hợp với định hướng này!',
                details: {
                    interestScore: (normalizedInterest * 5).toFixed(2),
                    behavioralScore: (normalizedBehavioral * 5).toFixed(2),
                    efficacyScore: (normalizedEfficacy * 5).toFixed(2),
                },
                recommendations: {
                    roadmap: ['Tìm hiểu sâu về chuyên ngành', 'Tham gia dự án thực tế', 'Tìm kiếm Mentor'],
                    certificates: ['Chứng chỉ liên quan cấp độ 1', 'Chứng chỉ kỹ năng mềm'],
                    onetMatches: ['Nghề nghiệp liên quan trên O*NET']
                }
            };
        } else {
            // Gọi Gemini để Deep Scan & Pivot Logic
            const prompt = `Người dùng đã làm bài khảo sát nhưng đạt điểm thấp (${totalScore.toFixed(2)}/5). 
            Các câu hỏi và lựa chọn (trọng số 1-5): ${JSON.stringify(parsedAnswers)}.
            
            Thực hiện "Deep Scan": Phản biện logic lý do tại sao người này không phù hợp với lựa chọn ban đầu.
            Thực hiện "Pivot Logic": Gợi ý ít nhất 2 ngành thay thế tương đồng nhưng phù hợp hơn với phản ứng của họ.
            
            Trả về JSON:
            {
                "deepScanAnalysis": "Lý do không phù hợp dựa trên câu trả lời (vd: không thích áp lực, tránh giao tiếp, etc...)",
                "pivotSuggestions": [
                    {"career": "Ngành gợi ý 1", "reason": "Lý do phù hợp"},
                    {"career": "Ngành gợi ý 2", "reason": "Lý do phù hợp"}
                ]
            }`;

            const aiResult = await model.generateContent(prompt);
            let text = aiResult.response.text().trim();
            if (text.startsWith('```json')) {
                text = text.substring(7, text.length - 3).trim();
            } else if (text.startsWith('```')) {
                text = text.substring(3, text.length - 3).trim();
            }
            const aiData = JSON.parse(text);

            return {
                score: totalScore.toFixed(2),
                status: 'Failed',
                message: 'Có thể bạn sẽ phù hợp hơn ở những hướng đi khác.',
                aiAnalysis: aiData
            };
        }
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
