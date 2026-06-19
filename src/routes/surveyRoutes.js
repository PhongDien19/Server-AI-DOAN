const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/surveyController');
const { checkAuth } = require('../middlewares/authMiddleware');

// Chức năng 1: Khởi tạo khảo sát động (AI-Driven)
router.post('/init', surveyController.initSurvey);

// Chức năng 2: Xử lý chấm điểm và Chặn xem kết quả
router.post('/submit', surveyController.submitSurvey);

// Chức năng 4: Đánh giá mức độ hài lòng (Feedback Loop)
router.post('/feedback', surveyController.feedbackSurvey);

module.exports = router;
