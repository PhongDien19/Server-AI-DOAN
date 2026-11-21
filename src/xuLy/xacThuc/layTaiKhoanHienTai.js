const { TaiKhoan, NguoiDung } = require('../../models/danhSachModel');

/** Lay thong tin tai khoan dang dang nhap. */
const layTaiKhoanHienTai = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await TaiKhoan.findByPk(userId, {
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

module.exports = layTaiKhoanHienTai;
