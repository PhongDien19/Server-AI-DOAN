const { Op } = require('sequelize');
const { TaiKhoan, NguoiDung } = require('../../models/danhSachModel');

/** Lay danh sach tai khoan co bo loc va phan trang. */
const layDanhSachTaiKhoan = async (req, res) => {
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

    const { count, rows: accounts } = await TaiKhoan.findAndCountAll({
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

module.exports = layDanhSachTaiKhoan;
