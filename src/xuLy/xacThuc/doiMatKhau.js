const bcrypt = require('bcrypt');
const { TaiKhoan } = require('../../models/danhSachModel');

/** Doi mat khau tai khoan dang dang nhap. */
const doiMatKhau = async (req, res) => {
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

    const user = await TaiKhoan.findByPk(userId);
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

module.exports = doiMatKhau;
