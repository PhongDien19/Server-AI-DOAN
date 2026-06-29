const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NgheNghiep = sequelize.define('NgheNghiep', {
  MaNghe: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  MaDM: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  TenNghe: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  Slug: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  MoTa: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  KyNangCT: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  TrangThai: {
    type: DataTypes.TINYINT,
    allowNull: true,
    defaultValue: 1,
  },
  NgayTao: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'NgheNghiep',
  timestamps: false,
});

module.exports = NgheNghiep;
