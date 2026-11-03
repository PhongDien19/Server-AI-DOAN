const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const accountRoutes = require('./accountRoutes');
const profileRoutes = require('./profileRoutes');
const adminRoutes = require('./adminRoutes');
const assessmentRoutes = require('./assessmentRoutes');
const questionRoutes = require('./questionRoutes');
const majorRoutes = require('./majorRoutes');
const schoolRoutes = require('./schoolRoutes');

const authController = require('../controllers/authController');
const profileController = require('../controllers/profileController');

// Gắn các nhóm routes chuyên biệt chuẩn MVC
router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/profile', profileRoutes);
router.use('/admin', adminRoutes);

// Các nhóm routes mới theo đề xuất hoàn thiện hệ thống hướng nghiệp
router.use('/assessment', assessmentRoutes);
router.use('/questions', questionRoutes);
router.use('/majors', majorRoutes);
router.use('/schools', schoolRoutes);

// Các endpoint dự phòng tương thích ngược với Frontend
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile/:userId', profileController.getProfile);
router.put('/profile/:userId', profileController.updateProfile);

module.exports = router;
