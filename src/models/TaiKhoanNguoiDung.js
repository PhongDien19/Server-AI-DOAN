const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Model mô tả bảng tài khoản trong database.
const TaiKhoan = sequelize.define('TaiKhoan', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'MaTK'
  },
  passwordHash: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'MatKhau'
  },
  fullName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'HoTen'
  },
  email: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: 'Email',
    field: 'Email'
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'user',
    field: 'VaiTro'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'TrangThai',
    get() {
      const rawValue = this.getDataValue('isActive');
      return rawValue === 1 || rawValue === true;
    },
    set(value) {
      this.setDataValue('isActive', value ? 1 : 0);
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'NgayTao'
  },
  tokenTest: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    field: 'TokenTest'
  },
  tokenCount: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    field: 'TokenChat'
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  tableName: 'taikhoan',
  timestamps: false,
});

TaiKhoan.beforeCreate((taiKhoan) => {
  if (!taiKhoan.fullName) {
    taiKhoan.fullName = taiKhoan.email ? taiKhoan.email.split('@')[0] : 'User';
  }
});

module.exports = TaiKhoan;
