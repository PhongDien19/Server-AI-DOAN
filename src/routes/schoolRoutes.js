const express = require('express');
const router = express.Router();
const SchoolController = require('../controllers/schoolController');

// Lấy danh sách trường đại học (lọc miền Bắc, Trung, Nam)
router.get('/', SchoolController.getSchools);

// Tra cứu điểm chuẩn tuyển sinh theo ngành, trường, năm
router.get('/admission-scores', SchoolController.getAdmissionScores);

// Lấy chi tiết trường đại học theo mã trường
router.get('/:id', SchoolController.getSchoolById);

module.exports = router;
