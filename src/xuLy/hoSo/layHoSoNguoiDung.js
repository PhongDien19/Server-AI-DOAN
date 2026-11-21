const { NguoiDung, TaiKhoan } = require('../../models/danhSachModel');

/** Lay ho so ca nhan cua nguoi dung. */
const layHoSoNguoiDung = async (req, res) => {
  try {
    const userId = req.params.userId || (req.user ? req.user.id : null);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin mã người dùng (userId)'
      });
    }

    const profile = await NguoiDung.findOne({ where: { userId } });
    const account = await TaiKhoan.findByPk(userId);

    if (!profile && !account) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ người dùng'
      });
    }

    const profileData = profile ? profile.toJSON() : {
      userId,
      fullName: account ? account.fullName : '',
      age: null,
      educationLevel: null,
      location: null,
      interests: null
    };

    profileData.hobby = profileData.interests;
    if (account) {
      profileData.email = account.email;
      profileData.role = account.role;
      profileData.isActive = account.isActive;
      profileData.tokenCount = account.tokenCount;
      profileData.tokenTest = account.tokenTest;
    }

    return res.status(200).json({
      success: true,
      profile: profileData
    });
  } catch (error) {
    console.error('Lỗi getProfile:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy thông tin hồ sơ: ' + error.message
    });
  }
};

module.exports = layHoSoNguoiDung;
