const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyAdmin } = require('../middlewares/authMiddleware');

// Middleware xác thực quyền Admin (sử dụng JWT)
const checkAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập tài khoản Admin' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/authMiddleware');

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Từ chối truy cập: Tài khoản không có quyền Admin' });
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token đã hết hạn, vui lòng đăng nhập lại' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Định nghĩa các endpoint cho Admin (tất cả các route này được bảo vệ bởi checkAdminAuth)

// Thống kê Dashboard
router.get('/dashboard/stats', checkAdminAuth, adminController.getDashboardStats);

// Quản lý Tài khoản (Accounts)
router.get('/accounts', checkAdminAuth, adminController.getAccounts);
router.post('/accounts', checkAdminAuth, adminController.createAccount);
router.put('/accounts/:id', checkAdminAuth, adminController.updateAccount);
router.delete('/accounts/:id', checkAdminAuth, adminController.deleteAccount);

// Quản lý Ngành nghề (Careers)
router.get('/careers', checkAdminAuth, adminController.getCareers);
router.post('/careers', checkAdminAuth, adminController.createCareer);
router.put('/careers/:id', checkAdminAuth, adminController.updateCareer);
router.delete('/careers/:id', checkAdminAuth, adminController.deleteCareer);

// Quản lý Danh mục (Categories)
router.get('/categories', checkAdminAuth, adminController.getCategories);
router.post('/categories', checkAdminAuth, adminController.createCategory);
router.put('/categories/:id', checkAdminAuth, adminController.updateCategory);
router.delete('/categories/:id', checkAdminAuth, adminController.deleteCategory);

// Quản lý Dữ liệu thị trường (Market Data)
router.get('/market-data', checkAdminAuth, adminController.getMarketData);
router.post('/market-data', checkAdminAuth, adminController.createMarketData);
router.put('/market-data/:id', checkAdminAuth, adminController.updateMarketData);
router.delete('/market-data/:id', checkAdminAuth, adminController.deleteMarketData);

// Quản lý Prompt (Prompts)
router.get('/prompts', checkAdminAuth, adminController.getPrompts);
router.post('/prompts', checkAdminAuth, adminController.createPrompt);
router.put('/prompts/:id', checkAdminAuth, adminController.updatePrompt);
router.delete('/prompts/:id', checkAdminAuth, adminController.deletePrompt);

// Quản lý Ngân hàng câu hỏi (Questions)
router.get('/questions', checkAdminAuth, adminController.getQuestions);
router.post('/questions', checkAdminAuth, adminController.createQuestion);
router.put('/questions/:id', checkAdminAuth, adminController.updateQuestion);
router.delete('/questions/:id', checkAdminAuth, adminController.deleteQuestion);

module.exports = router;
