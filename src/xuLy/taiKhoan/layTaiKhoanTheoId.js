const { TaiKhoan, NguoiDung } = require('../../models/danhSachModel');

/** Lay chi tiet mot tai khoan. */
const layTaiKhoanTheoId = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await TaiKhoan.findByPk(id, {
      include: [{ model: NguoiDung, as: 'Profile' }]
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản'
      });
    }

    return res.status(200).json({
      success: true,
      account: {
        id: account.id,
        email: account.email,
        fullName: account.fullName,
        role: account.role,
        isActive: account.isActive,
        tokenCount: account.tokenCount,
        tokenTest: account.tokenTest,
        createdAt: account.createdAt,
        lastLoginAt: account.lastLoginAt,
        profile: account.Profile || null
      }
    });
  } catch (error) {
    console.error('Lỗi getAccountById:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy thông tin chi tiết tài khoản: ' + error.message
    });
  }
};

module.exports = layTaiKhoanTheoId;
