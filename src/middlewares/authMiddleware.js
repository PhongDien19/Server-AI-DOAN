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

module.exports = { checkAuth };
