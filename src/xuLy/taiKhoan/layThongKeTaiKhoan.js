const { TaiKhoan, NguoiDung } = require('../../models/danhSachModel');

/** Tinh thong ke tai khoan va hoat dong gan day. */
const layThongKeTaiKhoan = async (req, res) => {
  try {
    const totalUsers = await TaiKhoan.count();
    const activeUsers = await TaiKhoan.count({ where: { isActive: true } });
    const lockedUsers = await TaiKhoan.count({ where: { isActive: false } });
    const adminCount = await TaiKhoan.count({ where: { role: 'admin' } });
    const userCount = await TaiKhoan.count({ where: { role: 'user' } });

    // Lấy 5 tài khoản mới tạo gần đây nhất
    const recentAccounts = await TaiKhoan.findAll({
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

module.exports = layThongKeTaiKhoan;
