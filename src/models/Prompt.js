const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Prompt = sequelize.define('Prompt', {
  MaID: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  MaPrompt: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  MoTa: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  MoTaPhu: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'MoTaPhu'
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
  tableName: 'prompt',
  timestamps: true, // Diagram has createdAt and updatedAt
});

module.exports = Prompt;
