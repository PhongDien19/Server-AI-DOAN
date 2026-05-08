const Question = require('../models/Question');

/**
 * Hàm lưu câu hỏi và câu trả lời trực tiếp vào bảng Question
 * @param {string} sessionId - Mã phiên làm bài (nếu đang làm dở thì truyền lên)
 * @param {number} userId - ID người dùng
 * @param {string} testName - Tên bài test
 * @param {Array} questions - Mảng câu hỏi [{ id, questionText, options, userAnswer, order }]
 */
const saveQuestions = async (sessionId, userId, testName, questions) => {
  try {
    // Tự sinh mã session (như chuỗi timestamp) nếu chưa có
    const currentSessionId = sessionId || `session_${Date.now()}`;

    for (const q of questions) {
      if (q.id) {
        // Nếu câu hỏi đã có ID trong CSDL -> cập nhật câu trả lời
        await Question.update(
          { userAnswer: q.userAnswer },
          { where: { id: q.id, sessionId: currentSessionId } }
        );
      } else {
        // Nếu là lần đầu tạo câu hỏi -> lưu mới vào DB
        await Question.create({
          sessionId: currentSessionId,
          userId: userId || null,
          testName: testName || 'Bài test hướng nghiệp',
          questionText: q.questionText,
          options: q.options || null,
          userAnswer: q.userAnswer || null,
          order: q.order || 0
        });
      }
    }

    return { 
      success: true, 
      message: 'Đã lưu câu hỏi & câu trả lời thành công', 
      sessionId: currentSessionId 
    };
  } catch (error) {
    console.error('Lỗi khi lưu Questions:', error);
    return { success: false, message: 'Lỗi hệ thống khi lưu' };
  }
};

/**
 * Hàm lấy toàn bộ câu hỏi (bao gồm câu trả lời dở) của 1 session
 */
const getQuestions = async (sessionId) => {
  try {
    const questions = await Question.findAll({ 
      where: { sessionId },
      order: [['order', 'ASC']]
    });
    return { success: true, data: questions };
  } catch (error) {
    console.error('Lỗi khi lấy Questions:', error);
    return { success: false, message: 'Lỗi hệ thống' };
  }
};

module.exports = {
  saveQuestions,
  getQuestions
};
