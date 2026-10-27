const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const accountRoutes = require('./accountRoutes');
const profileRoutes = require('./profileRoutes');
const adminRoutes = require('./adminRoutes');

const authController = require('../controllers/authController');
const profileController = require('../controllers/profileController');

// Gắn các nhóm routes chuyên biệt
router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/profile', profileRoutes);
router.use('/admin', adminRoutes);

// Các endpoint dự phòng tương thích ngược với Frontend cũ
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile/:userId', profileController.getProfile);
router.put('/profile/:userId', profileController.updateProfile);

module.exports = router;

