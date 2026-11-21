const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Model lưu câu trả lời của người dùng.
const CauTraLoiDanhGia = sequelize.define('CauTraLoiDanhGia', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'MaTL'
  },
  assessmentId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'MaPhien'
  },
  questionId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'MaCauHoi'
  },
  section: {
    type: DataTypes.STRING(30),
    allowNull: false,
    field: 'PhanTest'
  },
  userAnswer: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'CauTraLoi'
  },
  scoreContribution: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'DongGopDiem',
    get() {
      const raw = this.getDataValue('scoreContribution');
      try {
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    set(val) {
      this.setDataValue('scoreContribution', typeof val === 'string' ? val : JSON.stringify(val || null));
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'NgayTao'
  }
}, {
  tableName: 'danhgia_cautraloi',
  timestamps: false
});

module.exports = CauTraLoiDanhGia;

