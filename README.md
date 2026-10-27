# Server Quản Lý Tài Khoản (Kiến Trúc MVC)

Hệ thống Backend API quản lý tài khoản và người dùng xây dựng trên nền tảng **Node.js**, **Express**, **Sequelize** và **MySQL** theo chuẩn kiến trúc **MVC (Model - View - Controller)**.

---

## 1. Cấu trúc thư mục (Mô hình MVC)

```
Server-AI-DOAN/
│
├── src/
│   ├── config/                     # Cấu hình hệ thống & cơ sở dữ liệu
│   │   └── database.js             # Kết nối Sequelize với MySQL
│   │
│   ├── models/                     # [MODEL] Định nghĩa các thực thể dữ liệu
│   │   ├── index.js                # Khởi tạo và thiết lập quan hệ 1-1
│   │   ├── Taikhoan.js             # Model Tài khoản (bảng taikhoan)
│   │   └── NguoiDung.js            # Model Hồ sơ người dùng (bảng nguoidung)
│   │
│   ├── controllers/                # [CONTROLLER] Xử lý nghiệp vụ & điều hướng
│   │   ├── authController.js       # Xác thực: Đăng ký, đăng nhập, đổi mật khẩu, lấy thông tin cá nhân
│   │   ├── accountController.js    # Quản lý tài khoản (CRUD, phân trang, lọc, thống kê)
│   │   └── profileController.js    # Quản lý hồ sơ người dùng (Xem, cập nhật)
│   │
│   ├── routes/                     # [ROUTER / VIEW ENDPOINTS] Định tuyến API
│   │   ├── index.js                # Router tổng hợp
│   │   ├── authRoutes.js           # Routes /api/auth
│   │   ├── accountRoutes.js        # Routes /api/accounts
│   │   ├── profileRoutes.js        # Routes /api/profile
│   │   └── adminRoutes.js          # Routes /api/admin (Tương thích Frontend cũ)
│   │
│   ├── middlewares/                # Các tầng trung gian (Bảo mật, phân quyền)
│   │   └── authMiddleware.js       # Xác thực JWT Bearer Token & phân quyền Admin
│   │
│   ├── app.js                      # Cấu hình Express App, CORS, Parser & Middleware
│   └── server.js                   # Điểm khởi động Server, đồng bộ DB & seed admin
│
├── .gitignore                      # Danh sách file bỏ qua khi commit Git
├── package.json                    # Khai báo thư viện & scripts
└── README.md                       # Tài liệu hướng dẫn sử dụng
```

---

## 2. Danh sách API Endpoints

### 2.1. Xác thực người dùng (`/api/auth`)

| Phương thức | Endpoint | Yêu cầu quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` hoặc `/api/register` | Public | Đăng ký tài khoản mới (`email`, `password`, `fullName`) |
| `POST` | `/api/auth/login` hoặc `/api/login` | Public | Đăng nhập hệ thống, nhận JWT Token |
| `GET` | `/api/auth/me` | Bearer Token | Lấy thông tin tài khoản đang đăng nhập |
| `POST` / `PUT` | `/api/auth/change-password` | Bearer Token | Đổi mật khẩu (`oldPassword`, `newPassword`) |

### 2.2. Quản lý Tài khoản (`/api/accounts` và `/api/admin`)

| Phương thức | Endpoint | Yêu cầu quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/accounts` hoặc `/api/admin/accounts` | Admin (Token) | Lấy danh sách tài khoản (Hỗ trợ `search`, `role`, `status`, `page`, `limit`) |
| `GET` | `/api/accounts/:id` | Admin (Token) | Xem thông tin chi tiết tài khoản theo ID |
| `POST` | `/api/accounts` hoặc `/api/admin/accounts` | Admin (Token) | Tạo tài khoản mới kèm hồ sơ |
| `PUT` | `/api/accounts/:id` hoặc `/api/admin/accounts/:id` | Admin (Token) | Cập nhật thông tin tài khoản & hồ sơ |
| `DELETE` | `/api/accounts/:id` hoặc `/api/admin/accounts/:id` | Admin (Token) | Xóa tài khoản |
| `PATCH` | `/api/accounts/:id/status` hoặc `/api/admin/accounts/:id/status` | Admin (Token) | Khóa / Mở khóa trạng thái tài khoản |
| `GET` | `/api/accounts/stats` hoặc `/api/admin/dashboard/stats` | Admin (Token) | Thống kê số lượng người dùng, trạng thái tài khoản |

### 2.3. Quản lý Hồ sơ cá nhân (`/api/profile`)

| Phương thức | Endpoint | Yêu cầu quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/profile/:userId` | Public / Token | Xem hồ sơ chi tiết người dùng (`fullName`, `age`, `educationLevel`, `location`, `interests`) |
| `PUT` | `/api/profile/:userId` | Token | Cập nhật hồ sơ cá nhân |

---

## 3. Cài đặt và Khởi chạy

### 3.1. Cài đặt thư viện phụ thuộc
```bash
npm install
```

### 3.2. Cấu hình biến môi trường (`.env`)
Tạo file `.env` ở thư mục gốc (nếu chưa có):
```env
PORT=5000
DB_HOST=127.0.0.1
DB_USER=root
DB_PASS=
DB_NAME=huong_nghiep_db
JWT_SECRET=huong_nghiep_jwt_secret_key_2024
```

### 3.3. Khởi chạy Server
- Chạy môi trường phát triển (Hot reload):
  ```bash
  npm run dev
  ```
- Chạy môi trường chính thức:
  ```bash
  npm start
  ```

---

## 4. Tài khoản mặc định khởi tạo sẵn
Khi khởi động lần đầu, hệ thống sẽ tự động tạo tài khoản quản trị viên nếu chưa tồn tại:
- **Email**: `phongdien1905@gmail.com`
- **Mật khẩu**: `123456`
- **Vai trò**: `admin`

