const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TrustCheck = sequelize.define('TrustCheck', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'MaTrust'
  },
  assessmentId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'MaPhien'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'MaTK'
  },
  section: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'overall',
    field: 'PhanDanhGia'
  },
  trustScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'DiemTinTuong' // 1 đến 5 sao
  },
  isTrusted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'DongYKetQua'
  },
  disagreeReasons: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'LyDoKhongDongY',
    get() {
      const raw = this.getDataValue('disagreeReasons');
      try {
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('disagreeReasons', typeof val === 'string' ? val : JSON.stringify(val || []));
    }
  },
  feedbackText: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'GopYChiTiet'
  },
  actionTaken: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'HuongXuLyTiep'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'NgayTao'
  }
}, {
  tableName: 'danhgia_trustcheck',
  timestamps: false
});

module.exports = TrustCheck;

