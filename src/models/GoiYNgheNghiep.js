const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GoiYNgheNghiep = sequelize.define('GoiYNgheNghiep', {
  MaGoiY: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  MaNghe: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  MaKQ: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  tableName: 'GoiYNgheNghiep',
  timestamps: false,
});

module.exports = GoiYNgheNghiep;
