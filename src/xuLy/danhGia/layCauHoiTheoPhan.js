const AssessmentService = require('../../services/dichVuDanhGia');

/** Lay cau hoi cua mot phan trong phien danh gia. */
const layCauHoiTheoPhan = async (req, res) => {
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
};

module.exports = layCauHoiTheoPhan;
