const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import Services
const { getCareerAdvice, generateCareerTest, evaluateCareerTest } = require('./services/aiService');
// const { checkLogin, socialLogin, register } = require('./services/authService');
const { checkLogin, register } = require('./services/authService');
const { saveQuestions, getQuestions } = require('./services/testService');
const { getSessionContext, setPendingEvaluation } = require('./services/sessionContextStore');
const { claimAssessmentResult } = require('./services/assessmentService');
const { getProfile, updateProfile, getHistory } = require('./services/profileService');

// Import DB config
const sequelize = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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

  // Thử lấy đường dẫn ngrok nếu đang chạy dev:ngrok
  setTimeout(() => {
    const http = require('http');
    http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const httpsTunnel = parsed.tunnels.find(t => t.public_url && t.public_url.startsWith('https'));
          if (httpsTunnel) {
            console.log(`\n=================================================`);
            console.log(`🚀 Ngrok Public URL: ${httpsTunnel.public_url}`);
            console.log(`=================================================\n`);
          }
        } catch (e) {}
      });
    }).on('error', () => {
      // Bỏ qua nếu ngrok không chạy
    });
  }, 3000); // Chờ 3s để ngrok kịp khởi động
});