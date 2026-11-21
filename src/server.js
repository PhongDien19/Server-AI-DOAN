require('dotenv').config();
const app = require('./ungDung');
const { sequelize } = require('./models/danhSachModel');
const SeedService = require('./services/dichVuNapDuLieu');
const AIService = require('./services/dichVuAI');

const PORT = process.env.PORT || 5000;

// Khởi động lần lượt: kết nối database, tạo dữ liệu mẫu, rồi mở server.
const startServer = async () => {
  let databaseReady = false;

  console.log('--- Đang khởi động hệ thống Trắc nghiệm Hướng nghiệp AI ---');

  try {
    // Kiểm tra database có kết nối được không trước khi dùng.
    await sequelize.authenticate();
    const dialectName = sequelize.getDialect().toUpperCase();
    console.log(`✓ Đã kết nối cơ sở dữ liệu thành công (${dialectName})!`);

    // Tạo các bảng còn thiếu theo những model trong src/models.
    await sequelize.sync();
    console.log('✓ Đã đồng bộ hóa toàn bộ các bảng dữ liệu thành công!');

    await SeedService.runAll();
    databaseReady = true;
  } catch (error) {
    console.error('✗ Kết nối hoặc khởi tạo cơ sở dữ liệu thất bại:', error.message);
  }

  // AI không bắt buộc; server vẫn chạy nếu chưa cấu hình AI.
  const aiStatus = await AIService.checkConnection();
  if (!aiStatus.configured) {
    console.warn(`⚠ AI chưa được cấu hình${aiStatus.error ? `: ${aiStatus.error}` : ''}; hệ thống sẽ dùng dữ liệu dự phòng.`);
  } else if (aiStatus.connected) {
    console.log(`✓ Kết nối AI ${aiStatus.provider}${aiStatus.model ? ` (model: ${aiStatus.model})` : ''} thành công!`);
  } else {
    console.warn(`⚠ Không kết nối được AI ${aiStatus.provider}${aiStatus.model ? ` (model: ${aiStatus.model})` : ''}: ${aiStatus.error}. Hệ thống sẽ dùng dữ liệu dự phòng.`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================================================`);
    console.log(` HỆ THỐNG TRẮC NGHIỆM HƯỚNG NGHIỆP THPT & SINH VIÊN NĂM 1`);
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
