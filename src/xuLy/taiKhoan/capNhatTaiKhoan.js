const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const { TaiKhoan, NguoiDung } = require('../../models/danhSachModel');

/** Cap nhat tai khoan va ho so lien quan. */
const capNhatTaiKhoan = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const account = await TaiKhoan.findByPk(id, {
      include: [{ model: NguoiDung, as: 'Profile' }]
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Tài khoản không tồn tại'
      });
    }

    // Nếu thay đổi email, kiểm tra trùng lặp
    if (data.email && data.email !== account.email) {
      const emailTaken = await TaiKhoan.findOne({
        where: {
          email: data.email,
          id: { [Op.ne]: id }
        }
      });
      if (emailTaken) {
        return res.status(400).json({
          success: false,
          message: 'Email này đã được sử dụng bởi một tài khoản khác'
        });
      }
      account.email = data.email;
    }

    // Cập nhật vai trò
    if (data.role !== undefined || data.vaiTro !== undefined) {
      const roleVal = data.role || data.vaiTro;
      account.role = roleVal.toLowerCase() === 'admin' ? 'admin' : 'user';
    }

    // Cập nhật trạng thái kích hoạt
    if (data.trangThai !== undefined) {
      account.isActive = data.trangThai === 1 || data.trangThai === '1' || data.trangThai === true;
    } else if (data.isActive !== undefined) {
      account.isActive = Boolean(data.isActive);
    }

    // Cập nhật token
    if (data.token !== undefined) {
      account.tokenCount = parseInt(data.token, 10);
    } else if (data.tokenCount !== undefined) {
      account.tokenCount = parseInt(data.tokenCount, 10);
    }

    if (data.tokenTest !== undefined) {
      account.tokenTest = parseInt(data.tokenTest, 10);
    }

    // Cập nhật họ tên
    if (data.fullName !== undefined || data.hoTen !== undefined) {
      account.fullName = data.fullName || data.hoTen;
    }

    // Cập nhật mật khẩu nếu có truyền vào
    if (data.password && data.password.trim()) {
      account.passwordHash = await bcrypt.hash(data.password.trim(), 10);
    }

    await account.save();

    // Cập nhật hồ sơ NguoiDung tương ứng
    let profile = account.Profile;
    if (!profile) {
      profile = await NguoiDung.create({
        userId: account.id,
        fullName: account.fullName || account.email
      });
    }

    const profileFields = ['fullName', 'hoTen', 'age', 'educationLevel', 'location', 'interests'];
    let profileUpdated = false;

    if (data.fullName || data.hoTen) {
      profile.fullName = data.fullName || data.hoTen;
      profileUpdated = true;
    }
    if (data.age !== undefined) {
      profile.age = data.age ? parseInt(data.age, 10) : null;
      profileUpdated = true;
    }
    if (data.educationLevel !== undefined) {
      profile.educationLevel = data.educationLevel;
      profileUpdated = true;
    }
    if (data.location !== undefined) {
      profile.location = data.location;
      profileUpdated = true;
    }
    if (data.interests !== undefined) {
      profile.interests = data.interests;
      profileUpdated = true;
    }

    if (profileUpdated) {
      await profile.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Cập nhật tài khoản thành công',
      account: {
        id: account.id,
        email: account.email,
        fullName: account.fullName,
        role: account.role,
        isActive: account.isActive,
        tokenCount: account.tokenCount,
        tokenTest: account.tokenTest,
        profile
      }
    });
  } catch (error) {
    console.error('Lỗi updateAccount:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi cập nhật tài khoản: ' + error.message
    });
  }
};

module.exports = capNhatTaiKhoan;
