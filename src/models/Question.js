const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  sessionId: {
    type: DataTypes.STRING, // Dùng để gom nhóm 5 câu hỏi của cùng 1 lần làm bài
  },
  userId: {
    type: DataTypes.INTEGER, // User làm bài (nếu có)
  },
  testName: {
    type: DataTypes.STRING,
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
  order: {
    type: DataTypes.INTEGER,
  }
}, {
  timestamps: false,
  freezeTableName: true,
});

module.exports = Question;
