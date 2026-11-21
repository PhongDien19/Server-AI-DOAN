const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/danhSachDuongDan');

const app = express();

// Middleware là các bước chạy trước khi Express gọi hàm xử lý route.
// Bước này ghi lại thời gian và trạng thái của mỗi yêu cầu.
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
// Cho phép đọc dữ liệu JSON và dữ liệu từ form gửi lên.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(apiRoutes);

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
