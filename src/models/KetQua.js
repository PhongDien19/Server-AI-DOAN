const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const KetQua = sequelize.define('KetQua', {
  MaKQ: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  MaCH: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  CauTL: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  SoDiem: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  MaND: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  NgayLamBai: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'KetQua',
  timestamps: false,
});

module.exports = KetQua;
