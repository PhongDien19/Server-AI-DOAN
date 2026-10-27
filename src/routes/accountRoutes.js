const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { verifyAdmin } = require('../middlewares/authMiddleware');

// Tất cả các route quản lý tài khoản đều yêu cầu quyền Admin

// Thống kê số liệu tài khoản
router.get('/stats', verifyAdmin, accountController.getAccountStats);

// Lấy danh sách tài khoản
router.get('/', verifyAdmin, accountController.getAccounts);

// Lấy thông tin chi tiết một tài khoản
router.get('/:id', verifyAdmin, accountController.getAccountById);

// Tạo tài khoản mới
router.post('/', verifyAdmin, accountController.createAccount);

// Cập nhật thông tin tài khoản
router.put('/:id', verifyAdmin, accountController.updateAccount);

// Xóa tài khoản
router.delete('/:id', verifyAdmin, accountController.deleteAccount);

// Khóa / Mở khóa tài khoản
router.patch('/:id/status', verifyAdmin, accountController.toggleAccountStatus);

module.exports = router;

