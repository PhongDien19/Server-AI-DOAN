const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const KetQuaTargetLam = sequelize.define('KetQuaTargetLam', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'userId',
  },
  careerName: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  companyName: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  companyDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  careerLink: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  basicSalary: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  laborMarket: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  sessionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'sessionId',
  }
}, {
  tableName: 'target_lam',
  timestamps: false,
});

module.exports = KetQuaTargetLam;
