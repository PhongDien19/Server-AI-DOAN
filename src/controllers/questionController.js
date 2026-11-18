const { randomBytes } = require('crypto');
const { Question, sequelize } = require('../models');
const { SEED_QUESTIONS } = require('../data/seedData');
const AIService = require('../services/aiService');

class QuestionController {
  /**
   * Lấy danh sách câu hỏi trong ngân hàng (hỗ trợ lọc theo section, audience, type)
   */
  static async getQuestions(req, res) {
    try {
      const { section, audience, type, page = 1, limit = 50 } = req.query;
      const where = {};

      if (section) where.section = section;
      if (audience) where.audience = audience;
      if (type) where.type = type;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 50);
      const offset = (pageNum - 1) * limitNum;

      let { count, rows: questions } = await Question.findAndCountAll({
        where,
        order: [['orderIndex', 'ASC']],
        limit: limitNum,
        offset
      });

      // Nếu DB chưa có câu hỏi, fallback lấy từ SEED_QUESTIONS
      if (count === 0 && Object.keys(where).length === 0) {
        questions = SEED_QUESTIONS;
        count = SEED_QUESTIONS.length;
      }

      return res.status(200).json({
        success: true,
        total: count,
        page: pageNum,
        totalPages: Math.ceil(count / limitNum),
        questions
      });
    } catch (error) {
      console.error('Lỗi getQuestions:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách câu hỏi: ' + error.message
      });
    }
  }

  /**
   * Lấy chi tiết một câu hỏi theo ID
   */
  static async getQuestionById(req, res) {
    try {
      const { id } = req.params;
      const question = await Question.findByPk(id);

      if (!question) {
        const seedQ = SEED_QUESTIONS.find(q => q.id === id);
        if (seedQ) {
          return res.status(200).json({ success: true, question: seedQ });
        }
        return res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi' });
      }

      return res.status(200).json({ success: true, question });
    } catch (error) {
      console.error('Lỗi getQuestionById:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thông tin câu hỏi: ' + error.message
      });
    }
  }

  /**
   * Tạo câu hỏi mới trong ngân hàng
   */
  static async createQuestion(req, res) {
    try {
      const data = req.body;
      if (!data.id || !data.section || !data.text || !data.type) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ id, section, type và text'
        });
      }

      const existing = await Question.findByPk(data.id);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Mã câu hỏi (id) đã tồn tại'
        });
      }

      const newQ = await Question.create(data);
      return res.status(201).json({
        success: true,
        message: 'Tạo câu hỏi thành công',
        question: newQ
      });
    } catch (error) {
      console.error('Lỗi createQuestion:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo câu hỏi: ' + error.message
      });
    }
  }

  /**
   * Dùng AI tạo và lưu câu hỏi trắc nghiệm tiếng Anh
   */
  static async generateEnglishQuestions(req, res) {
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
        const existingQuestions = await Question.findAll({
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

        return Question.bulkCreate(records, {
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
  }

  /**
   * Cập nhật câu hỏi
   */
  static async updateQuestion(req, res) {
    try {
      const { id } = req.params;
      const question = await Question.findByPk(id);

      if (!question) {
        return res.status(404).json({ success: false, message: 'Câu hỏi không tồn tại' });
      }

      await question.update(req.body);
      return res.status(200).json({
        success: true,
        message: 'Cập nhật câu hỏi thành công',
        question
      });
    } catch (error) {
      console.error('Lỗi updateQuestion:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật câu hỏi: ' + error.message
      });
    }
  }

  /**
   * Xóa câu hỏi khỏi ngân hàng
   */
  static async deleteQuestion(req, res) {
    try {
      const { id } = req.params;
      const question = await Question.findByPk(id);

      if (!question) {
        return res.status(404).json({ success: false, message: 'Câu hỏi không tồn tại' });
      }

      await question.destroy();
      return res.status(200).json({
        success: true,
        message: 'Đã xóa câu hỏi thành công'
      });
    } catch (error) {
      console.error('Lỗi deleteQuestion:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa câu hỏi: ' + error.message
      });
    }
  }

}

module.exports = QuestionController;
