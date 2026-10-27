const { NguoiDung, Taikhoan } = require('../models');

/**
 * Lấy thông tin hồ sơ người dùng
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.params.userId || (req.user ? req.user.id : null);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin mã người dùng (userId)'
      });
    }

    const profile = await NguoiDung.findOne({ where: { userId } });
    const account = await Taikhoan.findByPk(userId);

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

/**
 * Cập nhật thông tin hồ sơ cá nhân
 */
const updateProfile = async (req, res) => {
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
      await Taikhoan.update({ fullName: data.fullName }, { where: { id: userId } });
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

module.exports = {
  getProfile,
  updateProfile
};

