const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { verifyAdmin } = require('../middlewares/authMiddleware');

// Thống kê Dashboard (Tài khoản)
router.get('/dashboard/stats', verifyAdmin, accountController.getAccountStats);

// Quản lý Tài khoản (Accounts)
router.get('/accounts', verifyAdmin, accountController.getAccounts);
router.get('/accounts/:id', verifyAdmin, accountController.getAccountById);
router.post('/accounts', verifyAdmin, accountController.createAccount);
router.put('/accounts/:id', verifyAdmin, accountController.updateAccount);
router.delete('/accounts/:id', verifyAdmin, accountController.deleteAccount);
router.patch('/accounts/:id/status', verifyAdmin, accountController.toggleAccountStatus);

module.exports = router;
