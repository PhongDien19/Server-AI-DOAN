const searchService = require('../services/searchService');
const verificationService = require('../services/verificationService');
const { Taikhoan } = require('../models');

const searchCareer = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Yêu cầu đăng nhập để tiếp tục'
            });
        }

        const user = await Taikhoan.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Tài khoản không tồn tại'
            });
        }

        if (user.tokenCount <= 0) {
            return res.status(200).json({
                success: false,
                tokenLimit: true,
                message: 'Bạn đã dùng hết lượt tìm kiếm miễn phí hôm nay. Hãy quay lại vào ngày mai!'
            });
        }

        // Trừ token
        user.tokenCount -= 1;
        await user.save();

        const { mode, industry, school, position, location, age } = req.body;

        const result = await searchService.searchCareerQuickly({
            mode,
            industry,
            school,
            position,
            location,
            age: age ? Number(age) : 18
        });

        res.status(200).json({
            success: true,
            advice: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Lấy danh sách trường và ngành cho dropdown
 * Hỗ trợ lọc theo school hoặc major qua query params
 * CHỈ trả về TÊN ngành/trường, KHÔNG trả về điểm chuẩn
 */
const getBenchmarkList = async (req, res) => {
    try {
        const { school, major } = req.query;
        
        const result = verificationService.getBenchmarkList(school || null, major || null);

        res.status(200).json({
            success: true,
            schools: result.schools,
            majors: result.majors
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    searchCareer,
    getBenchmarkList
};
