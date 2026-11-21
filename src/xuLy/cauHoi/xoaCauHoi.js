const { CauHoi } = require('../../models/danhSachModel');

/** Xoa cau hoi. */
const xoaCauHoi = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await CauHoi.findByPk(id);

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
};

module.exports = xoaCauHoi;
