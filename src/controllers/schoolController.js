const { University, AdmissionScore, Major } = require('../models');

class SchoolController {
  /**
   * Lấy danh sách trường đại học (hỗ trợ lọc miền Bắc/Trung/Nam, tìm kiếm)
   */
  static async getSchools(req, res) {
    try {
      const { region, province, type, search } = req.query;
      const where = {};

      if (region) where.region = region;
      if (province) where.province = province;
      if (type) where.type = type;

      let schools = await University.findAll({
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
  }

  /**
   * Lấy chi tiết một trường đại học và điểm chuẩn các ngành
   */
  static async getSchoolById(req, res) {
    try {
      const { id } = req.params;

      const include = [
        {
          model: AdmissionScore,
          as: 'AdmissionScores',
          include: [{ model: Major, as: 'Major' }]
        }
      ];
      let school = await University.findByPk(id, { include });

      if (!school) {
        school = await University.findOne({
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
  }

  /**
   * Tra cứu điểm chuẩn tuyển sinh theo ngành hoặc trường
   */
  static async getAdmissionScores(req, res) {
    try {
      const { majorId, universityId, year, method } = req.query;
      const where = {};

      if (majorId) where.majorId = majorId;
      if (universityId) where.universityId = universityId;
      if (year) where.admissionYear = parseInt(year, 10);
      if (method) where.admissionMethod = method;

      const scores = await AdmissionScore.findAll({
        where,
        include: [
          { model: University, as: 'University' },
          { model: Major, as: 'Major' }
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
  }
}

module.exports = SchoolController;
