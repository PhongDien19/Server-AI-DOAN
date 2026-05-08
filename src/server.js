const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import Services
const { getCareerAdvice, generateCareerTest, evaluateCareerTest } = require('./services/aiService');
// const { checkLogin, socialLogin, register } = require('./services/authService');
const { checkLogin, register } = require('./services/authService');
const { saveQuestions, getQuestions } = require('./services/testService');

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

// 5. Endpoint lưu câu hỏi và câu trả lời của User
app.post('/api/test/questions', async (req, res) => {
  const { sessionId, userId, testName, questions } = req.body;
  
  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ success: false, message: 'Thiếu mảng questions' });
  }

  const result = await saveQuestions(sessionId, userId, testName, questions);
  res.json(result);
});

// 6. Endpoint lấy lại danh sách câu hỏi của 1 bài test
app.get('/api/test/questions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const result = await getQuestions(sessionId);
  res.json(result);
});

// 7. Endpoint nhờ AI chấm điểm bài test
app.post('/api/test/evaluate/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  
  // 1. Lấy tất cả câu hỏi & câu trả lời từ CSDL
  const result = await getQuestions(sessionId);
  if (!result.success || result.data.length === 0) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu bài test' });
  }

  const questions = result.data;
  
  // Kiểm tra xem user đã trả lời đủ chưa
  const isCompleted = questions.every(q => q.userAnswer !== null && q.userAnswer !== '');
  if (!isCompleted) {
    return res.status(400).json({ success: false, message: 'Người dùng chưa trả lời hết các câu hỏi' });
  }

  const testName = questions[0].testName || 'Bài test';

  // 2. Chấm điểm bằng AI
  try {
    const evaluation = await evaluateCareerTest(testName, questions);
    res.json({ success: true, evaluation });
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