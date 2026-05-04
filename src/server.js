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
const { analyzeCareer, generateCareerTest } = require('./services/aiService');

// Route tạo bài test nghề nghiệp
app.post('/api/generate-test', async (req, res) => {
    try {
        const { targetJob, hobby, age } = req.body;
        
        if (!targetJob || !hobby || !age) {
            return res.status(400).json({ 
                success: false, 
                message: "Thiếu thông tin! Cần targetJob, hobby và age." 
            });
        }

        const testContent = await generateCareerTest({ targetJob, hobby, age });
        res.json({ success: true, test: testContent });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

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

// Route GET để test nhập liệu nhanh qua trình duyệt (Query Parameters)
// Ví dụ: http://localhost:5000/api/consult-test?hobby=coding&strength=logic
app.get('/api/consult-test', async (req, res) => {
    try {
        const userData = req.query; // Lấy dữ liệu từ URL ?key=value
        if (Object.keys(userData).length === 0) {
            return res.json({ message: "Vui lòng nhập liệu qua URL. Ví dụ: ?hobby=hat&strength=tu-tin" });
        }
        const advice = await analyzeCareer(userData);
        res.json({ success: true, input: userData, advice });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Lắng nghe cổng
app.listen(PORT, () => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});