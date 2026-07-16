const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { checkAuth } = require('../middlewares/authMiddleware');

// Lấy danh sách trường và ngành cho dropdown (KHÔNG trả về điểm chuẩn)
router.get('/benchmark/list', searchController.getBenchmarkList);

// Chức năng: Tìm kiếm/Tìm hiểu nhanh về ngành nghề theo độ tuổi & khu vực
router.post('/career', checkAuth, searchController.searchCareer);

module.exports = router;
