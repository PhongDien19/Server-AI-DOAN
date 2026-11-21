const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Model mô tả thông tin hồ sơ gắn với một tài khoản.
const NguoiDung = sequelize.define('NguoiDung', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'MaND'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'MaTK'
  },
  fullName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'HoTen'
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'Tuoi'
  },
  educationLevel: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'educationLevel'
  },
  audience: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'student', // 'student' (học sinh THPT) hoặc 'freshman' (sinh viên năm 1)
    field: 'DoiTuong'
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'KhuVucHT'
  },
  interests: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'SoThich'
  },
  targetMajor: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'NganhMucTieu'
  }
}, {
  tableName: 'nguoidung',
  timestamps: false,
});

module.exports = NguoiDung;
