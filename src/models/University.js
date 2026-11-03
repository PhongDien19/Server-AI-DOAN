const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const University = sequelize.define('University', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false,
    field: 'MaTruong'
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    field: 'TenTruong'
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'MaTuyenSinh'
  },
  region: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'Mien' // 'Bac', 'Trung', 'Nam'
  },
  province: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'TinhThanh'
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Công lập',
    field: 'LoaiHinh' // 'Công lập', 'Tư thục', 'Quốc tế'
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'TrangWeb'
  },
  tuition: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'HocPhi'
  },
  employmentRate: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'TyLeViecLam' // Tỷ lệ % có việc làm sau tốt nghiệp
  }
}, {
  tableName: 'danhmuc_truong',
  timestamps: false
});

module.exports = University;

