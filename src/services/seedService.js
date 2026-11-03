const bcrypt = require('bcrypt');
const {
  Taikhoan,
  NguoiDung,
  Question,
  Major,
  MajorProfile,
  University,
  AdmissionScore,
  ScoringVersion
} = require('../models');
const {
  SEED_QUESTIONS,
  SEED_MAJORS,
  SEED_UNIVERSITIES,
  SEED_ADMISSION_SCORES
} = require('../data/seedData');

class SeedService {
  /**
   * Khởi tạo tài khoản quản trị viên và người dùng mặc định
   */
  static async seedDefaultAdmin() {
    try {
      const defaultEmail = 'phongdien1905@gmail.com';
      const existing = await Taikhoan.findOne({ where: { email: defaultEmail } });

      if (!existing) {
        const passwordHash = await bcrypt.hash('123456', 10);
        const admin = await Taikhoan.create({
          email: defaultEmail,
          passwordHash,
          fullName: 'Phong Điền (Admin)',
          role: 'admin',
          isActive: true,
          tokenCount: 100,
          tokenTest: 100,
          createdAt: new Date()
        });

        await NguoiDung.create({
          userId: admin.id,
          fullName: 'Phong Điền (Admin)',
          educationLevel: 'Đại học',
          interests: 'Quản trị hệ thống, Hướng nghiệp AI'
        });

        console.log(`✓ [Seed] Khởi tạo tài khoản Admin mặc định: ${defaultEmail} / 123456`);
      }
    } catch (e) {
      console.warn('[Seed] Lỗi tạo tài khoản admin:', e.message);
    }
  }

  /**
   * Khởi tạo Ngân hàng câu hỏi chuẩn hóa
   */
  static async seedQuestions() {
    try {
      const count = await Question.count();
      if (count === 0) {
        console.log(`[Seed] Đang nạp ${SEED_QUESTIONS.length} câu hỏi chuẩn hóa vào CSDL...`);
        for (const q of SEED_QUESTIONS) {
          await Question.create(q);
        }
        console.log(`✓ [Seed] Đã nạp thành công ${SEED_QUESTIONS.length} câu hỏi (Personality 24 câu, Holland 18 câu, Language, Career, Profile)!`);
      }
    } catch (e) {
      console.warn('[Seed] Lỗi nạp câu hỏi:', e.message);
    }
  }

  /**
   * Khởi tạo Danh mục Ngành & Hồ sơ năng lực ngành (MajorProfiles)
   */
  static async seedMajors() {
    try {
      const count = await Major.count();
      if (count === 0) {
        console.log(`[Seed] Đang nạp ${SEED_MAJORS.length} ngành trọng điểm & Hồ sơ năng lực ngành...`);
        for (const m of SEED_MAJORS) {
          await Major.create({
            id: m.id,
            name: m.name,
            category: m.category,
            description: m.description
          });

          await MajorProfile.create({
            majorId: m.id,
            ...m.profile
          });
        }
        console.log(`✓ [Seed] Đã nạp thành công ${SEED_MAJORS.length} ngành và hồ sơ năng lực MajorProfiles!`);
      }
    } catch (e) {
      console.warn('[Seed] Lỗi nạp ngành học:', e.message);
    }
  }

  /**
   * Khởi tạo 30 Trường đại học và Điểm chuẩn tuyển sinh
   */
  static async seedUniversities() {
    try {
      const count = await University.count();
      if (count === 0) {
        console.log(`[Seed] Đang nạp 30 trường đại học (10 Bắc, 10 Trung, 10 Nam)...`);
        for (const uni of SEED_UNIVERSITIES) {
          await University.create(uni);
        }

        console.log(`[Seed] Đang nạp điểm chuẩn tuyển sinh AdmissionScores...`);
        for (const score of SEED_ADMISSION_SCORES) {
          await AdmissionScore.create(score);
        }

        console.log(`✓ [Seed] Đã nạp 30 trường đại học và các mốc điểm chuẩn thành công!`);
      }
    } catch (e) {
      console.warn('[Seed] Lỗi nạp trường đại học:', e.message);
    }
  }

  /**
   * Khởi tạo phiên bản thuật toán chấm điểm ScoringVersion
   */
  static async seedScoringVersion() {
    try {
      const existing = await ScoringVersion.findOne({ where: { version: 'v1.0.0' } });
      if (!existing) {
        await ScoringVersion.create({
          version: 'v1.0.0',
          name: 'Phiên bản thuật toán trắc nghiệm chuẩn v1.0 (Luồng chính 40/30/10/10/10, Luồng B 40/20/15/15/10)',
          mainFlowWeights: {
            holland: 0.40,
            personality: 0.30,
            profile: 0.10,
            language: 0.10,
            career: 0.10
          },
          flowBWeights: {
            holland: 0.40,
            personality: 0.20,
            profile: 0.15,
            language: 0.15,
            career: 0.10
          },
          flowBThresholds: {
            veryFit: 75,
            fit: 55,
            partialFit: 40
          },
          isActive: true
        });
        console.log('✓ [Seed] Đã khởi tạo ScoringVersion v1.0.0 thành công!');
      }
    } catch (e) {
      console.warn('[Seed] Lỗi nạp phiên bản thuật toán:', e.message);
    }
  }

  /**
   * Chạy toàn bộ quá trình Seed dữ liệu khởi tạo
   */
  static async runAll() {
    await this.seedDefaultAdmin();
    await this.seedScoringVersion();
    await this.seedQuestions();
    await this.seedMajors();
    await this.seedUniversities();
  }
}

module.exports = SeedService;

