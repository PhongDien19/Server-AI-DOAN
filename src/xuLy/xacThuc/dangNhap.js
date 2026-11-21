const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { TaiKhoan, NguoiDung } = require('../../models/danhSachModel');
const { JWT_SECRET } = require('../../middlewares/xacThuc');

/** Xac thuc tai khoan va tao token dang nhap. */
const dangNhap = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ email và mật khẩu'
      });
    }

    // Tìm tài khoản theo email
    const user = await TaiKhoan.findOne({
      where: { email },
      include: [{ model: NguoiDung, as: 'Profile' }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại'
      });
    }

    if (!user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản chưa thiết lập mật khẩu, vui lòng liên hệ quản trị viên'
      });
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu không chính xác'
      });
    }

    // Kiểm tra trạng thái hoạt động của tài khoản
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản hiện đang bị khóa hoặc ngưng hoạt động'
      });
    }

    // Reset token hàng ngày nếu qua ngày mới
    const today = new Date().toDateString();
    const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt).toDateString() : null;

    user.lastLoginAt = new Date();
    if (lastLogin !== today) {
      if (user.tokenCount < 3) user.tokenCount = 3;
      if (user.tokenTest < 3) user.tokenTest = 3;
    }
    await user.save();

    // Sinh JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const profileData = user.Profile ? {
      fullName: user.Profile.fullName,
      educationLevel: user.Profile.educationLevel,
      interests: user.Profile.interests,
      age: user.Profile.age,
      location: user.Profile.location,
      hobby: user.Profile.interests
    } : null;

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        tokenCount: user.tokenCount,
        tokenTest: user.tokenTest
      },
      profile: profileData
    });
  } catch (error) {
    console.error('Lỗi login:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi đăng nhập: ' + error.message
    });
  }
};

module.exports = dangNhap;
