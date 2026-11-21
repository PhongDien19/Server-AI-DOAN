const { TaiKhoan } = require('../../models/danhSachModel');

/** Khoa hoac mo khoa tai khoan. */
const doiTrangThaiTaiKhoan = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user && req.user.id === parseInt(id, 10)) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể tự khóa tài khoản của chính mình'
      });
    }

    const account = await TaiKhoan.findByPk(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Tài khoản không tồn tại'
      });
    }

    account.isActive = !account.isActive;
    await account.save();

    return res.status(200).json({
      success: true,
      message: account.isActive ? 'Đã mở khóa tài khoản thành công' : 'Đã khóa tài khoản thành công',
      isActive: account.isActive
    });
  } catch (error) {
    console.error('Lỗi toggleAccountStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi thay đổi trạng thái tài khoản: ' + error.message
    });
  }
};

module.exports = doiTrangThaiTaiKhoan;
