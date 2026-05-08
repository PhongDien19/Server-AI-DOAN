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
}, {
  timestamps: false,
  freezeTableName: true,
});

module.exports = UserProfile;
