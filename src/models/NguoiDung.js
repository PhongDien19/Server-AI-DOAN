const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NguoiDung = sequelize.define('NguoiDung', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'MaND'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'MaTK'
  },
  fullName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'HoTen'
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'Tuoi'
  },
  educationLevel: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'educationLevel'
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'KhuVucHT'
  },
  interests: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'SoThich'
  },
}, {
  tableName: 'nguoidung',
  timestamps: false,
});

module.exports = NguoiDung;
