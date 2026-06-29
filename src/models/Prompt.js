const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Prompt = sequelize.define('Prompt', {
  MaID: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  MaPrompt: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  MoTa: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  NoiDung: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  BienDauVao: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  TrangThaiHD: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  PhienBan: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  }
}, {
  tableName: 'Prompt',
  timestamps: true, // Diagram has createdAt and updatedAt
});

module.exports = Prompt;
