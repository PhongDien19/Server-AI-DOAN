const UserProfile = require('../models/UserProfile');
const Question = require('../models/Question');

/**
 * Lấy thông tin hồ sơ người dùng
 * @param {number} userId 
 */
const getProfile = async (userId) => {
    try {
        const profile = await UserProfile.findOne({ where: { userId } });
        if (!profile) {
            return { success: false, message: 'Không tìm thấy hồ sơ người dùng' };
        }
        return { success: true, profile };
    } catch (error) {
        console.error("Lỗi getProfile:", error);
        return { success: false, message: "Lỗi hệ thống khi lấy hồ sơ" };
    }
};

/**
 * Cập nhật thông tin hồ sơ
 * @param {number} userId 
 * @param {object} data - Dữ liệu cần cập nhật (từ req.body)
 */
const updateProfile = async (userId, data) => {
    try {
        const profile = await UserProfile.findOne({ where: { userId } });
        if (!profile) {
            return { success: false, message: 'Không tìm thấy hồ sơ người dùng' };
        }

        // Chỉ cho phép cập nhật các trường này
        const allowedFields = ['fullName', 'avatarUrl', 'dateOfBirth', 'bio', 'interests', 'targetJob', 'educationLevel', 'phone'];
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                profile[field] = data[field];
            }
        }

        await profile.save();
        return { success: true, message: 'Cập nhật hồ sơ thành công', profile };
    } catch (error) {
        console.error("Lỗi updateProfile:", error);
        return { success: false, message: "Lỗi hệ thống khi cập nhật hồ sơ" };
    }
};

/**
 * Lấy lịch sử làm bài test của người dùng
 * @param {number} userId 
 */
const getHistory = async (userId) => {
    try {
        // Lấy tất cả câu hỏi mà user này đã làm
        const questions = await Question.findAll({
            where: { userId },
            order: [['sessionId', 'DESC'], ['order', 'ASC']]
        });

        if (!questions || questions.length === 0) {
            return { success: true, history: [] };
        }

        // Gom nhóm các câu hỏi theo từng sessionId (từng bài test)
        const sessionsMap = {};
        for (const q of questions) {
            if (!sessionsMap[q.sessionId]) {
                sessionsMap[q.sessionId] = {
                    sessionId: q.sessionId,
                    testName: q.testName,
                    isCompleted: true, // Giả sử là đã hoàn thành
                    questions: []
                };
            }
            sessionsMap[q.sessionId].questions.push(q);
            
            // Nếu có câu nào chưa trả lời thì đánh dấu là chưa hoàn thành
            if (!q.userAnswer) {
                sessionsMap[q.sessionId].isCompleted = false;
            }
        }

        // Chuyển Map thành mảng
        const history = Object.values(sessionsMap);
        return { success: true, history };
    } catch (error) {
        console.error("Lỗi getHistory:", error);
        return { success: false, message: "Lỗi hệ thống khi lấy lịch sử" };
    }
};

module.exports = {
    getProfile,
    updateProfile,
    getHistory
};
