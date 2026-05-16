const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserProfile = sequelize.define('UserProfile', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
  },
  email: {
    type: DataTypes.STRING,
  },
  fullName: {
    type: DataTypes.STRING,
  },
  avatarUrl: {
    type: DataTypes.TEXT,
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
  },
  bio: {
    type: DataTypes.TEXT,
  },
  interests: {
    type: DataTypes.JSON,
  },
  targetJob: {
    type: DataTypes.STRING,
  },
  educationLevel: {
    type: DataTypes.STRING,
  },
  phone: {
    type: DataTypes.STRING,
  },
  careerFitScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  careerFitResult: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  hollandScores: {
    type: DataTypes.JSON, // {"R": 3.5, "I": 4.2, "A": 2.1, "S": 4.8, "E": 3.2, "C": 2.9}
    allowNull: true,
  },
  hollandResult: {
    type: DataTypes.JSON, // {topTypes, summary, careerSuggestions, advice}
    allowNull: true,
  },
  personalityScores: {
    type: DataTypes.JSON, // Big 5 scores
    allowNull: true,
  },
  personalityResult: {
    type: DataTypes.JSON, // {suggestedMBTI, personalitySummary, strengths, careerFit, developmentAdvice}
    allowNull: true,
  },
  mbtiType: {
    type: DataTypes.STRING, // Loại MBTI được gợi ý
    allowNull: true,
  },
  cognitiveScores: {
    type: DataTypes.JSON, // {logical, verbal, numerical, analytical}
    allowNull: true,
  },
  cognitiveResult: {
    type: DataTypes.JSON, // {overallScore, correctPercentage, strengths, weaknesses, careerImplications, improvementSuggestions}
    allowNull: true,
  },
  cognitiveOverallScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  cognitiveCorrectPercentage: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  // Values Assessment fields
  valuesScores: {
    type: DataTypes.JSON, // {stability, achievement, balance, contribution, autonomy, relationships}
    allowNull: true,
  },
  valuesResult: {
    type: DataTypes.JSON, // {topValues, valuesSummary, workEnvironment, advice}
    allowNull: true,
  },
  topValues: {
    type: DataTypes.JSON, // Array of top 3 values
    allowNull: true,
  },
  valuesSummary: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Comprehensive Assessment fields
  overallCompatibility: {
    type: DataTypes.FLOAT, // 0-100 percentage
    allowNull: true,
  },
  compatibilityZone: {
    type: DataTypes.STRING, // "Tối ưu", "Tiềm năng", "Rủi ro"
    allowNull: true,
  },
  pillarScores: {
    type: DataTypes.JSON, // {interest, personality, ability, values}
    allowNull: true,
  },
  comprehensiveSummary: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  strengths: {
    type: DataTypes.JSON, // Array of strengths
    allowNull: true,
  },
  weaknesses: {
    type: DataTypes.JSON, // Array of weaknesses
    allowNull: true,
  },
  recommendedCareers: {
    type: DataTypes.JSON, // Array of recommended careers
    allowNull: true,
  },
  skillDevelopment: {
    type: DataTypes.JSON, // Array of skills to develop
    allowNull: true,
  },
  workEnvironment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  careerAdvice: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: false,
  freezeTableName: true,
});

module.exports = UserProfile;
