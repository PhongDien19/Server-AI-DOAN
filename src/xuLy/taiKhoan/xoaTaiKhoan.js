const { TaiKhoan, NguoiDung } = require('../../models/danhSachModel');

/** Xoa tai khoan cung ho so nguoi dung. */
const xoaTaiKhoan = async (req, res) => {
  try {
    const { id } = req.params;

    // Ngăn chặn admin tự xóa chính mình nếu cần
    if (req.user && req.user.id === parseInt(id, 10)) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể tự xóa tài khoản đang đăng nhập'
      });
    }

    const account = await TaiKhoan.findByPk(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Tài khoản không tồn tại'
      });
    }

    // Xóa hồ sơ người dùng liên quan
    await NguoiDung.destroy({ where: { userId: id } });

    // Xóa tài khoản
    await account.destroy();

    return res.status(200).json({
      success: true,
      message: 'Xóa tài khoản thành công'
    });
  } catch (error) {
    console.error('Lỗi deleteAccount:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi xóa tài khoản: ' + error.message
    });
  }
};

module.exports = xoaTaiKhoan;
