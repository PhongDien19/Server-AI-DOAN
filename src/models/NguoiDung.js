const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NguoiDung = sequelize.define('NguoiDung', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'MaND'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'MaTK'
  },
  fullName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'HoTen'
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'Tuoi'
  },
  educationLevel: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'HocVan'
  },
  studyStatus: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'TinhTrangHT'
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'KhuVucHT'
  },
  interests: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'SoThich',
    // Support JSON string parsing if interests are stored as JSON by some code
    get() {
      const val = this.getDataValue('interests');
      if (!val) return null;
      try {
        return JSON.parse(val);
      } catch (e) {
        return val;
      }
    },
    set(val) {
      if (typeof val === 'object') {
        this.setDataValue('interests', JSON.stringify(val));
      } else {
        this.setDataValue('interests', val);
      }
    }
  },
  skills: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'KyNang'
  },
  // Additional profile fields for compatibility with existing code
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  avatarUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // AI report storage fields
  careerFitScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  careerFitResult: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  hollandScores: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  hollandResult: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  personalityScores: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  personalityResult: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  mbtiType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cognitiveScores: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  cognitiveResult: {
    type: DataTypes.JSON,
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
  valuesScores: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  valuesResult: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  topValues: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  valuesSummary: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  overallCompatibility: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  compatibilityZone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pillarScores: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  comprehensiveSummary: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  strengths: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  weaknesses: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  recommendedCareers: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  skillDevelopment: {
    type: DataTypes.JSON,
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
  tableName: 'NguoiDung',
  timestamps: false,
});

module.exports = NguoiDung;
