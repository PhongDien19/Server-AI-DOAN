const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Taikhoan, NguoiDung } = require('../models');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

/**
 * Controller xử lý Đăng ký tài khoản mới
 */
const register = async (req, res) => {
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
    const existingUser = await Taikhoan.findOne({ where: { email } });
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
    const newUser = await Taikhoan.create({
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

/**
 * Controller xử lý Đăng nhập
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ email và mật khẩu'
      });
    }

    // Tìm tài khoản theo email
    const user = await Taikhoan.findOne({
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

/**
 * Controller lấy thông tin người dùng đang đăng nhập
 */
const getMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await Taikhoan.findByPk(userId, {
      include: [{ model: NguoiDung, as: 'Profile' }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin tài khoản'
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        tokenCount: user.tokenCount,
        tokenTest: user.tokenTest,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      },
      profile: user.Profile || null
    });
  } catch (error) {
    console.error('Lỗi getMe:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy thông tin tài khoản'
    });
  }
};

/**
 * Controller đổi mật khẩu cho người dùng đã đăng nhập
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mật khẩu cũ và mật khẩu mới'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có độ dài ít nhất 6 ký tự'
      });
    }

    const user = await Taikhoan.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Tài khoản không tồn tại'
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu cũ không chính xác'
      });
    }

    const saltRounds = 10;
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    console.error('Lỗi changePassword:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi đổi mật khẩu: ' + error.message
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  changePassword
};

