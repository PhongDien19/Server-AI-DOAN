const jwt = require('jsonwebtoken');
const { Taikhoan } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'huong_nghiep_jwt_secret_key_2024';

/**
 * Middleware kiểm tra xác thực người dùng (hỗ trợ JWT Bearer token và header x-user-id dự phòng)
 */
const checkAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await Taikhoan.findByPk(decoded.userId);

        if (!user) {
          return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại hoặc đã bị xóa' });
        }

        if (user.isActive === false) {
          return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' });
        }

        req.user = user;
        req.userId = user.id;
        return next();
      } catch (jwtErr) {
        if (jwtErr.name === 'TokenExpiredError') {
          return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' });
        }
        return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
      }
    }

    // Dự phòng fallback theo x-user-id
    const fallbackUserId = req.headers['x-user-id'] || req.body.userId || req.query.userId;
    if (fallbackUserId) {
      const user = await Taikhoan.findByPk(fallbackUserId);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });
      }
      if (user.isActive === false) {
        return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
      }

      req.user = user;
      req.userId = user.id;
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Yêu cầu đăng nhập để thực hiện chức năng này',
      requiresLogin: true
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi xác thực người dùng: ' + error.message });
  }
};

/**
 * Middleware kiểm tra quyền Quản trị viên (Admin)
 */
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Yêu cầu token xác thực quyền Admin' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token đã hết hạn, vui lòng đăng nhập lại' });
      }
      return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    }

    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Từ chối truy cập: Bạn không có quyền Admin' });
    }

    const user = await Taikhoan.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Tài khoản Admin không tồn tại' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: 'Tài khoản Admin này đã bị vô hiệu hóa' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi kiểm tra quyền Admin: ' + error.message });
  }
};

module.exports = {
  checkAuth,
  verifyAdmin,
  JWT_SECRET
};
