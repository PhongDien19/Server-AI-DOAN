const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Question = require("../models/Question");
const SurveyFeedback = require("../models/SurveyFeedback");
const { setSessionContext, getSessionContext, setPendingEvaluation } = require("./sessionContextStore");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite", generationConfig: { temperature: 0.5 } });

// Ghi đè phương thức generateContent để tự động retry khi gặp lỗi (ví dụ lỗi 503 hoặc rate limit)
const originalGenerateContent = model.generateContent.bind(model);
model.generateContent = async function (prompt, retries = 3, delayMs = 1500) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await originalGenerateContent(prompt);
        } catch (error) {
            console.warn(`[Gemini API - Survey] Thử lại lần ${attempt}/${retries} do lỗi:`, error.message || error);
            if (attempt === retries) {
                throw error;
            }
            // Chờ với thời gian tăng dần (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
    }
};

const generateSessionId = () => {
    return 'survey_' + Math.random().toString(36).substr(2, 9);
};
const initSurvey = async (mode, targetCareer) => {
    try {
        const sessionId = generateSessionId();
        let surveyData;

        if (mode === 'Discovery' || !targetCareer) {
            // Chế độ Khám phá: sử dụng bộ câu hỏi tĩnh
            const questionBankPath = path.join(__dirname, '../data/questionBank.json');
            const questionBankRaw = fs.readFileSync(questionBankPath, 'utf8');
            surveyData = JSON.parse(questionBankRaw);
            
            const questionRecords = surveyData.questions.map((q, index) => ({
                sessionId,
                testName: surveyData.testName,
                testType: 'career',
                questionText: q.questionText,
                options: q.options,
                order: index + 1
            }));
            await Question.bulkCreate(questionRecords);
        } else {
            // Chế độ Mục tiêu: kiểm tra xem DB đã có bộ câu hỏi của ngành nghề này chưa
            const formattedTestName = `Khảo sát nghề ${targetCareer}`;
            
            // Tìm 1 câu hỏi mẫu có testName tương ứng để xác định sessionId cũ đã tồn tại
            const sampleQuestion = await Question.findOne({
                where: {
                    testType: 'career',
                    testName: formattedTestName
                }
            });

            let questionsToCopy = [];
            if (sampleQuestion) {
                // Nếu tìm thấy, lấy toàn bộ câu hỏi thuộc sessionId đó
                questionsToCopy = await Question.findAll({
                    where: {
                        testType: 'career',
                        testName: formattedTestName,
                        sessionId: sampleQuestion.sessionId
                    },
                    order: [['order', 'ASC']]
                });
            }

            if (questionsToCopy.length > 0) {
                console.log(`[Survey] Tìm thấy bộ câu hỏi sẵn cho ngành: ${targetCareer}. Sao chép từ session: ${sampleQuestion.sessionId}`);
                
                surveyData = {
                    testName: formattedTestName,
                    options: questionsToCopy[0].options, // lấy list options mẫu
                    questions: questionsToCopy.map(q => ({
                        questionText: q.questionText,
                        options: q.options
                    }))
                };

                const questionRecords = questionsToCopy.map((q, index) => ({
                    sessionId,
                    testName: formattedTestName,
                    testType: 'career',
                    questionText: q.questionText,
                    options: q.options,
                    order: index + 1
                }));
                await Question.bulkCreate(questionRecords);
            } else {
                console.log(`[Survey] Chưa có câu hỏi cho ngành: ${targetCareer}. Bắt đầu gọi AI để tạo bộ câu hỏi.`);
                // Nếu không tìm thấy, gọi AI tạo bộ câu hỏi riêng cho ngành đó
                const prompt = `Bạn là chuyên gia tư vấn hướng nghiệp xuất sắc. Hãy tạo một bộ khảo sát động (AI-driven) gồm đúng 15 câu hỏi trắc nghiệm tình huống (Scenario-based) dành riêng cho người dùng đang muốn theo đuổi ngành nghề mục tiêu là "${targetCareer}".
                
Yêu cầu bắt buộc tuân thủ:
1. Thiết kế đúng 15 câu hỏi dựa trên 3 trụ cột: John Holland (RIASEC), Big Five Personality Traits, và Social Cognitive Career Theory (SCCT).
   - 5 câu đầu (từ câu 1-5): Đánh giá mức độ yêu thích với các hoạt động, công việc cụ thể của ngành "${targetCareer}" (Interest Fit - Holland).
   - 5 câu tiếp theo (từ câu 6-10): Đánh giá hành vi, phản ứng, tính cách phù hợp với áp lực, môi trường làm việc đặc thù của ngành "${targetCareer}" (Behavioral Fit - Big Five).
   - 5 câu cuối (từ câu 11-15): Đánh giá năng lực tự nhận thức và niềm tin tự hiệu quả đối với các kỹ năng chuyên môn của ngành "${targetCareer}" (Efficacy Fit - SCCT).
2. Đối chiếu chéo: Các tình huống phải có sự liên kết, đối chiếu chéo với nhau để kiểm tra độ tin cậy và tính nhất quán của câu trả lời.
3. Thang đo Likert 5 mức độ: Mỗi câu hỏi phải có đúng 5 lựa chọn tương ứng với điểm trọng số từ 1 (Thấp/Không đồng ý/Tránh né) đến 5 (Cao/Rất đồng ý/Chủ động). Câu trả lời hiển thị dạng text tự nhiên (Ví dụ: "Hoàn toàn không phù hợp", "Có thể thử", "Hoàn toàn sẵn sàng").

Yêu cầu trả về định dạng JSON chuẩn xác như sau:
{
  "testName": "Khảo sát nghề ${targetCareer}",
  "questions": [
    {
      "questionText": "Tình huống cụ thể liên quan đến ngành ${targetCareer}... Bạn sẽ làm gì?",
      "options": [
         {"text": "Mô tả lựa chọn tương ứng mức 1", "weight": 1},
         {"text": "Mô tả lựa chọn tương ứng mức 2", "weight": 2},
         {"text": "Mô tả lựa chọn tương ứng mức 3", "weight": 3},
         {"text": "Mô tả lựa chọn tương ứng mức 4", "weight": 4},
         {"text": "Mô tả lựa chọn tương ứng mức 5", "weight": 5}
      ]
    }
  ]
}
Chỉ trả về JSON, không kèm bất kỳ markdown hay text giải thích nào khác.`;

                const aiResult = await model.generateContent(prompt);
                let text = aiResult.response.text().trim();
                
                // Trích xuất JSON từ phản hồi AI
                if (text.startsWith('```json')) {
                    text = text.substring(7, text.length - 3).trim();
                } else if (text.startsWith('```')) {
                    text = text.substring(3, text.length - 3).trim();
                }
                
                const generatedSurvey = JSON.parse(text);
                
                // Chuẩn hóa và lưu vào DB
                const questionRecords = generatedSurvey.questions.map((q, index) => ({
                    sessionId,
                    testName: formattedTestName,
                    testType: 'career',
                    questionText: q.questionText,
                    options: q.options,
                    order: index + 1
                }));
                await Question.bulkCreate(questionRecords);

                surveyData = generatedSurvey;
            }
        }

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
