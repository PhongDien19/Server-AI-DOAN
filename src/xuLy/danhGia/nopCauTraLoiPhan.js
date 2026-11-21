const AssessmentService = require('../../services/dichVuDanhGia');

/** Luu cau tra loi cua mot phan danh gia. */
const nopCauTraLoiPhan = async (req, res) => {
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
};

module.exports = nopCauTraLoiPhan;
