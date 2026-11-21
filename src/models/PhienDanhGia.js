const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Model lưu thông tin chung của một lần làm bài trắc nghiệm.
const PhienDanhGia = sequelize.define('PhienDanhGia', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false,
    field: 'MaPhien'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'MaTK'
  },
  flow: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'main', // 'main' (luồng khám phá) hoặc 'flow_b' (đã có ngành mục tiêu)
    field: 'LuongTest'
  },
  audience: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'student', // 'student' (THPT) hoặc 'freshman' (sinh viên năm 1)
    field: 'DoiTuong'
  },
  targetMajorId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'MaNganhMucTieu'
  },
  certaintyLevel: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'MucDoChacChan' // Thang 1 - 10
  },
  targetReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'LyDoChonNganh'
  },
  currentSection: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'profile', // 'profile', 'personality', 'holland', 'language', 'career_opportunity', 'trust_check', 'completed'
    field: 'PhanHienTai'
  },
  completedSections: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '[]',
    field: 'CacPhanDaXong',
    get() {
      const raw = this.getDataValue('completedSections');
      try {
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('completedSections', typeof val === 'string' ? val : JSON.stringify(val || []));
    }
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'in_progress', // 'in_progress', 'completed', 'abandoned'
    field: 'TrangThai'
  },
  trustScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'DiemTinTuong' // 1 - 5 sao
  },
  trustFeedback: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'PhanHoiTinTuong'
  }
}, {
  tableName: 'danhgia_phien',
  timestamps: true
});

module.exports = PhienDanhGia;

