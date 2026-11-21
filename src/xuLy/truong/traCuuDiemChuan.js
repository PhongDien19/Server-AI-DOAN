const { TruongDaiHoc, DiemChuan, Nganh } = require('../../models/danhSachModel');

/** Tra cuu diem chuan theo nganh, truong, nam va phuong thuc. */
const traCuuDiemChuan = async (req, res) => {
  try {
    const { majorId, universityId, year, method } = req.query;
    const where = {};

    if (majorId) where.majorId = majorId;
    if (universityId) where.universityId = universityId;
    if (year) where.admissionYear = parseInt(year, 10);
    if (method) where.admissionMethod = method;

    const scores = await DiemChuan.findAll({
      where,
      include: [
        { model: TruongDaiHoc, as: 'University' },
        { model: Nganh, as: 'Major' }
      ],
      order: [['admissionYear', 'DESC'], ['cutoffScore', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      total: scores.length,
      admissionScores: scores
    });
  } catch (error) {
    console.error('Lỗi getAdmissionScores:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tra cứu điểm chuẩn: ' + error.message
    });
  }
};

module.exports = traCuuDiemChuan;
