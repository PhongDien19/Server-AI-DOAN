const AssessmentService = require('../../services/dichVuDanhGia');

/** Luu phan hoi ve do tin cay cua ket qua. */
const guiDanhGiaDoTinCay = async (req, res) => {
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
};

module.exports = guiDanhGiaDoTinCay;
