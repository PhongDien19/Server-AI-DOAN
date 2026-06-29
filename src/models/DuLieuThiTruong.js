const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DuLieuThiTruong = sequelize.define('DuLieuThiTruong', {
  MaDL: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  MaNghe: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  Loai: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  TieuDe: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  GiaTri: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  MetaData: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  NgayCapNhat: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'DuLieuThiTruong',
  timestamps: false,
});

module.exports = DuLieuThiTruong;
