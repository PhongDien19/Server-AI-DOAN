const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DanhMucNganh = sequelize.define('DanhMucNganh', {
  MaDM: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  TenDM: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  MoTa: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  TrangThai: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
  }
}, {
  tableName: 'DanhMucNganh',
  timestamps: false,
});

module.exports = DanhMucNganh;
