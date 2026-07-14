const searchService = require('../services/searchService');

const searchCareer = async (req, res) => {
    try {
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

module.exports = {
    searchCareer
};
