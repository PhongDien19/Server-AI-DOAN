const express = require('express');
const router = express.Router();
const AssessmentController = require('../controllers/assessmentController');

// Khởi tạo phiên làm bài test (Luồng chính hoặc Luồng B)
router.post('/start', AssessmentController.startAssessment);

// Lấy danh sách câu hỏi theo section
router.get('/:id/section/:sectionType', AssessmentController.getSectionQuestions);

// Nộp câu trả lời cho một section & nhận section tiếp theo
router.post('/:id/submit-section', AssessmentController.submitSectionAnswers);

// Ghi nhận phản hồi Trust Check
router.post('/:id/trust-check', AssessmentController.submitTrustCheck);

// Lấy kết quả toàn diện bài test
router.get('/:id/result', AssessmentController.getResult);

// Lịch sử bài test của người dùng
router.get('/history/:userId', AssessmentController.getAssessmentHistory);

module.exports = router;

