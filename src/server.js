require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const SeedService = require('./services/seedService');
const AIService = require('./services/aiService');

const PORT = process.env.PORT || 5000;

/**
 * Khởi động ứng dụng Backend Trắc nghiệm Hướng nghiệp (Kiến trúc MVC)
 */
const startServer = async () => {
  let databaseReady = false;

  console.log('--- Đang khởi động hệ thống Trắc nghiệm Hướng nghiệp AI ---');

  try {
    await sequelize.authenticate();
    const dialectName = sequelize.getDialect().toUpperCase();
    console.log(`✓ Đã kết nối cơ sở dữ liệu thành công (${dialectName})!`);

    await sequelize.sync();
    console.log('✓ Đã đồng bộ hóa toàn bộ các bảng dữ liệu thành công!');

    await SeedService.runAll();
    databaseReady = true;
  } catch (error) {
    console.error('✗ Kết nối hoặc khởi tạo cơ sở dữ liệu thất bại:', error.message);
  }

  const aiStatus = await AIService.checkConnection();
  if (!aiStatus.configured) {
    console.warn('⚠ Chưa cấu hình API key AI; hệ thống sẽ dùng dữ liệu dự phòng.');
  } else if (aiStatus.connected) {
    console.log('✓ Kết nối dịch vụ AI thành công!');
  } else {
    console.error(`✗ Kết nối dịch vụ AI thất bại: ${aiStatus.error}. Hệ thống sẽ dùng dữ liệu dự phòng.`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================================================`);
    console.log(` HỆ THỐNG TRẮC NGHIỆM HƯỚNG NGHIỆP THPT & SINH VIÊN NĂM 1 (MVC)`);
    console.log(` Cổng máy chủ:  http://localhost:${PORT}`);
    console.log(` API Endpoint: http://localhost:${PORT}/api`);
    console.log(` - Đánh giá:   /api/assessment (Luồng chính & Luồng B)`);
    console.log(` - Câu hỏi:    /api/questions (Personality, Holland, Language...)`);
    console.log(` - Ngành nghề: /api/majors (đọc danh mục từ cơ sở dữ liệu)`);
    console.log(` - Trường học: /api/schools (đọc danh mục từ cơ sở dữ liệu)`);
    console.log(` - Xác thực:   /api/auth (Đăng ký, Đăng nhập, Token JWT)`);
    if (!databaseReady) {
      console.log('Server đang chạy ở chế độ dự phòng do database chưa sẵn sàng.');
    }
    console.log(`=================================================================`);
  });
};

startServer();
