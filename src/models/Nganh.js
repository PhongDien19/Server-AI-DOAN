const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Model mô tả một ngành học.
const Nganh = sequelize.define('Nganh', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false,
    field: 'MaNganh'
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    field: 'TenNganh'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'KhoiNganh' // 'Công nghệ', 'Kinh tế - Quản lý', 'Ngôn ngữ', 'Y tế', 'Nghệ thuật - Thiết kế', 'Kỹ thuật'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'MoTaNganh'
  }
}, {
  tableName: 'danhmuc_nganh',
  timestamps: false
});

module.exports = Nganh;

