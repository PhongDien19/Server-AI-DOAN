const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CauHoi = sequelize.define('CauHoi', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'MaCH'
  },
  questionText: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'NoiDungCH'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'NgayTao'
  },
  options: {
    type: DataTypes.JSON, // JSON field containing choices/options
    allowNull: true,
    field: 'CauTL'
  },
  // Extra columns from existing Question model for logic support
  sessionId: {
    type: DataTypes.STRING,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  testName: {
    type: DataTypes.STRING,
  },
  testType: {
    type: DataTypes.ENUM('career', 'holland', 'personality', 'cognitive', 'values'),
    defaultValue: 'career',
  },
  userAnswer: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  correctAnswer: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  hollandType: {
    type: DataTypes.ENUM('R', 'I', 'A', 'S', 'E', 'C'),
    allowNull: true,
  },
  trait: {
    type: DataTypes.ENUM('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'),
    allowNull: true,
  },
  valueType: {
    type: DataTypes.ENUM('stability', 'achievement', 'balance', 'contribution', 'autonomy', 'relationships'),
    allowNull: true,
  },
  questionType: {
    type: DataTypes.ENUM('logical', 'verbal', 'numerical', 'analytical'),
    allowNull: true,
  },
  order: {
    type: DataTypes.INTEGER,
  }
}, {
  tableName: 'CauHoi',
  timestamps: false,
});

module.exports = CauHoi;
