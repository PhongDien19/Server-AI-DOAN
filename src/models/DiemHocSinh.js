const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DiemHocSinh = sequelize.define('DiemHocSinh', {
  MaND: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  Toan: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  Van: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  Anh: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  Ly: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  Hoa: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  Sinh: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  Su: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  Dia: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  GDCD: {
    type: DataTypes.FLOAT,
    allowNull: true
  }
}, {
  tableName: 'diem_hoc_sinh',
  timestamps: false,
});

module.exports = DiemHocSinh;
