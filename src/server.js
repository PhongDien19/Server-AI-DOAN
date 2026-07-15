const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { NguoiDung: UserProfile, CauHoi: Question } = require('./models');

// Import Services
const { 
  getCareerAdvice, 
  generateCareerTest, 
  evaluateCareerTest, 
  generateHollandTest, 
  generatePersonalityTest, 
  generateCognitiveTest, 
  evaluateHollandTest, 
  evaluatePersonalityTest, 
  evaluateCognitiveTest,
  generateValuesTest,
  evaluateValuesTest,
  generateComprehensiveAssessment
} = require('./services/aiService');
// const { checkLogin, socialLogin, register } = require('./services/authService');
const { checkLogin, register } = require('./services/authService');
const { saveQuestions, getQuestions } = require('./services/testService');
const { getSessionContext, setPendingEvaluation, setSessionContext } = require('./services/sessionContextStore');
const { claimAssessmentResult } = require('./services/assessmentService');
const { getProfile, updateProfile, getHistory, getScores, saveScores, deleteScores } = require('./services/profileService');

// Import Routes
const surveyRoutes = require('./routes/surveyRoutes');
const chatRoutes = require('./routes/chatRoutes');
const searchRoutes = require('./routes/searchRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import DB config
const sequelize = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Helper to generate a unique session ID
const generateSessionId = () => {
  return 'values_' + Math.random().toString(36).substr(2, 9);
};

// Middleware
app.use(cors());
app.use(express.json());

// Mount Custom API Routes
app.use('/api/survey', surveyRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);

// 1. Endpoint tư vấn nghề nghiệp tổng quát (POST)
// Body: { question, userContext: { requestType, targetJob, educationLevel, age, hobby, location } }
// response: { advice, success, errorMessage }
//   - success=true  & advice hợp lệ (chuỗi hoặc object) : kết quả AI
//   - success=false & errorMessage                    : backend gặp lỗi (ví dụ AI hết quota)
app.post('/api/consult', async (req, res) => {
  try {
    const body = req.body || {};
    const advice = await getCareerAdvice(body);

    if (advice && typeof advice === 'object' && advice.__error) {
      // Trả về kết quả rỗng cho phía client, kèm success=false để FE biết mà hiển thị lỗi
      return res.status(503).json({
        success: false,
        errorMessage: advice.message || 'Dịch vụ tư vấn AI tạm thời gián đoạn',
        advice: null
      });
    }

    return res.json({ success: true, advice });
  } catch (error) {
    console.error("Lỗi /api/consult:", error);
    return res.status(500).json({
      success: false,
      errorMessage: error.message || 'Lỗi máy chủ nội bộ',
      advice: null
    });
  }
});

// 2. Endpoint tạo bài test chi tiết (POST)
app.post('/api/generate-test', async (req, res) => {
  try {
    // Kiểm tra và trừ token test nếu đã đăng nhập
    const userId = req.headers['x-user-id'] || req.body.userId;
    if (userId) {
      const { Taikhoan: UserAccount } = require('./models');
      const user = await UserAccount.findByPk(userId);
      if (user) {
        if (user.tokenTest <= 0) {
          return res.status(403).json({
            success: false,
            tokenLimit: true,
            message: 'Hết lượt làm bài test. Vui lòng nâng cấp hoặc mua thêm lượt.'
          });
        }
        user.tokenTest -= 1;
        await user.save();
      }
    }

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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ email và mật khẩu' });
  }

  try {
    const result = await checkLogin(email, password);
    console.log('[Login] result:', JSON.stringify(result));
    if (result.success) {
      // Tạo JWT token cho admin
      if (result.user && result.user.role === 'admin') {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'huong_nghiep_jwt_secret_key_2024';
        const token = jwt.sign(
          { userId: result.user.id, email: result.user.email, role: result.user.role },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        result.token = token;
      }
      res.status(200).json(result);
    } else {
      res.status(401).json(result); // Lỗi xác thực
    }
  } catch (err) {
    console.error('[Login] Loi:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng nhập: ' + (err.message || 'unknown') });
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

  try {
    const result = await getQuestions(sessionId);
    if (!result.success || !result.data || result.data.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu bài test' });
    }

    const questions = result.data;

    const isCompleted = questions.every(q => q.userAnswer !== null && q.userAnswer !== '');
    if (!isCompleted) {
      return res.status(400).json({ success: false, message: 'Người dùng chưa trả lời hết các câu hỏi' });
    }

    const testName = questions[0].testName || 'Bài test';
    const testType = questions[0].testType || 'career';
    const ctx = getSessionContext(sessionId) || {};
    let evaluation;

    if (testType === 'holland') {
      const plainQuestions = questions.map(q => ({
        questionText: q.questionText,
        userAnswer: q.userAnswer,
        hollandType: q.hollandType,
      }));
      evaluation = await evaluateHollandTest(plainQuestions, ctx);
    } else if (testType === 'personality') {
      const plainQuestions = questions.map(q => ({
        questionText: q.questionText,
        userAnswer: q.userAnswer,
        trait: q.trait,
      }));
      evaluation = await evaluatePersonalityTest(plainQuestions, ctx);
    } else if (testType === 'cognitive') {
      const userAnswers = req.body.userAnswers || questions.map(q => q.userAnswer);
      evaluation = await evaluateCognitiveTest(questions, userAnswers, ctx);
    } else if (testType === 'values') {
      const plainQuestions = questions.map(q => ({
        questionText: q.questionText,
        userAnswer: parseInt(q.userAnswer, 10) || q.userAnswer || 3,
        valueType: q.valueType,
      }));
      evaluation = await evaluateValuesTest(plainQuestions, ctx);
    } else {
      const plainQuestions = questions.map(q => ({
        questionText: q.questionText,
        userAnswer: q.userAnswer,
      }));
      evaluation = await evaluateCareerTest(testName, plainQuestions, ctx);
    }

    if (evaluation.error) {
      return res.status(502).json({ success: false, message: 'AI không trả về kết quả hợp lệ', details: evaluation });
    }

    setPendingEvaluation(sessionId, evaluation, ctx);

    res.json({
      success: true,
      requiresLogin: true,
      sessionId,
      message: `Đăng nhập hoặc đăng ký, sau đó gọi POST /api/assessment/claim với sessionId và userId để xem kết quả ${testType}.`,
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

// 12. Endpoint lấy điểm số của người dùng (GET)
app.get('/api/profile/:userId/scores', async (req, res) => {
  const result = await getScores(req.params.userId);
  res.status(result.success ? 200 : 404).json(result);
});

// 13. Endpoint lưu/cập nhật điểm số của người dùng (POST)
app.post('/api/profile/:userId/scores', async (req, res) => {
  const result = await saveScores(req.params.userId, req.body);
  res.status(result.success ? 200 : 400).json(result);
});

// 14. Endpoint xóa điểm số của người dùng (DELETE)
app.delete('/api/profile/:userId/scores', async (req, res) => {
  const result = await deleteScores(req.params.userId);
  res.status(result.success ? 200 : 400).json(result);
});

// 12. Endpoint gộp tạo câu hỏi trắc nghiệm (Holland, Personality, Cognitive, Values)
app.post('/api/test/generate', async (req, res) => {
  try {
    const { testType, targetJob, hobby, age, educationLevel } = req.body;
    
    // Kiểm tra và trừ token test nếu đã đăng nhập
    const userId = req.headers['x-user-id'] || req.body.userId;
    if (userId) {
      const { Taikhoan: UserAccount } = require('./models');
      const user = await UserAccount.findByPk(userId);
      if (user) {
        if (user.tokenTest <= 0) {
          return res.status(403).json({
            success: false,
            tokenLimit: true,
            message: 'Hết lượt làm bài test. Vui lòng nâng cấp hoặc mua thêm lượt.'
          });
        }
        user.tokenTest -= 1;
        await user.save();
      }
    }

    let test;
    if (testType === 'holland') {
      test = await generateHollandTest(req.body);
    } else if (testType === 'personality') {
      test = await generatePersonalityTest(req.body);
    } else if (testType === 'cognitive') {
      test = await generateCognitiveTest(req.body);
    } else if (testType === 'values') {
      test = await generateValuesTest(req.body);
    } else {
      return res.status(400).json({ success: false, message: 'testType không hợp lệ hoặc thiếu' });
    }

    if (test && !test.error) {
      // Tự sinh sessionId duy nhất để đồng bộ với Frontend
      const sessionId = testType + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

      // Lưu trữ session context
      setSessionContext(sessionId, { targetJob, hobby, age, educationLevel });

      // Lưu sẵn bộ câu hỏi vào bảng CauHoi (Question) kèm đầy đủ metadata
      if (Array.isArray(test.questions)) {
        const questionRecords = test.questions.map((q, index) => {
          const record = {
            sessionId,
            testName: test.testName || 'Bài test hướng nghiệp',
            testType: testType,
            questionText: q.question || q.questionText || '',
            options: q.options || test.options || null,
            userAnswer: null,
            order: index + 1
          };

          if (testType === 'holland' && q.hollandType) {
            record.hollandType = q.hollandType;
          } else if (testType === 'personality' && q.trait) {
            record.trait = q.trait;
          } else if (testType === 'cognitive') {
            record.questionType = q.type;
            record.correctAnswer = q.correctAnswer;
          } else if (testType === 'values' && q.valueType) {
            record.valueType = q.valueType;
          }

          return record;
        });

        await Question.bulkCreate(questionRecords);
      }

      res.json({ success: true, sessionId, test });
    } else {
      res.status(502).json({ success: false, message: 'Không thể tạo bài test bằng AI', details: test });
    }
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

    // Không cập nhật profile vì các cột này đã được loại bỏ khỏi bảng nguoidung ở DB mới

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

// Khởi động server (Tự động đồng bộ và tạo bảng nếu chưa có)
app.listen(PORT, '0.0.0.0', async () => {
  try {
    await sequelize.authenticate();
    console.log("Đã kết nối MySQL thành công!");

    // Tự động đồng bộ cấu trúc database với MySQL
    await sequelize.sync();
    console.log("Đã đồng bộ hóa cơ sở dữ liệu MySQL thành công!");

    // Khởi tạo tài khoản mặc định phongdien1905@gmail.com / 123456 trong MySQL
    const { Taikhoan, NguoiDung } = require('./models');
    const bcrypt = require('bcrypt');
    const email = 'phongdien1905@gmail.com';
    
    const defaultUser = await Taikhoan.findOne({ where: { email } });
    if (!defaultUser) {
      const passwordHash = await bcrypt.hash('123456', 10);
      const user = await Taikhoan.create({
        email,
        passwordHash,
        role: 'user',
        tokenCount: 3
      });
      await NguoiDung.create({
        userId: user.id,
        fullName: 'Phong Điền',
        educationLevel: 'Đại học',
        interests: 'Đọc sách, Công nghệ'
      });
      console.log("Đã khởi tạo tài khoản mặc định thành công trong MySQL: phongdien1905@gmail.com / 123456");
    }
  } catch (error) {
    console.error("Lỗi kết nối hoặc đồng bộ database:", error);
  }
  console.log(`Server AI đang chạy tại cổng ${PORT}`);
});