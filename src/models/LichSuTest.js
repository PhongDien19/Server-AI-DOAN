const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LichSuTest = sequelize.define('LichSuTest', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'userId'
  },
  sessionId: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    field: 'sessionId'
  },
  testMode: {
    type: DataTypes.ENUM('discovery', 'target'),
    allowNull: false,
    field: 'testMode'
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'score'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'createdAt'
  }
}, {
  tableName: 'lichsutest',
  timestamps: false,
});

module.exports = LichSuTest;
