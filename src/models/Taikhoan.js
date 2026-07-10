const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Taikhoan = sequelize.define('Taikhoan', {
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
    unique: true,
    field: 'Email'
  },
  phone: {
    type: DataTypes.STRING(11),
    allowNull: true,
    field: 'SoDienThoai'
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
  // Fields for codebase compatibility
  authProvider: {
    type: DataTypes.STRING,
    defaultValue: 'local',
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  tableName: 'taikhoan',
  timestamps: false,
});

Taikhoan.beforeCreate((taikhoan) => {
  if (!taikhoan.fullName) {
    taikhoan.fullName = taikhoan.email ? taikhoan.email.split('@')[0] : 'User';
  }
});

module.exports = Taikhoan;
