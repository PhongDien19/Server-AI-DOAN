const AssessmentService = require('../services/assessmentService');
const { Assessment, AssessmentResult } = require('../models');

/**
 * Controller Quản lý Phiên Đánh giá Trắc nghiệm Hướng nghiệp
 */
class AssessmentController {
  /**
   * Bắt đầu một phiên đánh giá mới
   * Body: { flow: 'main' | 'flow_b', audience: 'student' | 'freshman', targetMajorId, certaintyLevel, targetReason }
   */
  static async startAssessment(req, res) {
    try {
      const userId = req.user ? req.user.id : (req.body.userId || null);
      const { flow, audience, targetMajorId, certaintyLevel, targetReason } = req.body;

      const result = await AssessmentService.startAssessment({
        userId,
        flow: flow || 'main',
        audience: audience || 'student',
        targetMajorId,
        certaintyLevel,
        targetReason
      });

      return res.status(201).json(result);
    } catch (error) {
      console.error('Lỗi startAssessment:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi khởi tạo phiên đánh giá: ' + error.message
      });
    }
  }

  /**
   * Lấy danh sách câu hỏi cho một section cụ thể
   */
  static async getSectionQuestions(req, res) {
    try {
      const { id, sectionType } = req.params;

      const result = await AssessmentService.getQuestionsForSection(id, sectionType);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Lỗi getSectionQuestions:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách câu hỏi: ' + error.message
      });
    }
  }

  /**
   * Nộp câu trả lời cho một section và nhận section tiếp theo
   * Body: { answers: [ { questionId, userAnswer, scoreContribution } ] }
   */
  static async submitSectionAnswers(req, res) {
    try {
      const { id } = req.params;
      const { sectionType, answers } = req.body;

      if (!sectionType || !Array.isArray(answers)) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ. Vui lòng cung cấp sectionType và danh sách answers.'
        });
      }

      const result = await AssessmentService.submitSectionAnswers(id, sectionType, answers);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Lỗi submitSectionAnswers:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi nộp câu trả lời: ' + error.message
      });
    }
  }

  /**
   * Nộp đánh giá mức độ tin cậy (Trust Check)
   * Body: { trustScore (1-5), isTrusted, disagreeReasons, feedbackText }
   */
  static async submitTrustCheck(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user ? req.user.id : null;
      const { trustScore, isTrusted, disagreeReasons, feedbackText, section } = req.body;

      if (!trustScore) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp điểm đánh giá độ tin tưởng (trustScore từ 1 đến 5).'
        });
      }

      const result = await AssessmentService.submitTrustCheck(id, {
        userId,
        section: section || 'overall',
        trustScore,
        isTrusted,
        disagreeReasons,
        feedbackText
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('Lỗi submitTrustCheck:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi ghi nhận Trust Check: ' + error.message
      });
    }
  }

  /**
   * Lấy kết quả toàn diện bài test
   */
  static async getResult(req, res) {
    try {
      const { id } = req.params;

      const result = await AssessmentService.getOrGenerateResult(id);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Lỗi getResult:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi tổng hợp kết quả đánh giá: ' + error.message
      });
    }
  }

  /**
   * Lấy lịch sử các bài test của một người dùng
   */
  static async getAssessmentHistory(req, res) {
    try {
      const userId = req.params.userId || (req.user ? req.user.id : null);
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp userId'
        });
      }

      const assessments = await Assessment.findAll({
        where: { userId },
        include: [{ model: AssessmentResult, as: 'Result' }],
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        total: assessments.length,
        history: assessments.map(a => ({
          assessmentId: a.id,
          flow: a.flow,
          audience: a.audience,
          targetMajorId: a.targetMajorId,
          status: a.status,
          trustScore: a.trustScore,
          createdAt: a.createdAt,
          result: a.Result || null
        }))
      });
    } catch (error) {
      console.error('Lỗi getAssessmentHistory:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy lịch sử bài test: ' + error.message
      });
    }
  }
}

module.exports = AssessmentController;

