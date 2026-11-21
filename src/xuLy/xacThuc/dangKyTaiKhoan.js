const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { TaiKhoan, NguoiDung } = require('../../models/danhSachModel');
const { JWT_SECRET } = require('../../middlewares/xacThuc');

/** Dang ky tai khoan va tao ho so nguoi dung. */
const dangKyTaiKhoan = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ email và mật khẩu'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Định dạng email không hợp lệ'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải chứa ít nhất 6 ký tự'
      });
    }

    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await TaiKhoan.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã được đăng ký trong hệ thống'
      });
    }

    // Mã hóa mật khẩu
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const name = fullName && fullName.trim() ? fullName.trim() : email.split('@')[0];

    // Tạo tài khoản mới
    const newUser = await TaiKhoan.create({
      email,
      passwordHash,
      fullName: name,
      role: 'user',
      isActive: true,
      tokenCount: 3,
      tokenTest: 3,
      lastLoginAt: new Date()
    });

    // Tạo hồ sơ người dùng tương ứng
    const newProfile = await NguoiDung.create({
      userId: newUser.id,
      fullName: name
    });

    // Tạo JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        isActive: newUser.isActive,
        tokenCount: newUser.tokenCount,
        tokenTest: newUser.tokenTest
      },
      profile: {
        fullName: newProfile.fullName,
        age: newProfile.age,
        educationLevel: newProfile.educationLevel,
        location: newProfile.location,
        interests: newProfile.interests
      }
    });
  } catch (error) {
    console.error('Lỗi register:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi đăng ký tài khoản: ' + error.message
    });
  }
};

module.exports = dangKyTaiKhoan;
