const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// Chức năng: Tìm kiếm/Tìm hiểu nhanh về ngành nghề theo độ tuổi & khu vực
router.post('/career', searchController.searchCareer);

module.exports = router;
