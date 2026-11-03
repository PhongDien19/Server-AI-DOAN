const { Major, MajorProfile, AdmissionScore, University } = require('../models');
const { SEED_MAJORS } = require('../data/seedData');

class MajorController {
  /**
   * Lấy danh sách ngành nghề (kèm hồ sơ năng lực)
   */
  static async getMajors(req, res) {
    try {
      const { category, search } = req.query;
      const where = {};
      if (category) where.category = category;

      let majors = await Major.findAll({
        where,
        include: [{ model: MajorProfile, as: 'Profile' }]
      });

      // Fallback nếu DB rỗng
      if (!majors || majors.length === 0) {
        majors = SEED_MAJORS.map(m => ({
          id: m.id,
          name: m.name,
          category: m.category,
          description: m.description,
          Profile: m.profile
        }));
      }

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
  }

  /**
   * Lấy chi tiết một ngành theo ID (kèm hồ sơ năng lực & các trường đào tạo)
   */
  static async getMajorById(req, res) {
    try {
      const { id } = req.params;

      let major = await Major.findByPk(id, {
        include: [{ model: MajorProfile, as: 'Profile' }]
      });

      if (!major) {
        const seedM = SEED_MAJORS.find(m => m.id === id);
        if (seedM) {
          major = {
            id: seedM.id,
            name: seedM.name,
            category: seedM.category,
            description: seedM.description,
            Profile: seedM.profile
          };
        } else {
          return res.status(404).json({ success: false, message: 'Không tìm thấy ngành đào tạo' });
        }
      }

      // Lấy danh sách trường đào tạo và điểm chuẩn
      const admissionScores = await AdmissionScore.findAll({
        where: { majorId: id },
        include: [{ model: University, as: 'University' }]
      });

      return res.status(200).json({
        success: true,
        major,
        admissionScores: admissionScores.map(as => ({
          universityId: as.universityId,
          universityName: as.University?.name || as.universityId,
          region: as.University?.region || 'Toàn quốc',
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
  }
}

module.exports = MajorController;

