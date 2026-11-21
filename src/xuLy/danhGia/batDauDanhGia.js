const AssessmentService = require('../../services/dichVuDanhGia');

/** Tao phien danh gia moi. */
const batDauDanhGia = async (req, res) => {
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
};

module.exports = batDauDanhGia;
