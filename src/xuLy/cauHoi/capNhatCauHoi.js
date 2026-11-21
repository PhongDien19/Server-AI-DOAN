const { CauHoi } = require('../../models/danhSachModel');

/** Cap nhat cau hoi. */
const capNhatCauHoi = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await CauHoi.findByPk(id);

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
};

module.exports = capNhatCauHoi;
