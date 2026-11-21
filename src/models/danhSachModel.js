const sequelize = require('../config/database');

// Import tất cả các Models
const TaiKhoan = require('./TaiKhoanNguoiDung');
const NguoiDung = require('./NguoiDung');
const PhienDanhGia = require('./PhienDanhGia');
const PhanDanhGia = require('./PhanDanhGia');
const CauTraLoiDanhGia = require('./CauTraLoiDanhGia');
const KetQuaDanhGia = require('./KetQuaDanhGia');
const KiemTraDoTinCay = require('./KiemTraDoTinCay');
const CauHoi = require('./CauHoi');
const Nganh = require('./Nganh');
const HoSoNganh = require('./HoSoNganh');
const TruongDaiHoc = require('./TruongDaiHoc');
const DiemChuan = require('./DiemChuan');
const PhienBanChamDiem = require('./PhienBanChamDiem');

// hasOne: một tài khoản có một hồ sơ; belongsTo: hồ sơ thuộc về tài khoản đó.
TaiKhoan.hasOne(NguoiDung, {
  foreignKey: 'userId',
  as: 'Profile',
  onDelete: 'CASCADE'
});
NguoiDung.belongsTo(TaiKhoan, {
  foreignKey: 'userId',
  as: 'Account'
});

// Một tài khoản có thể tạo nhiều phiên đánh giá.
TaiKhoan.hasMany(PhienDanhGia, {
  foreignKey: 'userId',
  as: 'Assessments',
  onDelete: 'SET NULL'
});
PhienDanhGia.belongsTo(TaiKhoan, {
  foreignKey: 'userId',
  as: 'Account'
});

// Một phiên đánh giá có nhiều phần và nhiều câu trả lời.
PhienDanhGia.hasMany(PhanDanhGia, {
  foreignKey: 'assessmentId',
  as: 'Sections',
  onDelete: 'CASCADE'
});
PhanDanhGia.belongsTo(PhienDanhGia, {
  foreignKey: 'assessmentId',
  as: 'Assessment'
});

PhienDanhGia.hasMany(CauTraLoiDanhGia, {
  foreignKey: 'assessmentId',
  as: 'Responses',
  onDelete: 'CASCADE'
});
CauTraLoiDanhGia.belongsTo(PhienDanhGia, {
  foreignKey: 'assessmentId',
  as: 'Assessment'
});

// Mỗi phiên chỉ có một kết quả tổng hợp.
PhienDanhGia.hasOne(KetQuaDanhGia, {
  foreignKey: 'assessmentId',
  as: 'Result',
  onDelete: 'CASCADE'
});
KetQuaDanhGia.belongsTo(PhienDanhGia, {
  foreignKey: 'assessmentId',
  as: 'Assessment'
});

// Một phiên có thể nhận nhiều phản hồi về độ tin cậy.
PhienDanhGia.hasMany(KiemTraDoTinCay, {
  foreignKey: 'assessmentId',
  as: 'TrustChecks',
  onDelete: 'CASCADE'
});
KiemTraDoTinCay.belongsTo(PhienDanhGia, {
  foreignKey: 'assessmentId',
  as: 'Assessment'
});

// Mỗi ngành có một hồ sơ năng lực.
Nganh.hasOne(HoSoNganh, {
  foreignKey: 'majorId',
  as: 'Profile',
  onDelete: 'CASCADE'
});
HoSoNganh.belongsTo(Nganh, {
  foreignKey: 'majorId',
  as: 'Major'
});

// Một trường có nhiều điểm chuẩn theo ngành.
TruongDaiHoc.hasMany(DiemChuan, {
  foreignKey: 'universityId',
  as: 'AdmissionScores',
  onDelete: 'CASCADE'
});
DiemChuan.belongsTo(TruongDaiHoc, {
  foreignKey: 'universityId',
  as: 'University'
});

// Một ngành có thể có điểm chuẩn ở nhiều trường.
Nganh.hasMany(DiemChuan, {
  foreignKey: 'majorId',
  as: 'AdmissionScores',
  onDelete: 'CASCADE'
});
DiemChuan.belongsTo(Nganh, {
  foreignKey: 'majorId',
  as: 'Major'
});

module.exports = {
  sequelize,
  TaiKhoan,
  NguoiDung,
  PhienDanhGia,
  PhanDanhGia,
  CauTraLoiDanhGia,
  KetQuaDanhGia,
  KiemTraDoTinCay,
  CauHoi,
  Nganh,
  HoSoNganh,
  TruongDaiHoc,
  DiemChuan,
  PhienBanChamDiem
};
