const { University, AdmissionScore, Major } = require('../models');
const { SEED_UNIVERSITIES, SEED_ADMISSION_SCORES } = require('../data/seedData');

class SchoolController {
  /**
   * Lấy danh sách 30 trường đại học (hỗ trợ lọc miền Bắc/Trung/Nam, tìm kiếm)
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

      if (!schools || schools.length === 0) {
        schools = SEED_UNIVERSITIES;
        if (region) schools = schools.filter(s => s.region === region);
        if (province) schools = schools.filter(s => s.province === province);
        if (type) schools = schools.filter(s => s.type === type);
      }

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

      let school = await University.findByPk(id, {
        include: [
          {
            model: AdmissionScore,
            as: 'AdmissionScores',
            include: [{ model: Major, as: 'Major' }]
          }
        ]
      });

      if (!school) {
        const seedS = SEED_UNIVERSITIES.find(s => s.id === id || s.code === id);
        if (!seedS) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy trường đại học' });
        }
        const scores = SEED_ADMISSION_SCORES.filter(as => as.universityId === seedS.id);
        school = {
          ...seedS,
          AdmissionScores: scores
        };
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

      let scores = await AdmissionScore.findAll({
        where,
        include: [
          { model: University, as: 'University' },
          { model: Major, as: 'Major' }
        ],
        order: [['admissionYear', 'DESC'], ['cutoffScore', 'DESC']]
      });

      if (!scores || scores.length === 0) {
        scores = SEED_ADMISSION_SCORES;
        if (majorId) scores = scores.filter(s => s.majorId === majorId);
        if (universityId) scores = scores.filter(s => s.universityId === universityId);
        if (year) scores = scores.filter(s => s.admissionYear === parseInt(year, 10));
      }

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

