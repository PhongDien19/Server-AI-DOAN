const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Model lưu các phiên bản và thông số của cách tính điểm.
const PhienBanChamDiem = sequelize.define('PhienBanChamDiem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'MaPB'
  },
  version: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'PhienBan' // 'v1.0.0'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'TenThuatToan'
  },
  mainFlowWeights: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'TrongSoLuongChinh', // JSON: { holland: 0.40, personality: 0.30, profile: 0.10, language: 0.10, career: 0.10 }
    get() {
      const raw = this.getDataValue('mainFlowWeights');
      try {
        return raw ? JSON.parse(raw) : { holland: 0.40, personality: 0.30, profile: 0.10, language: 0.10, career: 0.10 };
      } catch (e) {
        return { holland: 0.40, personality: 0.30, profile: 0.10, language: 0.10, career: 0.10 };
      }
    },
    set(val) {
      this.setDataValue('mainFlowWeights', typeof val === 'string' ? val : JSON.stringify(val || {}));
    }
  },
  flowBWeights: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'TrongSoLuongB', // JSON: { holland: 0.40, personality: 0.20, profile: 0.15, language: 0.15, career: 0.10 }
    get() {
      const raw = this.getDataValue('flowBWeights');
      try {
        return raw ? JSON.parse(raw) : { holland: 0.40, personality: 0.20, profile: 0.15, language: 0.15, career: 0.10 };
      } catch (e) {
        return { holland: 0.40, personality: 0.20, profile: 0.15, language: 0.15, career: 0.10 };
      }
    },
    set(val) {
      this.setDataValue('flowBWeights', typeof val === 'string' ? val : JSON.stringify(val || {}));
    }
  },
  flowBThresholds: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'NguongLuongB', // JSON: { veryFit: 75, fit: 55, partialFit: 40 }
    get() {
      const raw = this.getDataValue('flowBThresholds');
      try {
        return raw ? JSON.parse(raw) : { veryFit: 75, fit: 55, partialFit: 40 };
      } catch (e) {
        return { veryFit: 75, fit: 55, partialFit: 40 };
      }
    },
    set(val) {
      this.setDataValue('flowBThresholds', typeof val === 'string' ? val : JSON.stringify(val || {}));
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'DangApDung'
  }
}, {
  tableName: 'danhmuc_phienban_cham',
  timestamps: false
});

module.exports = PhienBanChamDiem;

