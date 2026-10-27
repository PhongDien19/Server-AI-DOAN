const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { checkAuth } = require('../middlewares/authMiddleware');

// Endpoint đăng ký tài khoản mới
router.post('/register', authController.register);

// Endpoint đăng nhập
router.post('/login', authController.login);

// Endpoint lấy thông tin người dùng hiện tại
router.get('/me', checkAuth, authController.getMe);

// Endpoint đổi mật khẩu
router.post('/change-password', checkAuth, authController.changePassword);
router.put('/change-password', checkAuth, authController.changePassword);

module.exports = router;

