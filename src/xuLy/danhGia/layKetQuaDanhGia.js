const AssessmentService = require('../../services/dichVuDanhGia');

/** Lay ket qua danh gia. */
const layKetQuaDanhGia = async (req, res) => {
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
};

module.exports = layKetQuaDanhGia;
