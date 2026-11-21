const { CauHoi } = require('../../models/danhSachModel');
const { SEED_QUESTIONS } = require('../../data/duLieuMau');

/** Lay chi tiet mot cau hoi. */
const layCauHoiTheoId = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await CauHoi.findByPk(id);

    if (!question) {
      const seedQ = SEED_QUESTIONS.find(q => q.id === id);
      if (seedQ) {
        return res.status(200).json({ success: true, question: seedQ });
      }
      return res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi' });
    }

    return res.status(200).json({ success: true, question });
  } catch (error) {
    console.error('Lỗi getQuestionById:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin câu hỏi: ' + error.message
    });
  }
};

module.exports = layCauHoiTheoId;
