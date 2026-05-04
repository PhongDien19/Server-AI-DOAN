// SERVER/index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Để server đọc được dữ liệu JSON từ App gửi lên

// Route mặc định
app.get('/', (req, res) => {
    res.send('Server Tư vấn hướng nghiệp đang chạy...');
});

// Import AI Service
const { analyzeCareer } = require('./services/aiService');

// Route tư vấn nghề nghiệp
app.post('/api/consult', async (req, res) => {
    try {
        const userData = req.body;
        const advice = await analyzeCareer(userData);
        res.json({ success: true, advice });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Lắng nghe cổng
app.listen(PORT, () => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});