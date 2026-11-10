const { Question } = require('../models');
const { SEED_QUESTIONS } = require('../data/seedData');

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
