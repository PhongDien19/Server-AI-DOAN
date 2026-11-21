const bcrypt = require('bcrypt');
const {
  TaiKhoan,
  NguoiDung,
  CauHoi,
  PhienBanChamDiem
} = require('../models/danhSachModel');
const { SEED_QUESTIONS } = require('../data/duLieuMau');

// Các hàm tạo dữ liệu mẫu ban đầu nếu cơ sở dữ liệu chưa có dữ liệu.
const SeedService = {
  /**
   * Khởi tạo tài khoản quản trị viên và người dùng mặc định
   */
  async seedDefaultAdmin() {
    try {
      const defaultEmail = 'phongdien1905@gmail.com';
      const existing = await TaiKhoan.findOne({ where: { email: defaultEmail } });

      if (!existing) {
        const passwordHash = await bcrypt.hash('123456', 10);
        const admin = await TaiKhoan.create({
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
  },

  /**
   * Khởi tạo Ngân hàng câu hỏi chuẩn hóa
   */
  async seedQuestions() {
    try {
      const count = await CauHoi.count();
      if (count === 0) {
        console.log(`[Seed] Đang nạp ${SEED_QUESTIONS.length} câu hỏi chuẩn hóa vào CSDL...`);
        for (const q of SEED_QUESTIONS) {
          await CauHoi.create(q);
        }
        console.log(`✓ [Seed] Đã nạp thành công ${SEED_QUESTIONS.length} câu hỏi (Personality 24 câu, Holland 18 câu, Language, Career, Profile)!`);
      }
    } catch (e) {
      console.warn('[Seed] Lỗi nạp câu hỏi:', e.message);
    }
  },

  /**
   * Khởi tạo phiên bản thuật toán chấm điểm
   */
  async seedScoringVersion() {
    try {
      const existing = await PhienBanChamDiem.findOne({ where: { version: 'v1.0.0' } });
      if (!existing) {
        await PhienBanChamDiem.create({
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
        console.log('✓ [Seed] Đã khởi tạo phiên bản chấm điểm v1.0.0 thành công!');
      }
    } catch (e) {
      console.warn('[Seed] Lỗi nạp phiên bản thuật toán:', e.message);
    }
  },

  /**
   * Chạy toàn bộ quá trình Seed dữ liệu khởi tạo
   */
  async runAll() {
    await SeedService.seedDefaultAdmin();
    await SeedService.seedScoringVersion();
    await SeedService.seedQuestions();
  }
};

module.exports = SeedService;
