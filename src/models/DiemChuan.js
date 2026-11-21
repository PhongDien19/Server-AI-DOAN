const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Model lưu điểm chuẩn của một ngành tại một trường.
const DiemChuan = sequelize.define('DiemChuan', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'MaDiemChuan'
  },
  universityId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'MaTruong'
  },
  majorId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'MaNganh'
  },
  majorNameInSchool: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: 'TenNganhTaiTruong'
  },
  admissionYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2024,
    field: 'NamTuyenSinh'
  },
  admissionMethod: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Điểm thi tốt nghiệp THPT',
    field: 'PhuongThucXetTuyen' // 'Điểm thi tốt nghiệp THPT', 'Đánh giá năng lực', 'Xét tuyển kết hợp'
  },
  cutoffScore: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'DiemChuan'
  },
  scoreScale: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '30', // Thang điểm '30' hoặc '1200'
    field: 'ThangDiem'
  },
  sourceUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'NguonXacMinh'
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'NgayXacMinh'
  }
}, {
  tableName: 'danhmuc_diemchuan',
  timestamps: false
});

module.exports = DiemChuan;

