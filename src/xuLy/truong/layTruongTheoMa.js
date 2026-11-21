const { TruongDaiHoc, DiemChuan, Nganh } = require('../../models/danhSachModel');

/** Lay thong tin truong va diem chuan. */
const layTruongTheoMa = async (req, res) => {
  try {
    const { id } = req.params;

    const include = [
      {
        model: DiemChuan,
        as: 'AdmissionScores',
        include: [{ model: Nganh, as: 'Major' }]
      }
    ];
    let school = await TruongDaiHoc.findByPk(id, { include });

    if (!school) {
      school = await TruongDaiHoc.findOne({
        where: { code: id },
        include
      });
    }

    if (!school) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy trường đại học' });
    }

    return res.status(200).json({
      success: true,
      school
    });
  } catch (error) {
    console.error('Lỗi getSchoolById:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin trường: ' + error.message
    });
  }
};

module.exports = layTruongTheoMa;
