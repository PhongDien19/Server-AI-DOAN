const express = require('express');
const router = express.Router();
const QuestionController = require('../controllers/questionController');
const { verifyAdmin } = require('../middlewares/authMiddleware');

// Lấy danh sách câu hỏi (hỗ trợ lọc theo section, audience, type)
router.get('/', QuestionController.getQuestions);

// Lấy chi tiết câu hỏi theo id
router.get('/:id', QuestionController.getQuestionById);

// Thêm mới câu hỏi vào ngân hàng (yêu cầu quyền Admin)
router.post('/', verifyAdmin, QuestionController.createQuestion);

// Cập nhật câu hỏi (yêu cầu quyền Admin)
router.put('/:id', verifyAdmin, QuestionController.updateQuestion);

// Xóa câu hỏi (yêu cầu quyền Admin)
router.delete('/:id', verifyAdmin, QuestionController.deleteQuestion);

module.exports = router;
