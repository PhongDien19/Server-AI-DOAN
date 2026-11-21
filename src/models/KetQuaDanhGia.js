const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Model lưu kết quả tổng hợp sau khi hoàn thành bài trắc nghiệm.
// Các danh sách và điểm chi tiết được lưu thành JSON trong database.
const KetQuaDanhGia = sequelize.define('KetQuaDanhGia', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'MaKetQua'
  },
  assessmentId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'MaPhien'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'MaTK'
  },
  targetMajorId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'MaNganhMucTieu'
  },
  fitScore: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    field: 'DiemPhuHop' // Thang 0 - 100
  },
  fitLevel: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Chưa đánh giá',
    field: 'MucPhuHop' // 'Rất phù hợp', 'Khá phù hợp', 'Phù hợp một phần', 'Chưa phù hợp'
  },
  actionRecommendation: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'KhuyenNghiHanhDong'
  },
  hollandScores: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'DiemHolland',
    get() {
      const raw = this.getDataValue('hollandScores');
      try {
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    set(val) {
      this.setDataValue('hollandScores', typeof val === 'string' ? val : JSON.stringify(val || null));
    }
  },
  personalityScores: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'DiemTinhCach',
    get() {
      const raw = this.getDataValue('personalityScores');
      try {
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    set(val) {
      this.setDataValue('personalityScores', typeof val === 'string' ? val : JSON.stringify(val || null));
    }
  },
  languageScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'DiemNgoaiNgu'
  },
  profileScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'DiemHocTap'
  },
  careerScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'DiemViecLam'
  },
  recommendedMajors: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'NganhGoiY',
    get() {
      const raw = this.getDataValue('recommendedMajors');
      try {
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('recommendedMajors', typeof val === 'string' ? val : JSON.stringify(val || []));
    }
  },
  strengths: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'DiemManh',
    get() {
      const raw = this.getDataValue('strengths');
      try {
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('strengths', typeof val === 'string' ? val : JSON.stringify(val || []));
    }
  },
  improvementAreas: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'CanCaiThien',
    get() {
      const raw = this.getDataValue('improvementAreas');
      try {
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('improvementAreas', typeof val === 'string' ? val : JSON.stringify(val || []));
    }
  },
  scoringVersion: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'v1.0.0',
    field: 'PhienBanCham'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'NgayTao'
  }
}, {
  tableName: 'danhgia_ketqua',
  timestamps: false
});

module.exports = KetQuaDanhGia;

