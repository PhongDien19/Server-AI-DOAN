const { Nganh, HoSoNganh, DiemChuan, TruongDaiHoc } = require('../../models/danhSachModel');

/** Lay thong tin nganh va diem chuan lien quan. */
const layNganhTheoMa = async (req, res) => {
  try {
    const { id } = req.params;

    const major = await Nganh.findByPk(id, {
      include: [{ model: HoSoNganh, as: 'Profile' }]
    });

    if (!major) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ngành đào tạo' });
    }

    // Lấy danh sách trường đào tạo và điểm chuẩn
    const admissionScores = await DiemChuan.findAll({
      where: { majorId: id },
      include: [{ model: TruongDaiHoc, as: 'University' }]
    });

    return res.status(200).json({
      success: true,
      major,
      admissionScores: admissionScores.map(as => ({
        universityId: as.universityId,
        universityName: as.TruongDaiHoc?.name || as.universityId,
        region: as.TruongDaiHoc?.region || 'Toàn quốc',
        cutoffScore: as.cutoffScore,
        scoreScale: as.scoreScale,
        admissionMethod: as.admissionMethod,
        admissionYear: as.admissionYear,
        sourceUrl: as.sourceUrl
      }))
    });
  } catch (error) {
    console.error('Lỗi getMajorById:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin chi tiết ngành: ' + error.message
    });
  }
};

module.exports = layNganhTheoMa;
