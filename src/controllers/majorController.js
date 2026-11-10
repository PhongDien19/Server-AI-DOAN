const { Major, MajorProfile, AdmissionScore, University } = require('../models');

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

      const major = await Major.findByPk(id, {
        include: [{ model: MajorProfile, as: 'Profile' }]
      });

      if (!major) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy ngành đào tạo' });
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
