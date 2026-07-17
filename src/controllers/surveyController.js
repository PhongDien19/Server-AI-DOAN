const surveyService = require('../services/surveyService');
const { claimAssessmentResult } = require('../services/assessmentService');

const initSurvey = async (req, res) => {
    try {
        const { mode, target_career, age, education, location, hobby, academicData } = req.body;
        // Validate input
        if (!mode || !['Targeted', 'Discovery'].includes(mode)) {
            return res.status(400).json({ success: false, message: 'mode phải là Targeted hoặc Discovery' });
        }
        if (mode === 'Targeted' && !target_career) {
            return res.status(400).json({ success: false, message: 'target_career là bắt buộc khi mode = Targeted' });
        }

        // Kiểm tra và trừ token test nếu đã đăng nhập
        const userId = req.headers['x-user-id'] || req.body.userId;
        if (userId) {
            const { Taikhoan: UserAccount } = require('../models');
            const user = await UserAccount.findByPk(userId);
            if (user) {
                if (user.isActive === false) {
                    return res.status(403).json({
                        success: false,
                        message: 'Tài khoản của bạn đã bị vô hiệu hóa hoặc khóa. Vui lòng liên hệ quản trị viên.'
                    });
                }
                if (user.tokenTest <= 0) {
                    return res.status(403).json({
                        success: false,
                        tokenLimit: true,
                        message: 'Hết lượt làm bài test. Vui lòng nâng cấp hoặc mua thêm lượt.'
                    });
                }
                user.tokenTest -= 1;
                await user.save();
            }
        }

        const result = await surveyService.initSurvey(mode, target_career, { age, education, location, hobby, academicData });
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const submitSurvey = async (req, res) => {
    try {
        const { sessionId, answers } = req.body;
        const userId = req.body.userId || req.headers['x-user-id'] || req.query.userId;

        if (userId) {
            const { Taikhoan: UserAccount } = require('../models');
            const user = await UserAccount.findByPk(userId);
            if (user && user.isActive === false) {
                return res.status(403).json({
                    success: false,
                    message: 'Tài khoản của bạn đã bị vô hiệu hóa hoặc khóa. Vui lòng liên hệ quản trị viên.'
                });
            }
        }

        // Validate
        if (!sessionId || !answers || !Array.isArray(answers)) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin sessionId hoặc answers' });
        }

        const result = await surveyService.processSurveySubmit(sessionId, answers);


        // Tự động claim kết quả và cập nhật UserProfile nếu người dùng đã đăng nhập
        if (userId && result.requiresLogin) {
            const claimRes = await claimAssessmentResult(sessionId, userId);
            if (claimRes.success) {
                return res.status(200).json({
                    success: true,
                    requiresLogin: false,
                    sessionId,
                    evaluation: claimRes.evaluation || result.evaluation,
                    profile: claimRes.profile,
                    hasAnyValidBenchmark: false,
                });
            }
        }

        res.status(200).json({
            success: true,
            ...result,
            hasAnyValidBenchmark: false,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const feedbackSurvey = async (req, res) => {
    try {
        const { survey_id, rating_score, comment } = req.body;
        const userId = req.body.userId || req.headers['x-user-id'] || null;

        if (!survey_id || !rating_score) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin survey_id hoặc rating_score' });
        }

        await surveyService.saveFeedback(survey_id, rating_score, comment, userId);
        res.status(201).json({ success: true, message: 'Cảm ơn bạn đã gửi phản hồi!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    initSurvey,
    submitSurvey,
    feedbackSurvey
};
