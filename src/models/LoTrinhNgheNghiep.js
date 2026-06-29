const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LoTrinhNgheNghiep = sequelize.define('LoTrinhNgheNghiep', {
  MaLT: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  MaNganh: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  MaKQ: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  TieuDe: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  MoTa: {
    type: DataTypes.TEXT,
    allowNull: false,
  }
}, {
  tableName: 'LoTrinhNgheNghiep',
  timestamps: false,
});

module.exports = LoTrinhNgheNghiep;
