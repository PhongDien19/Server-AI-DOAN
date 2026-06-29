const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Chatbox = sequelize.define('Chatbox', {
  MaTinNhan: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  MaND: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  MaChat: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  NguoiGui: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  NoiDung: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  ThoiGian: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'Chatbox',
  timestamps: false,
});

module.exports = Chatbox;
