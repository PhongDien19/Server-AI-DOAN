require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const SeedService = require('./services/seedService');

const PORT = process.env.PORT || 5000;

/**
 * Khởi động ứng dụng Backend Trắc nghiệm Hướng nghiệp (Kiến trúc MVC)
 */
const startServer = async () => {
  try {
    console.log('--- Đang khởi động hệ thống Trắc nghiệm Hướng nghiệp AI ---');

    // 1. Kiểm tra kết nối cơ sở dữ liệu
    await sequelize.authenticate();
    const dialectName = sequelize.getDialect().toUpperCase();
    console.log(`✓ Đã kết nối cơ sở dữ liệu thành công (${dialectName})!`);

    // 2. Tự động đồng bộ hóa cấu trúc bảng
    await sequelize.sync();
    console.log('✓ Đã đồng bộ hóa toàn bộ các bảng dữ liệu thành công!');

    // 3. Khởi tạo dữ liệu mẫu (Seed Data)
    await SeedService.runAll();

    // 4. Lắng nghe yêu cầu HTTP
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`=================================================================`);
      console.log(` HỆ THỐNG TRẮC NGHIỆM HƯỚNG NGHIỆP THPT & SINH VIÊN NĂM 1 (MVC)`);
      console.log(` Cổng máy chủ:  http://localhost:${PORT}`);
      console.log(` API Endpoint: http://localhost:${PORT}/api`);
      console.log(` - Đánh giá:   /api/assessment (Luồng chính & Luồng B)`);
      console.log(` - Câu hỏi:    /api/questions (Personality, Holland, Language...)`);
      console.log(` - Ngành nghề: /api/majors (10 ngành trọng điểm & MajorProfiles)`);
      console.log(` - Trường học: /api/schools (30 trường đại học Bắc/Trung/Nam)`);
      console.log(` - Xác thực:   /api/auth (Đăng ký, Đăng nhập, Token JWT)`);
      console.log(`=================================================================`);
    });
  } catch (error) {
    console.error('✗ Lỗi nghiêm trọng khi khởi động server:', error.message);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server đang chạy ở chế độ dự phòng tại cổng ${PORT}`);
    });
  }
};

startServer();
