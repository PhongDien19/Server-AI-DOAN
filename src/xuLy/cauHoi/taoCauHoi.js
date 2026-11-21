const { CauHoi } = require('../../models/danhSachModel');

/** Tao cau hoi moi. */
const taoCauHoi = async (req, res) => {
  try {
    const data = req.body;
    if (!data.id || !data.section || !data.text || !data.type) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ id, section, type và text'
      });
    }

    const existing = await CauHoi.findByPk(data.id);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Mã câu hỏi (id) đã tồn tại'
      });
    }

    const newQ = await CauHoi.create(data);
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
};

module.exports = taoCauHoi;
