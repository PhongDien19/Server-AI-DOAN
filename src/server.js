const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import AI Service
const { getCareerAdvice, generateCareerTest } = require('./services/aiService');

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

// 3. Route mặc định kiểm tra server
app.get('/', (req, res) => {
  res.send('Server AI Tư vấn hướng nghiệp đang hoạt động!');
});

app.listen(PORT, () => {
  console.log(`Server AI đang chạy tại cổng ${PORT}`);
});