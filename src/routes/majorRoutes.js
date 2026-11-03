const express = require('express');
const router = express.Router();
const MajorController = require('../controllers/majorController');

// Lấy danh sách ngành nghề (kèm hồ sơ năng lực)
router.get('/', MajorController.getMajors);

// Lấy chi tiết ngành nghề theo mã ngành
router.get('/:id', MajorController.getMajorById);

module.exports = router;

