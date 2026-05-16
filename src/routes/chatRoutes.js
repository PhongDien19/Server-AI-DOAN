const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { checkAuth } = require('../middlewares/authMiddleware');

// Chức năng 3: Quản lý Chatbox AI và Giới hạn Token
router.post('/ask', checkAuth, chatController.askChatbot);

module.exports = router;
