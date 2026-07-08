const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const KetQuaTargetHoc = sequelize.define('KetQuaTargetHoc', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'userId',
  },
  diem: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  careerName: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  schoolName: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  benchmark2024: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
  },
  benchmark2023: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
  },
  benchmark2022: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
  },
  officialLink: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  admissionLink: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  sessionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'sessionId',
  }
}, {
  tableName: 'target_hoc',
  timestamps: false,
  indexes: [
    {
      name: 'idx_target_hoc_careerName',
      fields: ['careerName']
    }
  ]
});

module.exports = KetQuaTargetHoc;
