const { TruongDaiHoc } = require('../../models/danhSachModel');

/** Lay danh sach truong theo khu vuc va bo loc. */
const layDanhSachTruong = async (req, res) => {
  try {
    const { region, province, type, search } = req.query;
    const where = {};

    if (region) where.region = region;
    if (province) where.province = province;
    if (type) where.type = type;

    let schools = await TruongDaiHoc.findAll({
      where,
      order: [['region', 'ASC'], ['name', 'ASC']]
    });

    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      schools = schools.filter(sch =>
        sch.name.toLowerCase().includes(s) ||
        sch.code.toLowerCase().includes(s) ||
        sch.id.toLowerCase().includes(s)
      );
    }

    return res.status(200).json({
      success: true,
      total: schools.length,
      schools
    });
  } catch (error) {
    console.error('Lỗi getSchools:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách trường đại học: ' + error.message
    });
  }
};

module.exports = layDanhSachTruong;
