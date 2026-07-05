const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SurveyFeedback = sequelize.define('SurveyFeedback', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Allow anonymous feedback
  },
  surveyId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ratingScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true, // Will automatically add createdAt and updatedAt
  tableName: 'surveyfeedback'
});

module.exports = SurveyFeedback;
