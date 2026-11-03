const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AssessmentSection = sequelize.define('AssessmentSection', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'MaSection'
  },
  assessmentId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'MaPhien'
  },
  sectionType: {
    type: DataTypes.STRING(30),
    allowNull: false,
    field: 'LoaiSection' // 'profile', 'personality', 'holland', 'language', 'career_opportunity', 'trust_check'
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'DiemChuanHoa' // Điểm chuẩn hóa thang 0 - 100
  },
  scoreDetails: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'ChiTietDiem',
    get() {
      const raw = this.getDataValue('scoreDetails');
      try {
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    set(val) {
      this.setDataValue('scoreDetails', typeof val === 'string' ? val : JSON.stringify(val || null));
    }
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'ThoiGianHoanThanh'
  }
}, {
  tableName: 'danhgia_thanhphan',
  timestamps: false
});

module.exports = AssessmentSection;

