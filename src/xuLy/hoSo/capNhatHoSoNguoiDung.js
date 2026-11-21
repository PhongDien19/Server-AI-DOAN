const { NguoiDung, TaiKhoan } = require('../../models/danhSachModel');

/** Cap nhat ho so ca nhan. */
const capNhatHoSoNguoiDung = async (req, res) => {
  try {
    const userId = req.params.userId || (req.user ? req.user.id : null);
    const data = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin mã người dùng (userId)'
      });
    }

    let profile = await NguoiDung.findOne({ where: { userId } });
    if (!profile) {
      profile = await NguoiDung.create({
        userId,
        fullName: data.fullName || 'Người dùng mới'
      });
    }

    const allowedFields = ['fullName', 'age', 'educationLevel', 'location', 'interests'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        profile[field] = data[field];
      }
    }

    if (data.hobby !== undefined) {
      profile.interests = data.hobby;
    }

    await profile.save();

    // Đồng bộ họ tên sang tài khoản nếu có
    if (data.fullName) {
      await TaiKhoan.update({ fullName: data.fullName }, { where: { id: userId } });
    }

    const updatedProfile = profile.toJSON();
    updatedProfile.hobby = updatedProfile.interests;

    return res.status(200).json({
      success: true,
      message: 'Cập nhật hồ sơ thành công',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Lỗi updateProfile:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi cập nhật hồ sơ: ' + error.message
    });
  }
};

module.exports = capNhatHoSoNguoiDung;
