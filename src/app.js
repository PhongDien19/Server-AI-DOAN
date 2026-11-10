const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');

const app = express();

// Middlewares
app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const log = res.statusCode >= 400 ? console.warn : console.log;
    log(
      `[HTTP] ${req.method} ${req.path} ${res.statusCode} ${durationMs}ms`
    );
  });

  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route kiểm tra trạng thái hoạt động của server
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Server Quản lý Tài khoản (MVC) đang hoạt động ổn định!'
  });
});

// Gắn toàn bộ API routes với prefix /api
app.use('/api', apiRoutes);

// Xử lý 404 Not Found
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy đường dẫn: ${req.method} ${req.originalUrl}`
  });
});

// Xử lý lỗi toàn cục (Global Error Handler)
app.use((err, req, res, next) => {
  console.error('Lỗi chưa xử lý:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ'
  });
});

module.exports = app;
