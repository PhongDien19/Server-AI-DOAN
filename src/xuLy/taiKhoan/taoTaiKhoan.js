const bcrypt = require('bcrypt');
const { TaiKhoan, NguoiDung } = require('../../models/danhSachModel');

/** Tao tai khoan va ho so nguoi dung. */
const taoTaiKhoan = async (req, res) => {
  try {
    const {
      email,
      password,
      fullName,
      role,
      trangThai,
      isActive,
      tokenCount,
      token,
      tokenTest,
      age,
      educationLevel,
      location,
      interests
    } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email tài khoản'
      });
    }

    // Kiểm tra xem email đã tồn tại hay chưa
    const existing = await TaiKhoan.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã tồn tại trong hệ thống'
      });
    }

    const saltRounds = 10;
    const rawPassword = password || '123456';
    const passwordHash = await bcrypt.hash(rawPassword, saltRounds);

    const name = fullName && fullName.trim() ? fullName.trim() : email.split('@')[0];
    const accountRole = (role && role.toLowerCase() === 'admin') ? 'admin' : 'user';
    const activeStatus = trangThai !== undefined ? (trangThai === 1 || trangThai === '1') : (isActive !== undefined ? Boolean(isActive) : true);

    const newAcc = await TaiKhoan.create({
      email,
      passwordHash,
      fullName: name,
      role: accountRole,
      isActive: activeStatus,
      tokenCount: tokenCount !== undefined ? parseInt(tokenCount, 10) : (token !== undefined ? parseInt(token, 10) : 3),
      tokenTest: tokenTest !== undefined ? parseInt(tokenTest, 10) : 3,
      createdAt: new Date(),
      lastLoginAt: null
    });

    const newProfile = await NguoiDung.create({
      userId: newAcc.id,
      fullName: name,
      age: age ? parseInt(age, 10) : null,
      educationLevel: educationLevel || null,
      location: location || null,
      interests: interests || null
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công',
      account: {
        id: newAcc.id,
        email: newAcc.email,
        fullName: newAcc.fullName,
        role: newAcc.role,
        isActive: newAcc.isActive,
        tokenCount: newAcc.tokenCount,
        tokenTest: newAcc.tokenTest,
        createdAt: newAcc.createdAt,
        profile: newProfile
      }
    });
  } catch (error) {
    console.error('Lỗi createAccount:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tạo tài khoản: ' + error.message
    });
  }
};

module.exports = taoTaiKhoan;
