const { CauHoi } = require('../../models/danhSachModel');
const { SEED_QUESTIONS } = require('../../data/duLieuMau');

/** Lay danh sach cau hoi va ap dung bo loc. */
const layDanhSachCauHoi = async (req, res) => {
  try {
    const { section, audience, type, page = 1, limit = 50 } = req.query;
    const where = {};

    if (section) where.section = section;
    if (audience) where.audience = audience;
    if (type) where.type = type;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const offset = (pageNum - 1) * limitNum;

    let { count, rows: questions } = await CauHoi.findAndCountAll({
      where,
      order: [['orderIndex', 'ASC']],
      limit: limitNum,
      offset
    });

    // Nếu DB chưa có câu hỏi, fallback lấy từ SEED_QUESTIONS
    if (count === 0 && Object.keys(where).length === 0) {
      questions = SEED_QUESTIONS;
      count = SEED_QUESTIONS.length;
    }

    return res.status(200).json({
      success: true,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum),
      questions
    });
  } catch (error) {
    console.error('Lỗi getQuestions:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách câu hỏi: ' + error.message
    });
  }
};

module.exports = layDanhSachCauHoi;
