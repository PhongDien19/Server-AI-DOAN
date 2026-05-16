const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  sessionId: {
    type: DataTypes.STRING, // Dùng để gom nhóm câu hỏi của cùng 1 lần làm bài
  },
  userId: {
    type: DataTypes.INTEGER, // User làm bài (nếu có)
  },
  testName: {
    type: DataTypes.STRING,
  },
  testType: {
    type: DataTypes.ENUM('career', 'holland', 'personality', 'cognitive', 'values'), // Loại test
    defaultValue: 'career',
  },
  questionText: {
    type: DataTypes.TEXT,
  },
  options: {
    type: DataTypes.JSON,
  },
  userAnswer: {
    type: DataTypes.TEXT, // Lưu trực tiếp câu trả lời của user vào đây
    allowNull: true,
  },
  correctAnswer: {
    type: DataTypes.STRING, // Đáp án đúng (cho test cognitive)
    allowNull: true,
  },
  hollandType: {
    type: DataTypes.ENUM('R', 'I', 'A', 'S', 'E', 'C'), // Cho test Holland
    allowNull: true,
  },
  trait: {
    type: DataTypes.ENUM('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'), // Cho test Big 5
    allowNull: true,
  },
  valueType: {
    type: DataTypes.ENUM('stability', 'achievement', 'balance', 'contribution', 'autonomy', 'relationships'), // Cho test Values
    allowNull: true,
  },
  questionType: {
    type: DataTypes.ENUM('logical', 'verbal', 'numerical', 'analytical'), // Cho test cognitive
    allowNull: true,
  },
  order: {
    type: DataTypes.INTEGER,
  }
}, {
  timestamps: false,
  freezeTableName: true,
});

module.exports = Question;
