const chatService = require('../services/chatService');

const askChatbot = async (req, res) => {
    try {
        const { question } = req.body;
        const userId = req.userId; // Provided by authMiddleware

        if (!question) {
            return res.status(400).json({ success: false, message: 'Câu hỏi không được để trống' });
        }

        const result = await chatService.askChatbot(userId, question);
        if (!result.success) {
            return res.status(403).json(result); // Hết token
        }

        // Lọc bỏ điểm null/undefined khỏi response nếu có
        if (result.relatedBenchmarks) {
            result.relatedBenchmarks = result.relatedBenchmarks.filter(b => {
                const score = b.benchmark ?? b.diem ?? b.score;
                return score !== null && score !== undefined && !isNaN(score) && score > 0;
            });
        }

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    askChatbot
};
