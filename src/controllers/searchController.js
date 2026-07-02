const searchService = require('../services/searchService');

const searchCareer = async (req, res) => {
    try {
        const { careerName, location, age } = req.body;

        if (!careerName || !location || age == null) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu thông tin careerName, location hoặc age trong body' 
            });
        }

        const result = await searchService.searchCareerQuickly(careerName, location, Number(age));
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

module.exports = {
    searchCareer
};
