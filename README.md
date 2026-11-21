# Hệ Thống Server Trắc Nghiệm Hướng Nghiệp AI

> **Backend API Hướng Nghiệp Toàn Diện** dành cho **Học sinh THPT** và **Sinh viên năm nhất**, xây dựng trên nền tảng **Node.js (Express)**, **Sequelize ORM** (hỗ trợ **MySQL & SQLite**). Endpoint được khai báo tập trung trong `src/routes/danhSachDuongDan.js`; xử lý được chia theo nghiệp vụ trong `src/xuLy/`.
> Hệ thống được hiện thực hóa dựa trên tài liệu đặc tả nghiệp vụ và đề xuất cải tiến kỹ thuật hướng nghiệp.

---

## 📌 Mục lục
1. [Giới thiệu & 4 Trụ cột Cốt lõi](#1-giới-thiệu--4-trụ-cột-cốt-lõi)
2. [Cấu trúc Thư mục Dự án](#2-cấu-trúc-thư-mục-dự-án)
3. [Quy trình Nghiệp vụ & 2 Luồng Đánh giá](#3-quy-trình-nghiệp-vụ--2-luồng-đánh-giá)
4. [Thuật toán Chấm điểm & Quy tắc Trọng số](#4-thuật-toán-chấm-điểm--quy-tắc-trọng-số)
5. [Dữ liệu Nền tảng (Seed Data)](#5-dữ-liệu-nền-tảng-seed-data)
6. [Tài liệu API Endpoints Chi tiết](#6-tài-liệu-api-endpoints-chi-tiết)
7. [Hướng dẫn Cài đặt & Khởi chạy](#7-hướng-dẫn-cài-đặt--khởi-chạy)
8. [Kiểm thử Hệ thống](#8-kiểm-thử-hệ-thống)

---

## 1. Giới thiệu & 4 Trụ cột Cốt lõi

Hệ thống được thiết kế theo 4 trụ cột kỹ thuật nhằm đảm bảo tính **khoa học, tất định (deterministic), minh bạch và có thể kiểm chứng**:

1. **Nghiệp vụ đánh giá thích ứng:**
   - Hỗ trợ 2 luồng: **Luồng chính (Khám phá)** và **Luồng B (Kiểm chứng ngành mục tiêu)**.
   - Gồm 4 bài test: Tính cách 4 chiều (24 câu *forced-choice*), Holland RIASEC (18 câu *likert 1-5*), Ngoại ngữ (8 câu), Cơ hội việc làm (5 câu - chỉ SV năm 1).
   - Cơ chế **Trust Check** tự động đề xuất hướng giải quyết khi người dùng chưa tin kết quả.
2. **Thuật toán tất định & Phiên bản hóa:**
   - Backend cung cấp ngân hàng câu hỏi chuẩn và chấm điểm theo thuật toán có phiên bản (`PhienBanChamDiem v1.0.0`). DeepSeek chỉ cá nhân hóa cách diễn đạt câu hỏi, không thay đổi ID, lựa chọn hay quy tắc chấm; nếu AI không khả dụng hoặc trả dữ liệu không hợp lệ, server dùng câu hỏi gốc.
   - Chuẩn hóa toàn bộ thành phần về thang 0 – 100 và tự động tái phân bổ trọng số khi thiếu dữ liệu (ví dụ: học sinh THPT không có phần việc làm).
3. **Dữ liệu chuẩn hóa:**
   - 10 ngành đào tạo trọng điểm kèm **Hồ sơ năng lực ngành (`MajorProfiles`)** chi tiết.
   - 30 trường đại học đại diện 3 miền Bắc – Trung – Nam.
   - Bảng điểm chuẩn riêng biệt (`AdmissionScores`) theo năm và phương thức xét tuyển; dữ liệu mẫu được lưu trong `database.sql`.
4. **Bảo mật & Quản lý người dùng:**
   - Xác thực JWT Token (Bearer), mã hóa mật khẩu Bcrypt.
   - Phân quyền Admin / User, quản lý lịch sử và hồ sơ cá nhân.

---

## 2. Cấu trúc Thư mục Dự án

```
Server-AI-DOAN/
│
├── src/
│   ├── config/                     # Cấu hình hệ thống & cơ sở dữ liệu
│   │   └── database.js             # Kết nối Sequelize (MySQL & SQLite fallback)
│   │
│   ├── data/                       # Dữ liệu hạt giống
│   │   └── duLieuMau.js            # Ngân hàng câu hỏi
│   │
│   ├── models/                     # [MODEL - Sequelize CSDL quan hệ]
│   │   ├── danhSachModel.js        # Khai báo model và thiết lập quan hệ
│   │   ├── TaiKhoanNguoiDung.js    # Tài khoản người dùng (bảng taikhoan)
│   │   ├── NguoiDung.js            # Hồ sơ cá nhân (bảng nguoidung)
│   │   ├── PhienDanhGia.js         # Phiên làm bài đánh giá
│   │   ├── PhanDanhGia.js          # Điểm từng phần đánh giá
│   │   ├── CauTraLoiDanhGia.js     # Câu trả lời của người dùng
│   │   ├── KetQuaDanhGia.js        # Kết quả tổng hợp
│   │   ├── KiemTraDoTinCay.js      # Phản hồi độ tin cậy
│   │   ├── CauHoi.js               # Ngân hàng câu hỏi
│   │   ├── Nganh.js                # Danh mục ngành đào tạo
│   │   ├── HoSoNganh.js            # Hồ sơ năng lực ngành
│   │   ├── TruongDaiHoc.js         # Danh mục trường đại học
│   │   ├── DiemChuan.js            # Điểm chuẩn tuyển sinh
│   │   └── PhienBanChamDiem.js     # Phiên bản thuật toán chấm điểm
│   │
│   ├── services/                   # Dịch vụ dùng chung
│   │   ├── dichVuChamDiem.js       # Thuật toán chấm điểm
│   │   ├── dichVuDanhGia.js        # Quy trình đánh giá
│   │   ├── dichVuAI.js             # Tích hợp AI
│   │   └── dichVuNapDuLieu.js      # Nạp dữ liệu khởi tạo
│   │
│   ├── routes/
│   │   └── danhSachDuongDan.js     # Tất cả endpoint API
│   │
│   ├── xuLy/                       # Hàm xử lý endpoint, chia theo nghiệp vụ
│   │   ├── taiKhoan/
│   │   ├── xacThuc/
│   │   ├── danhGia/
│   │   ├── hoSo/
│   │   ├── cauHoi/
│   │   ├── nganh/
│   │   └── truong/
│   │
│   ├── middlewares/
│   │   └── xacThuc.js              # Xác thực JWT và phân quyền Admin
│   ├── ungDung.js                  # Cấu hình Express
│   └── server.js                   # Khởi động server
│
└── README.md                       # Tài liệu hướng dẫn sử dụng
```

---

## 3. Quy trình Nghiệp vụ & 2 Luồng Đánh giá

### 3.1. Luồng chính (Khám phá - Main Flow)
Dành cho người dùng chưa xác định rõ ngành học:
```
[Bắt đầu] 
   │
   ▼
[Bước 1: Profile] ──────► Khảo sát môn học thế mạnh, học lực GPA, khu vực ưu tiên
   │
   ▼
[Bước 2: Tính cách 4 chiều] ─► 24 câu hỏi forced-choice (E/I, S/N, T/F, J/P)
   │                           ├─ Cực >= 4 câu: chọn cực đó; Hòa 3-3: đánh dấu chưa rõ (X)
   │                           └─ Có >= 1 chiều chưa rõ ──► Tự động mở bài Holland
   ▼
[Bước 3: Sở thích Holland] ──► 18 câu likert 1-5 (3 câu/nhóm R, I, A, S, E, C)
   │
   ▼
[Bước 4: Ngoại ngữ] ────────► 8 câu (Đọc hiểu, giao tiếp, trắc nghiệm, chứng chỉ)
   │
   ▼
[Bước 5: Việc làm] ─────────► 5 câu cơ hội việc làm (chỉ dành cho Sinh viên năm nhất)
   │
   ▼
[Bước 6: Trust Check] ──────► Đánh giá độ tin cậy 1 - 5 sao
   │                           ├─ Điểm 1-2 sao ──► Đề xuất bài test chưa làm / tư vấn
   │                           └─ Điểm >= 3 sao ─► Chấp nhận kết quả
   ▼
[Bước 7: Kết quả tổng hợp] ─► Gợi ý Top 3 - 5 ngành có fitScore cao nhất kèm:
                               ├─ Điểm mạnh & Điểm cần cải thiện
                               ├─ Lộ trình phát triển & Lời khuyên AI
                               └─ Danh sách trường đại học đào tạo + Điểm chuẩn
```

### 3.2. Luồng B (Đã có ngành mong muốn)
Dành cho người dùng đã nhắm sẵn một ngành cụ thể:
1. Chọn ngành mục tiêu (`targetMajorId`), mức chắc chắn (thang 1 - 10) và lý do.
2. Làm bài rút gọn: Tính cách 24 câu, Holland 18 câu, Ngoại ngữ.
3. Chấm điểm phù hợp $S \in [0, 100]$ và phân loại 4 mức hành động:

| Điểm số ($S$) | Mức đánh giá | Hành động đề xuất |
| :---: | :---: | :--- |
| **75 – 100** | **Rất phù hợp** | Xác nhận ngành, gợi ý trường đào tạo tiêu biểu và lộ trình phát triển. |
| **55 – 74** | **Khá phù hợp** | Xác nhận ngành, chỉ rõ các điểm cần cải thiện (kỹ năng, ngoại ngữ). |
| **40 – 54** | **Phù hợp một phần** | Hiển thị đánh giá chi tiết, gợi ý thêm 2 – 3 ngành liên quan gần (`related_majors`). |
| **Dưới 40** | **Chưa phù hợp** | Gợi ý 3 – 5 ngành khác có mức độ tương thích cao hơn. |

---

## 4. Thuật toán Chấm điểm & Quy tắc Trọng số

### 4.1. Công thức tổng quát
$$S = \sum_{i=1}^n W_i \times P_i$$
Trong đó:
- $S$: Điểm phù hợp ngành tổng thể ($0 \le S \le 100$).
- $W_i$: Trọng số thành phần thứ $i$ ($\sum W_i = 1$).
- $P_i$: Điểm chuẩn hóa của thành phần thứ $i$ ($0 \le P_i \le 100$).

### 4.2. Bảng phân bổ trọng số
| Thành phần đánh giá | Luồng chính (Đủ dữ liệu) | Luồng chính (Học sinh THPT) | Luồng B (Đủ dữ liệu) | Luồng B (Học sinh THPT) |
| :--- | :---: | :---: | :---: | :---: |
| **Holland RIASEC** | **40%** | **44.44%** | **40%** | **44.44%** |
| **Tính cách 4 chiều** | **30%** | **33.33%** | **20%** | **22.22%** |
| **Năng lực & Môn học** | **10%** | **11.11%** | **15%** | **16.67%** |
| **Ngoại ngữ** | **10%** | **11.11%** | **15%** | **16.67%** |
| **Cơ hội việc làm** | **10%** | *Không áp dụng* | **10%** | *Không áp dụng* |

> 💡 **Quy tắc tái phân bổ:** Khi đối tượng là học sinh THPT (không có bài test Cơ hội việc làm), 10% trọng số của thành phần này được tự động chia đều theo tỷ lệ phần trăm cho 4 thành phần còn lại, bảo đảm tổng trọng số luôn bằng 100%.

---

## 5. Dữ liệu Nền tảng (Seed Data)

Hệ thống tự động nạp dữ liệu câu hỏi và cấu hình chấm điểm khi khởi động:
- **60 câu hỏi chuẩn hóa:**
  - 24 câu Tính cách 4 chiều (E/I: 6, S/N: 6, T/F: 6, J/P: 6 - forced choice, không sao chép MBTI bản quyền).
  - 18 câu Holland (3 câu/nhóm R, I, A, S, E, C - Likert 1-5).
  - 8 câu Ngoại ngữ (Đọc, nói, trắc nghiệm ngữ pháp, chứng chỉ CEFR).
  - 5 câu Cơ hội việc làm (dành riêng SV năm 1).
  - 5 câu Profile (học lực GPA, môn học thế mạnh, tài chính, khu vực).
- **Danh mục trường, ngành, hồ sơ ngành và điểm chuẩn:** được lưu trong [`database.sql`](./database.sql). Import file này bằng phpMyAdmin trên XAMPP (hoặc chọn database `huong_nghiep_db` trước khi import).
- **10 ngành nghề trọng điểm & MajorProfiles:**
  - CNTT, Kỹ thuật phần mềm, Quản trị kinh doanh, Marketing, Tài chính - Ngân hàng, Kế toán - Kiểm toán, Ngôn ngữ Anh, Thiết kế đồ họa, Y đa khoa, Logistics & Quản lý chuỗi cung ứng.
- **30 trường đại học tiêu biểu (Đủ 3 miền Bắc - Trung - Nam):**
  - Miền Bắc (10 trường): Bách Khoa HN, ĐH Công nghệ ĐHQGHN, Kinh tế Quốc dân, Ngoại thương HN, Học viện Bưu chính Viễn thông, ĐH Hà Nội, ĐH Y Hà Nội, ĐH Giao thông Vận tải, FPT HN, Phenikaa.
  - Miền Trung (10 trường): Bách Khoa Đà Nẵng, Kinh tế Đà Nẵng, Ngoại ngữ Đà Nẵng, Sư phạm Kỹ thuật Đà Nẵng, ĐH Duy Tân, FPT Đà Nẵng, ĐH Khoa học Huế, ĐH Kinh tế Huế, ĐH Nha Trang, ĐH Quy Nhơn.
  - Miền Nam (10 trường): Bách Khoa TP.HCM, ĐH Công nghệ Thông tin TP.HCM, ĐH Khoa học Tự nhiên TP.HCM, ĐH Kinh tế TP.HCM (UEH), ĐH Sư phạm Kỹ thuật TP.HCM, ĐH Tôn Đức Thắng, Ngoại thương CS2, ĐH Y Dược TP.HCM, ĐH Cần Thơ, RMIT Việt Nam.
- **Bảng điểm chuẩn tuyển sinh (`AdmissionScores`):** Dữ liệu mẫu theo năm tuyển sinh và phương thức xét tuyển được lưu cùng schema trong `database.sql`.

---

## 6. Tài liệu API Endpoints Chi tiết

### 6.1. Nhóm Đánh giá Hướng nghiệp (`/api/assessment`)

#### • Khởi tạo bài test mới
- **Method:** `POST`
- **URL:** `/api/assessment/start`
- **Body:**
  ```json
  {
    "flow": "main",
    "audience": "student",
    "targetMajorId": null,
    "certaintyLevel": null,
    "targetReason": null
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "assessment": {
      "id": "asm_1793692647583_257u50",
      "flow": "main",
      "audience": "student",
      "currentSection": "profile",
      "targetMajorId": null
    }
  }
  ```

#### • Lấy câu hỏi theo section
- **Method:** `GET`
- **URL:** `/api/assessment/:id/section/:sectionType`
- **Params:** `sectionType` $\in$ `['profile', 'personality', 'holland', 'language', 'career_opportunity']`
- Server lấy hồ sơ người dùng và ngành mục tiêu để cá nhân hóa câu hỏi theo từng section. Nội dung câu hỏi kiểm tra đáp án ngoại ngữ được giữ nguyên; các ID, lựa chọn và dữ liệu chấm điểm luôn lấy từ ngân hàng chuẩn.

#### • Nộp câu trả lời một section & Chuyển bài
- **Method:** `POST`
- **URL:** `/api/assessment/:id/submit-section`
- **Body:**
  ```json
  {
    "sectionType": "personality",
    "answers": [
      { "questionId": "P_EI_01", "userAnswer": "I" },
      { "questionId": "P_SN_01", "userAnswer": "N" }
    ]
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "assessmentId": "asm_1793692647583_257u50",
    "submittedSection": "personality",
    "sectionScore": 75,
    "nextSection": "holland",
    "isCompleted": false
  }
  ```

#### • Ghi nhận Trust Check
- **Method:** `POST`
- **URL:** `/api/assessment/:id/trust-check`
- **Body:**
  ```json
  {
    "trustScore": 5,
    "isTrusted": true,
    "disagreeReasons": [],
    "feedbackText": "Kết quả rất sát với định hướng của em!"
  }
  ```

#### • Lấy kết quả toàn diện bài test
- **Method:** `GET`
- **URL:** `/api/assessment/:id/result`
- **Response:** Trả về điểm phù hợp, MBTI type, Holland top code, Top 3-5 ngành gợi ý, điểm mạnh, điểm cần cải thiện và danh sách trường ĐH đào tạo kèm điểm chuẩn.

#### • So sánh hai bài test
- **Method:** `GET`
- **URL:** `/api/assessment/:id/compare/:otherId`
- Chỉ so sánh hai bài đã hoàn thành của cùng một người dùng; API tự sắp xếp theo thời gian tạo bài.
- Chênh lệch dưới 5 điểm được xem là ổn định. Các trường `direction` (`increase`, `decrease`, `stable`) và `color` (`green`, `red`, `gray`) dùng để hiển thị xu hướng điểm.
- Response gồm mức độ phù hợp, ngoại ngữ, học tập, cơ hội nghề nghiệp, sáu điểm và mã Holland, các chiều MBTI, cùng danh sách ngành mới/mất/giữ lại. Nếu hai bài cách nhau dưới 3 ngày, response có `shortIntervalNote`.
- Các nhận xét chỉ mang tính tham khảo; ngành xuất hiện ở cả hai lần được ưu tiên cân nhắc, ngành mới hoặc không còn chỉ là gợi ý cần tìm hiểu thêm.

#### • Lấy lịch sử làm bài
- **Method:** `GET`
- **URL:** `/api/assessment/history/:userId`

---

### 6.2. Nhóm Ngân hàng Câu hỏi (`/api/questions`)
| Method | URL | Quyền | Mô tả |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/questions` | Public | Lấy danh sách câu hỏi (hỗ trợ lọc `section`, `audience`, `type`) |
| `GET` | `/api/questions/:id` | Public | Xem chi tiết một câu hỏi |
| `POST` | `/api/questions/generate-english` | Admin | Dùng AI tạo và lưu 1-10 câu hỏi trắc nghiệm tiếng Anh |
| `POST` | `/api/questions` | Admin | Thêm câu hỏi mới vào ngân hàng |
| `PUT` | `/api/questions/:id` | Admin | Cập nhật câu hỏi |
| `DELETE` | `/api/questions/:id` | Admin | Xóa câu hỏi |

Request body tùy chọn:
```json
{
  "count": 5,
  "topic": "mixed",
  "difficulty": "intermediate"
}
```
`topic` nhận `grammar`, `vocabulary`, `reading` hoặc `mixed`; `difficulty` nhận `easy`, `intermediate` hoặc `advanced`. Câu hỏi được lưu vào ngân hàng phần `language`, xuất hiện trong bài đánh giá tiếp theo và được chấm đáp án ở phía máy chủ. Cần cấu hình `DEEPSEEK_API_KEY`.

---

### 6.3. Nhóm Ngành học & Hồ sơ Năng lực (`/api/majors`)
| Method | URL | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/majors` | Danh sách 10 ngành nghề kèm hồ sơ năng lực (`hollandProfile`, `personalityFit`, `skillsRequired`, `jobOutlook`...) |
| `GET` | `/api/majors/:id` | Chi tiết ngành nghề và danh sách trường ĐH đào tạo kèm điểm chuẩn tuyển sinh |

---

### 6.4. Nhóm Trường Đại học & Điểm chuẩn (`/api/schools`)
| Method | URL | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/schools` | Danh sách 30 trường ĐH (hỗ trợ lọc `region`: 'Bac', 'Trung', 'Nam', tìm kiếm theo tên hoặc mã) |
| `GET` | `/api/schools/:id` | Chi tiết trường đại học và danh sách điểm chuẩn các ngành qua các năm |
| `GET` | `/api/schools/admission-scores` | Tra cứu điểm chuẩn tuyển sinh theo ngành, trường, năm (2024, 2025) |

---

### 6.5. Nhóm Xác thực & Quản lý Tài khoản (`/api/auth` & `/api/accounts`)
| Method | URL | Quyền | Mô tả |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | Public | Đăng ký tài khoản mới (`email`, `password`, `fullName`) |
| `POST` | `/api/auth/login` | Public | Đăng nhập hệ thống, nhận JWT Token |
| `GET` | `/api/auth/me` | Bearer Token | Lấy thông tin tài khoản đang đăng nhập |
| `POST` | `/api/auth/change-password` | Bearer Token | Đổi mật khẩu |
| `GET` | `/api/accounts` | Admin | Danh sách tài khoản người dùng (phân trang, tìm kiếm) |
| `GET` | `/api/profile/:userId` | Public / Token | Xem hồ sơ cá nhân |
| `PUT` | `/api/profile/:userId` | Token | Cập nhật hồ sơ cá nhân |

---

## 7. Hướng dẫn Cài đặt & Khởi chạy

### 7.1. Yêu cầu môi trường
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### 7.2. Cài đặt các thư viện phụ thuộc
```bash
npm install
```

### 7.3. Cấu hình biến môi trường (`.env`)
File `.env` mặc định sử dụng SQLite để có thể chạy ngay lập tức mà không cần cài đặt thêm:
```env
PORT=5000
DB_DIALECT=sqlite

# Khi kết nối sang MySQL (XAMPP / WAMP / Docker), đổi sang DB_DIALECT=mysql:
# DB_DIALECT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=huong_nghiep_db

JWT_SECRET=huong_nghiep_jwt_secret_key_2024

# Nhà cung cấp AI duy nhất
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
```

Khi dùng XAMPP, bật MySQL, import `database.sql` bằng phpMyAdmin, sau đó đặt `DB_DIALECT=mysql` trong `.env` (các biến `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` ở trên phù hợp cấu hình XAMPP mặc định). File SQL tạo cấu trúc cho toàn bộ các model; khi server khởi động, Sequelize đồng bộ cấu trúc và seed câu hỏi, cấu hình chấm điểm cùng tài khoản quản trị mặc định.

Đặt `AI_PROVIDER=deepseek`, cấu hình `DEEPSEEK_API_KEY` và tùy chọn model qua `DEEPSEEK_MODEL` (mặc định `deepseek-chat`). Câu hỏi kiểm tra đáp án ngoại ngữ được giữ nguyên; nếu DeepSeek lỗi hoặc trả cấu trúc không hợp lệ, server dùng ngân hàng câu hỏi chuẩn. Khi tạo lời khuyên, server thử lại một lần với lỗi tạm thời như HTTP 429/5xx hoặc lỗi kết nối trước khi dùng nhận xét dự phòng. Không commit API key vào Git.

### 7.4. Khởi chạy Server
- **Chế độ phát triển (Tự động tải lại khi sửa code):**
  ```bash
  npm run dev
  ```
- **Chế độ chính thức (Production):**
  ```bash
  npm start
  ```

Server ghi log mỗi request HTTP trong terminal với method, đường dẫn (không gồm query string), mã trạng thái và thời gian xử lý. Request lỗi từ 400 trở lên được ghi bằng `console.warn`.

> 🔑 **Tài khoản Quản trị viên mặc định:**
> - **Email:** `phongdien1905@gmail.com`
> - **Mật khẩu:** `123456`
> - **Vai trò:** `admin`

---

## 8. Kiểm thử Hệ thống

Repository hiện không có script kiểm thử tự động. Danh sách endpoint và quyền truy cập được mô tả tại mục 6; có thể kiểm tra bằng Postman sau khi khởi chạy server.
