const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Model mô tả một câu hỏi trong ngân hàng câu hỏi.
// options, scoring và nextRule được lưu thành JSON trong database.
const CauHoi = sequelize.define('CauHoi', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false,
    field: 'MaCauHoi'
  },
  section: {
    type: DataTypes.STRING(30),
    allowNull: false,
    field: 'PhanMuc' // 'profile', 'personality', 'holland', 'language', 'career_opportunity', 'trust_check'
  },
  audience: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'all', // 'all', 'student', 'freshman'
    field: 'DoiTuong'
  },
  type: {
    type: DataTypes.STRING(30),
    allowNull: false,
    field: 'LoaiCauHoi' // 'likert5', 'single_choice', 'multi_choice', 'ranking', 'forced_choice', 'text'
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'NoiDung'
  },
  options: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'DanhSachLuaChon',
    get() {
      const raw = this.getDataValue('options');
      try {
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('options', typeof val === 'string' ? val : JSON.stringify(val || []));
    }
  },
  scoring: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'QuyTacTinhDiem',
    get() {
      const raw = this.getDataValue('scoring');
      try {
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    set(val) {
      this.setDataValue('scoring', typeof val === 'string' ? val : JSON.stringify(val || null));
    }
  },
  nextRule: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'LuatChuyenBai',
    get() {
      const raw = this.getDataValue('nextRule');
      try {
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    set(val) {
      this.setDataValue('nextRule', typeof val === 'string' ? val : JSON.stringify(val || null));
    }
  },
  version: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '1.0.0',
    field: 'PhienBan'
  },
  orderIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'ThuTuHienThi'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'DangSuDung'
  }
}, {
  tableName: 'nganhang_cauhoi',
  timestamps: false
});

module.exports = CauHoi;

