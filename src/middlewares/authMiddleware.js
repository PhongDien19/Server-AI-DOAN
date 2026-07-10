const checkAuth = (req, res, next) => {
    // Middleware kiểm tra đăng nhập bằng cách check userId trong request body hoặc header
    const userId = req.body.userId || req.headers['x-user-id'] || req.query.userId;
    
    if (!userId) {
        return res.status(401).json({ 
            success: false, 
            message: 'Yêu cầu đăng nhập hoặc đăng ký để tiếp tục', 
            requiresLogin: true 
        });
    }
    
    req.userId = userId;
    next();
};

const JWT_SECRET = process.env.JWT_SECRET || 'huong_nghiep_jwt_secret_key_2024';

const verifyAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập Admin' });
        }

        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Từ chối truy cập: Không có quyền Admin' });
        }

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token đã hết hạn' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
        }
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { checkAuth, verifyAdmin, JWT_SECRET };
