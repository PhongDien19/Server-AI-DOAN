const { randomBytes } = require('crypto');
const { CauHoi, sequelize } = require('../../models/danhSachModel');
const AIService = require('../../services/dichVuAI');

/** Tao va luu cau hoi tieng Anh bang AI. */
const taoCauHoiTiengAnh = async (req, res) => {
  const {
    count = 5,
    topic = 'mixed',
    difficulty = 'intermediate'
  } = req.body || {};
  const topics = ['grammar', 'vocabulary', 'reading', 'mixed'];
  const difficulties = ['easy', 'intermediate', 'advanced'];

  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 10 ||
    !topics.includes(topic) ||
    !difficulties.includes(difficulty)
  ) {
    return res.status(400).json({
      success: false,
      message: 'count phải từ 1 đến 10; topic: grammar, vocabulary, reading hoặc mixed; difficulty: easy, intermediate hoặc advanced.'
    });
  }

  let generatedQuestions;
  try {
    generatedQuestions = await AIService.generateEnglishQuestions({
      count,
      topic,
      difficulty
    });
  } catch (error) {
    console.error('Lỗi generateEnglishQuestions:', error.code || error.message);
    return res.status(error.code === 'AI_NOT_CONFIGURED' ? 503 : 502).json({
      success: false,
      message: error.message
    });
  }

  try {
    const questions = await sequelize.transaction(async transaction => {
      const existingQuestions = await CauHoi.findAll({
        where: { section: 'language' },
        attributes: ['orderIndex', 'text'],
        transaction
      });
      const existingTexts = new Set(
        existingQuestions.map(question => question.text.trim().toLowerCase())
      );
      if (generatedQuestions.some(question =>
        existingTexts.has(question.text.trim().toLowerCase())
      )) {
        const error = new Error('AI tạo câu hỏi trùng với câu đã có trong ngân hàng.');
        error.code = 'DUPLICATE_QUESTION';
        throw error;
      }
      const lastOrderIndex = existingQuestions.reduce(
        (max, question) => Math.max(max, Number(question.orderIndex) || 0),
        0
      );
      const batchId = randomBytes(6).toString('hex');
      const records = generatedQuestions.map((question, index) => ({
        id: `L_AI_${batchId}_${index + 1}`,
        section: 'language',
        audience: 'all',
        type: 'single_choice',
        text: question.text,
        options: question.options.map(option => ({
          ...option,
          isCorrect: option.id === question.correctOptionId,
          value: option.id === question.correctOptionId ? 100 : 0
        })),
        scoring: { dimension: question.dimension, weight: 1 },
        version: '1.0.0',
        orderIndex: lastOrderIndex + index + 1,
        isActive: true
      }));

      return CauHoi.bulkCreate(records, {
        transaction,
        validate: true
      });
    });

    return res.status(201).json({
      success: true,
      message: `Đã tạo và lưu ${questions.length} câu hỏi tiếng Anh bằng AI`,
      questions
    });
  } catch (error) {
    if (error.code === 'DUPLICATE_QUESTION') {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    console.error('Lỗi lưu câu hỏi tiếng Anh được tạo bằng AI:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể lưu câu hỏi tiếng Anh được tạo bằng AI'
    });
  }
};

module.exports = taoCauHoiTiengAnh;
