const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { checkAuth } = require('../middlewares/authMiddleware');

// Lấy thông tin hồ sơ theo userId
router.get('/:userId', profileController.getProfile);

// Cập nhật thông tin hồ sơ theo userId
router.put('/:userId', checkAuth, profileController.updateProfile);

module.exports = router;

