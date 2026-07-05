const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DiemNguoiLam = sequelize.define('DiemNguoiLam', {
  MaND: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  GPA: {
    type: DataTypes.FLOAT,
    allowNull: true
  }
}, {
  tableName: 'diem_nguoi_lam',
  timestamps: false,
});

module.exports = DiemNguoiLam;
