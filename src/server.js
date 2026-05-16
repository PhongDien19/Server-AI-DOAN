const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import Services
const { getCareerAdvice, generateCareerTest, evaluateCareerTest, generateHollandTest, generatePersonalityTest, generateCognitiveTest, evaluateHollandTest, evaluatePersonalityTest, evaluateCognitiveTest } = require('./services/aiService');
// const { checkLogin, socialLogin, register } = require('./services/authService');
const { checkLogin, register } = require('./services/authService');
const { saveQuestions, getQuestions } = require('./services/testService');
const { getSessionContext, setPendingEvaluation } = require('./services/sessionContextStore');
const { claimAssessmentResult } = require('./services/assessmentService');
const { getProfile, updateProfile, getHistory } = require('./services/profileService');

// Import Routes
const surveyRoutes = require('./routes/surveyRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Import DB config
const sequelize = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Mount Custom API Routes
app.use('/api/survey', surveyRoutes);
app.use('/api/chat', chatRoutes);

// 1. Endpoint tư vấn nghề nghiệp tổng quát (POST)
app.post('/api/consult', async (req, res) => {
  const { info } = req.body;
  const advice = await getCareerAdvice(info);
  res.json({ advice });
});

// 2. Endpoint tạo bài test chi tiết (POST)
app.post('/api/generate-test', async (req, res) => {
  try {
    const test = await generateCareerTest(req.body);
    res.json({ success: true, test });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2.5. Endpoint đăng ký tài khoản mới (Email / Password)
app.post('/api/register', async (req, res) => {
  const { email, password, fullName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ email và mật khẩu' });
  }

  const result = await register(email, password, fullName);
  if (result.success) {
    res.status(201).json(result);
  } else {
    res.status(400).json(result);
  }
});

// 3. Endpoint đăng nhập thường (Email / Password)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ tài khoản và mật khẩu' });
  }

  const result = await checkLogin(username, password);
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(401).json(result); // Lỗi xác thực
  }
});

/* [TẠM ẨN - Chức năng Social Login]
// 4a. Endpoint đăng nhập Google
app.post('/api/login/google', async (req, res) => {
  const { providerId, email, displayName, avatarUrl } = req.body;
  
  if (!providerId) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin providerId từ Google' });
  }

  const result = await socialLogin('google', providerId, email, displayName, avatarUrl);
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(500).json(result);
  }
});

// 4b. Endpoint đăng nhập Facebook
app.post('/api/login/facebook', async (req, res) => {
  const { providerId, email, displayName, avatarUrl } = req.body;
  
  if (!providerId) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin providerId từ Facebook' });
  }

  const result = await socialLogin('facebook', providerId, email, displayName, avatarUrl);
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(500).json(result);
  }
});
*/

// 5. Endpoint lưu câu hỏi và câu trả lời của User (có thể kèm userContext: tên, tuổi, sở thích, nghề, học vấn — lưu tạm theo session)
app.post('/api/test/questions', async (req, res) => {
  const { sessionId, userId, testName, questions, userContext } = req.body;

  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ success: false, message: 'Thiếu mảng questions' });
  }

  const result = await saveQuestions(sessionId, userId, testName, questions, userContext);
  res.json(result);
});

// 6. Endpoint lấy lại danh sách câu hỏi của 1 bài test
app.get('/api/test/questions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const result = await getQuestions(sessionId);
  res.json(result);
});

// 7. Chấm điểm bằng AI — chỉ lưu kết quả tạm; không trả điểm. User phải đăng nhập và gọi /api/assessment/claim.
app.post('/api/test/evaluate/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  const result = await getQuestions(sessionId);
  if (!result.success || result.data.length === 0) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu bài test' });
  }

  const questions = result.data;

  const isCompleted = questions.every(q => q.userAnswer !== null && q.userAnswer !== '');
  if (!isCompleted) {
    return res.status(400).json({ success: false, message: 'Người dùng chưa trả lời hết các câu hỏi' });
  }

  const testName = questions[0].testName || 'Bài test';

  const plainQuestions = questions.map(q => ({
    questionText: q.questionText,
    userAnswer: q.userAnswer,
  }));

  try {
    const ctx = getSessionContext(sessionId) || {};
    const evaluation = await evaluateCareerTest(testName, plainQuestions, ctx);

    if (evaluation.error) {
      return res.status(502).json({ success: false, message: 'AI không trả về kết quả hợp lệ', details: evaluation });
    }

    setPendingEvaluation(sessionId, evaluation, ctx);

    res.json({
      success: true,
      requiresLogin: true,
      sessionId,
      message: 'Đăng nhập hoặc đăng ký, sau đó gọi POST /api/assessment/claim với sessionId và userId để xem điểm và lưu vào hồ sơ.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Sau khi đăng nhập: nhận điểm và ghi vào UserProfile + gán userId cho các dòng Question
app.post('/api/assessment/claim', async (req, res) => {
  const { sessionId, userId } = req.body;
  const out = await claimAssessmentResult(sessionId, userId);
  if (!out.success) {
    const code = out.message && out.message.includes('Không có kết quả') ? 404 : 400;
    return res.status(code).json(out);
  }
  res.json(out);
});

// 9. Endpoint lấy thông tin Profile
app.get('/api/profile/:userId', async (req, res) => {
  const result = await getProfile(req.params.userId);
  res.status(result.success ? 200 : 404).json(result);
});

// 10. Endpoint cập nhật Profile
app.put('/api/profile/:userId', async (req, res) => {
  const result = await updateProfile(req.params.userId, req.body);
  res.status(result.success ? 200 : 400).json(result);
});

// 11. Endpoint lấy lịch sử làm bài test (Các câu hỏi/trả lời cũ theo sessionId)
app.get('/api/history/:userId', async (req, res) => {
  const result = await getHistory(req.params.userId);
  res.status(result.success ? 200 : 500).json(result);
});

// 12. Endpoint tạo bài test Holland (sở thích nghề nghiệp)
app.post('/api/test/holland', async (req, res) => {
  try {
    const test = await generateHollandTest(req.body);
    res.json({ success: true, test });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 13. Endpoint tạo bài test tính cách (MBTI & Big 5)
app.post('/api/test/personality', async (req, res) => {
  try {
    const test = await generatePersonalityTest(req.body);
    res.json({ success: true, test });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 14. Endpoint tạo bài test năng lực nhận thức
app.post('/api/test/cognitive', async (req, res) => {
  try {
    const test = await generateCognitiveTest(req.body);
    res.json({ success: true, test });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 15. Endpoint đánh giá bài test Holland
app.post('/api/test/evaluate-holland/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  const result = await getQuestions(sessionId);
  if (!result.success || result.data.length === 0) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu bài test Holland' });
  }

  const questions = result.data;

  const isCompleted = questions.every(q => q.userAnswer !== null && q.userAnswer !== '');
  if (!isCompleted) {
    return res.status(400).json({ success: false, message: 'Người dùng chưa trả lời hết các câu hỏi' });
  }

  const plainQuestions = questions.map(q => ({
    questionText: q.questionText,
    userAnswer: q.userAnswer,
    hollandType: q.hollandType,
  }));

  try {
    const ctx = getSessionContext(sessionId) || {};
    const evaluation = await evaluateHollandTest(plainQuestions, ctx);

    if (evaluation.error) {
      return res.status(502).json({ success: false, message: 'AI không trả về kết quả hợp lệ', details: evaluation });
    }

    setPendingEvaluation(sessionId, evaluation, ctx);

    res.json({
      success: true,
      requiresLogin: true,
      sessionId,
      message: 'Đăng nhập hoặc đăng ký, sau đó gọi POST /api/assessment/claim với sessionId và userId để xem kết quả Holland.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 16. Endpoint đánh giá bài test tính cách
app.post('/api/test/evaluate-personality/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  const result = await getQuestions(sessionId);
  if (!result.success || result.data.length === 0) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu bài test tính cách' });
  }

  const questions = result.data;

  const isCompleted = questions.every(q => q.userAnswer !== null && q.userAnswer !== '');
  if (!isCompleted) {
    return res.status(400).json({ success: false, message: 'Người dùng chưa trả lời hết các câu hỏi' });
  }

  const plainQuestions = questions.map(q => ({
    questionText: q.questionText,
    userAnswer: q.userAnswer,
    trait: q.trait,
  }));

  try {
    const ctx = getSessionContext(sessionId) || {};
    const evaluation = await evaluatePersonalityTest(plainQuestions, ctx);

    if (evaluation.error) {
      return res.status(502).json({ success: false, message: 'AI không trả về kết quả hợp lệ', details: evaluation });
    }

    setPendingEvaluation(sessionId, evaluation, ctx);

    res.json({
      success: true,
      requiresLogin: true,
      sessionId,
      message: 'Đăng nhập hoặc đăng ký, sau đó gọi POST /api/assessment/claim với sessionId và userId để xem kết quả tính cách.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 17. Endpoint đánh giá bài test năng lực (cần cả câu trả lời đúng)
app.post('/api/test/evaluate-cognitive/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { userAnswers } = req.body; // Mảng câu trả lời của user

  const result = await getQuestions(sessionId);
  if (!result.success || result.data.length === 0) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu bài test năng lực' });
  }

  const questions = result.data;

  if (!userAnswers || userAnswers.length !== questions.length) {
    return res.status(400).json({ success: false, message: 'Thiếu hoặc không đủ câu trả lời' });
  }

  try {
    const ctx = getSessionContext(sessionId) || {};
    const evaluation = await evaluateCognitiveTest(questions, userAnswers, ctx);

    if (evaluation.error) {
      return res.status(502).json({ success: false, message: 'AI không trả về kết quả hợp lệ', details: evaluation });
    }

    setPendingEvaluation(sessionId, evaluation, ctx);

    res.json({
      success: true,
      requiresLogin: true,
      sessionId,
      message: 'Đăng nhập hoặc đăng ký, sau đó gọi POST /api/assessment/claim với sessionId và userId để xem kết quả năng lực.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// === VALUES ASSESSMENT ENDPOINTS ===

// Tạo bài test hệ giá trị cá nhân
app.post('/api/test/values', async (req, res) => {
  try {
    const { targetJob, age, educationLevel, hobby } = req.body;

    if (!targetJob || !age || !educationLevel) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin: targetJob, age, educationLevel là bắt buộc'
      });
    }

    const sessionId = generateSessionId();
    const testData = await generateValuesTest({ targetJob, age, educationLevel, hobby });

    if (testData.error) {
      return res.status(502).json({ success: false, message: 'AI không trả về kết quả hợp lệ', details: testData });
    }

    // Lưu câu hỏi vào database
    await saveQuestions(sessionId, testData.questions, 'values');

    // Lưu context session
    setSessionContext(sessionId, { targetJob, age, educationLevel, hobby, testType: 'values' });

    res.json({
      success: true,
      sessionId,
      testName: testData.testName,
      valuesTypes: testData.valuesTypes,
      options: testData.options,
      questions: testData.questions.map((q, idx) => ({
        id: idx + 1,
        question: q.question,
        valueType: q.valueType
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Đánh giá bài test hệ giá trị cá nhân
app.post('/api/test/evaluate-values/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answers } = req.body; // Array of answers (1-5 scale)

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu answers array (mảng câu trả lời từ 1-5)'
      });
    }

    const questions = await getQuestions(sessionId);
    if (!questions || questions.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi cho session này' });
    }

    // Kết hợp câu hỏi với câu trả lời
    const questionsWithAnswers = questions.map((q, idx) => ({
      questionText: q.questionText,
      userAnswer: answers[idx] || 3, // Default to neutral
      valueType: q.valueType
    }));

    const ctx = getSessionContext(sessionId) || {};
    const evaluation = await evaluateValuesTest(questionsWithAnswers, ctx);

    if (evaluation.error) {
      return res.status(502).json({ success: false, message: 'AI không trả về kết quả hợp lệ', details: evaluation });
    }

    setPendingEvaluation(sessionId, evaluation, ctx);

    res.json({
      success: true,
      requiresLogin: true,
      sessionId,
      message: 'Đăng nhập hoặc đăng ký, sau đó gọi POST /api/assessment/claim với sessionId và userId để xem kết quả hệ giá trị.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// === COMPREHENSIVE ASSESSMENT ENDPOINT ===

// Tổng hợp đánh giá từ 4 trụ cột
app.post('/api/assessment/comprehensive/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { targetJob, age, educationLevel, hobby } = req.body;

    // Lấy tất cả kết quả từ database
    const userProfile = await UserProfile.findOne({ where: { userId } });
    if (!userProfile) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy profile người dùng' });
    }

    const allResults = {
      holland: userProfile.hollandScores ? {
        hollandScores: userProfile.hollandScores,
        topTypes: userProfile.topHollandTypes,
        summary: userProfile.hollandSummary
      } : null,
      personality: userProfile.personalityScores ? {
        big5Scores: userProfile.personalityScores,
        suggestedMBTI: userProfile.mbtiType,
        personalitySummary: userProfile.personalitySummary
      } : null,
      cognitive: userProfile.cognitiveScores ? {
        cognitiveScores: userProfile.cognitiveScores,
        overallScore: userProfile.cognitiveOverallScore,
        correctPercentage: userProfile.cognitiveCorrectPercentage
      } : null,
      values: userProfile.valuesScores ? {
        valuesScores: userProfile.valuesScores,
        topValues: userProfile.topValues,
        valuesSummary: userProfile.valuesSummary
      } : null,
      careerFit: userProfile.careerFitScore ? {
        score: userProfile.careerFitScore,
        summary: userProfile.careerFitSummary
      } : null
    };

    const userContext = { targetJob, age, educationLevel, hobby };
    const comprehensive = await generateComprehensiveAssessment(allResults, userContext);

    if (comprehensive.error) {
      return res.status(502).json({ success: false, message: 'AI không trả về kết quả hợp lệ', details: comprehensive });
    }

    // Cập nhật profile với kết quả tổng hợp
    await userProfile.update({
      overallCompatibility: comprehensive.overallCompatibility,
      compatibilityZone: comprehensive.compatibilityZone,
      pillarScores: comprehensive.pillarScores,
      comprehensiveSummary: comprehensive.comprehensiveSummary,
      strengths: comprehensive.strengths,
      weaknesses: comprehensive.weaknesses,
      recommendedCareers: comprehensive.recommendedCareers,
      skillDevelopment: comprehensive.skillDevelopment,
      workEnvironment: comprehensive.workEnvironment,
      careerAdvice: comprehensive.careerAdvice
    });

    res.json({
      success: true,
      comprehensiveAssessment: comprehensive
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route mặc định kiểm tra server
app.get('/', (req, res) => {
  res.send('Server AI Tư vấn hướng nghiệp đang hoạt động!');
});

// Khởi động server (Không tự động tạo bảng)
app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log("Đã kết nối MySQL thành công!");
  } catch (error) {
    console.error("Lỗi kết nối database:", error);
  }
  console.log(`Server AI đang chạy tại cổng ${PORT}`);
});