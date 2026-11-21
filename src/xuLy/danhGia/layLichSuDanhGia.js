const { PhienDanhGia, KetQuaDanhGia } = require('../../models/danhSachModel');

/** Lay lich su danh gia cua nguoi dung. */
const layLichSuDanhGia = async (req, res) => {
  try {
    const userId = req.params.userId || (req.user ? req.user.id : null);
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp userId'
      });
    }

    const assessments = await PhienDanhGia.findAll({
      where: { userId },
      include: [{ model: KetQuaDanhGia, as: 'Result' }],
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
};

module.exports = layLichSuDanhGia;
