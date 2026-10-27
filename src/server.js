require('dotenv').config();
const bcrypt = require('bcrypt');
const app = require('./app');
const { sequelize, Taikhoan, NguoiDung } = require('./models');

const PORT = process.env.PORT || 5000;

/**
 * Khởi tạo tài khoản quản trị viên và người dùng mặc định nếu chưa tồn tại
 */
const seedDefaultAccounts = async () => {
  try {
    const defaultEmail = 'phongdien1905@gmail.com';
    const existing = await Taikhoan.findOne({ where: { email: defaultEmail } });

    if (!existing) {
      const passwordHash = await bcrypt.hash('123456', 10);
      const defaultAdmin = await Taikhoan.create({
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
        userId: defaultAdmin.id,
        fullName: 'Phong Điền (Admin)',
        educationLevel: 'Đại học',
        interests: 'Quản trị hệ thống, Công nghệ'
      });

      console.log(`[Seed] Khởi tạo tài khoản Admin mặc định thành công: ${defaultEmail} / 123456`);
    }
  } catch (seedError) {
    console.error('[Seed] Lỗi khi tạo tài khoản mặc định:', seedError.message);
  }
};

/**
 * Khởi động ứng dụng
 */
const startServer = async () => {
  try {
    // 1. Kiểm tra kết nối CSDL MySQL
    await sequelize.authenticate();
    console.log('✓ Đã kết nối cơ sở dữ liệu MySQL thành công!');

    // 2. Đồng bộ các bảng tài khoản và người dùng
    await sequelize.sync();
    console.log('✓ Đã đồng bộ các bảng CSDL (taikhoan, nguoidung) thành công!');

    // 3. Khởi tạo tài khoản mẫu nếu cần
    await seedDefaultAccounts();

    // 4. Lắng nghe yêu cầu HTTP
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`===================================================`);
      console.log(` Server Quản lý Tài khoản (Mô hình MVC)`);
      console.log(` Cổng lắng nghe: http://localhost:${PORT}`);
      console.log(` Endpoint API:  http://localhost:${PORT}/api`);
      console.log(`===================================================`);
    });
  } catch (error) {
    console.error('✗ Không thể kết nối cơ sở dữ liệu MySQL:', error.message);
    console.log('Khởi chạy server ở chế độ dự phòng...');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server đang chạy tại cổng ${PORT} (chưa kết nối DB)`);
    });
  }
};

startServer();
