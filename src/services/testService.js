const { CauHoi: Question } = require('../models');
const { setSessionContext } = require('./sessionContextStore');

/**
 * Hàm lưu câu hỏi và câu trả lời trực tiếp vào bảng Question
 * @param {string} sessionId - Mã phiên làm bài (nếu đang làm dở thì truyền lên)
 * @param {number} userId - ID người dùng
 * @param {string} testName - Tên bài test
 * @param {Array} questions - Mảng câu hỏi với các trường bổ sung tùy loại test
 * @param {object} [userContext] - fullName, hobby, age, targetJob, educationLevel (lưu tạm theo session)
 */
const saveQuestions = async (sessionId, userId, testName, questions, userContext) => {
  try {
    // Tự sinh mã session (như chuỗi timestamp) nếu chưa có
    const currentSessionId = sessionId || `session_${Date.now()}`;

    if (userContext && typeof userContext === 'object') {
      setSessionContext(currentSessionId, userContext);
    }

    // Xác định loại test
    const testType = determineTestTypeFromQuestions(testName, questions);

    for (const q of questions) {
      if (q.id) {
        // Nếu câu hỏi đã có ID trong CSDL -> cập nhật câu trả lời
        await Question.update(
          { userAnswer: q.userAnswer },
          { where: { id: q.id, sessionId: currentSessionId } }
        );
      } else {
        // Nếu là lần đầu tạo câu hỏi -> lưu mới vào DB
        const questionData = {
          sessionId: currentSessionId,
          userId: userId || null,
          testName: testName || 'Bài test hướng nghiệp',
          testType: testType,
          questionText: q.questionText,
          options: q.options || null,
          userAnswer: q.userAnswer || null,
          order: q.order || 0
        };

        // Thêm các trường đặc biệt tùy loại test
        if (testType === 'holland' && q.hollandType) {
          questionData.hollandType = q.hollandType;
        }

        if (testType === 'personality' && q.trait) {
          questionData.trait = q.trait;
        }

        if (testType === 'cognitive') {
          questionData.questionType = q.type;
          questionData.correctAnswer = q.correctAnswer;
        }

        if (testType === 'values' && q.valueType) {
          questionData.valueType = q.valueType;
        }

        await Question.create(questionData);
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
 * Xác định loại test từ testName và cấu trúc câu hỏi
 */
function determineTestTypeFromQuestions(testName, questions) {
  if (!testName) return 'career';

  const name = testName.toLowerCase();

  if (name.includes('holland') || questions.some(q => q.hollandType)) {
    return 'holland';
  }

  if (name.includes('personality') || name.includes('big 5') || name.includes('mbti') || questions.some(q => q.trait)) {
    return 'personality';
  }

  if (name.includes('cognitive') || name.includes('năng lực') || questions.some(q => q.correctAnswer)) {
    return 'cognitive';
  }

  if (name.includes('values') || name.includes('giá trị') || questions.some(q => q.valueType)) {
    return 'values';
  }

  return 'career'; // Default
}

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
