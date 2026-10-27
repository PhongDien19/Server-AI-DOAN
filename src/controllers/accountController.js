const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const { Taikhoan, NguoiDung, sequelize } = require('../models');

/**
 * Lấy danh sách tất cả tài khoản (Hỗ trợ tìm kiếm, phân trang và bộ lọc)
 */
const getAccounts = async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 50 } = req.query;

    const where = {};

    // Lọc theo vai trò (admin / user)
    if (role) {
      where.role = role.toLowerCase() === 'admin' ? 'admin' : 'user';
    }

    // Lọc theo trạng thái hoạt động (1 / 0)
    if (status !== undefined && status !== '') {
      where.isActive = status === '1' || status === 'true';
    }

    // Tìm kiếm theo email hoặc họ tên
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      where[Op.or] = [
        { email: { [Op.like]: searchTerm } },
        { fullName: { [Op.like]: searchTerm } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const offset = (pageNum - 1) * limitNum;

    const { count, rows: accounts } = await Taikhoan.findAndCountAll({
      where,
      include: [{ model: NguoiDung, as: 'Profile' }],
      order: [['id', 'DESC']],
      limit: limitNum,
      offset
    });

    const mapped = accounts.map(acc => {
      const emailPrefix = acc.email ? acc.email.split('@')[0] : '';
      return {
        id: acc.id.toString(),
        tenDangNhap: emailPrefix || acc.email,
        hoTen: acc.Profile?.fullName || acc.fullName || 'Chưa cập nhật',
        email: acc.email,
        soDienThoai: 'Chưa cập nhật',
        vaiTro: acc.role === 'admin' ? 'Admin' : 'User',
        trangThai: acc.isActive ? 1 : 0,
        ngayTao: acc.createdAt ? acc.createdAt.toISOString().slice(0, 16).replace('T', ' ') : 'Chưa rõ',
        token: acc.tokenCount || 0,
        tokenTest: acc.tokenTest || 0,
        lastLoginAt: acc.lastLoginAt,
        profile: acc.Profile || null
      };
    });

    return res.status(200).json({
      success: true,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum),
      accounts: mapped
    });
  } catch (error) {
    console.error('Lỗi getAccounts:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách tài khoản: ' + error.message
    });
  }
};

/**
 * Lấy thông tin chi tiết một tài khoản theo ID
 */
const getAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await Taikhoan.findByPk(id, {
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

/**
 * Tạo tài khoản mới (Dành cho Quản trị viên)
 */
const createAccount = async (req, res) => {
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
    const existing = await Taikhoan.findOne({ where: { email } });
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

    const newAcc = await Taikhoan.create({
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

/**
 * Cập nhật thông tin tài khoản (Dành cho Quản trị viên)
 */
const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const account = await Taikhoan.findByPk(id, {
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
      const emailTaken = await Taikhoan.findOne({
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

/**
 * Xóa tài khoản (Dành cho Quản trị viên)
 */
const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    // Ngăn chặn admin tự xóa chính mình nếu cần
    if (req.user && req.user.id === parseInt(id, 10)) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể tự xóa tài khoản đang đăng nhập'
      });
    }

    const account = await Taikhoan.findByPk(id);
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

/**
 * Khóa hoặc Mở khóa tài khoản nhanh
 */
const toggleAccountStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user && req.user.id === parseInt(id, 10)) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể tự khóa tài khoản của chính mình'
      });
    }

    const account = await Taikhoan.findByPk(id);
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

/**
 * Thống kê tổng hợp số liệu tài khoản
 */
const getAccountStats = async (req, res) => {
  try {
    const totalUsers = await Taikhoan.count();
    const activeUsers = await Taikhoan.count({ where: { isActive: true } });
    const lockedUsers = await Taikhoan.count({ where: { isActive: false } });
    const adminCount = await Taikhoan.count({ where: { role: 'admin' } });
    const userCount = await Taikhoan.count({ where: { role: 'user' } });

    // Lấy 5 tài khoản mới tạo gần đây nhất
    const recentAccounts = await Taikhoan.findAll({
      order: [['id', 'DESC']],
      limit: 5,
      include: [{ model: NguoiDung, as: 'Profile' }]
    });

    return res.status(200).json({
      success: true,
      stats: [
        { title: 'Tổng người dùng', value: totalUsers.toString(), isPositive: true },
        { title: 'Tài khoản hoạt động', value: activeUsers.toString(), isPositive: true },
        { title: 'Tài khoản bị khóa', value: lockedUsers.toString(), isPositive: false },
        { title: 'Quản trị viên', value: adminCount.toString(), isPositive: true },
        { title: 'Người dùng thông thường', value: userCount.toString(), isPositive: true }
      ],
      summary: {
        totalUsers,
        activeUsers,
        lockedUsers,
        adminCount,
        userCount
      },
      recentActivities: recentAccounts.map(acc => ({
        id: `user_${acc.id}`,
        user: acc.Profile?.fullName || acc.fullName || acc.email,
        action: `đã đăng ký tài khoản (${acc.role === 'admin' ? 'Quản trị viên' : 'Thành viên'})`,
        time: acc.createdAt ? acc.createdAt.toISOString().slice(0, 10) : 'Vừa xong'
      }))
    });
  } catch (error) {
    console.error('Lỗi getAccountStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy số liệu thống kê tài khoản: ' + error.message
    });
  }
};

module.exports = {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  toggleAccountStatus,
  getAccountStats
};

