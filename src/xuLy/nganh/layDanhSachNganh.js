const { Nganh, HoSoNganh } = require('../../models/danhSachModel');

/** Lay danh sach nganh va ho so nang luc. */
const layDanhSachNganh = async (req, res) => {
  try {
    const { category, search } = req.query;
    const where = {};
    if (category) where.category = category;

    let majors = await Nganh.findAll({
      where,
      include: [{ model: HoSoNganh, as: 'Profile' }]
    });

    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      majors = majors.filter(m =>
        m.name.toLowerCase().includes(s) || m.id.toLowerCase().includes(s)
      );
    }

    return res.status(200).json({
      success: true,
      total: majors.length,
      majors
    });
  } catch (error) {
    console.error('Lỗi getMajors:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách ngành nghề: ' + error.message
    });
  }
};

module.exports = layDanhSachNganh;
