const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const KetQuaDiscoveryLam = sequelize.define('KetQuaDiscoveryLam', {
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
  careerName: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  jobDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  roles: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  outlook: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  requiredSkills: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'discovery_lam',
  timestamps: false,
});

module.exports = KetQuaDiscoveryLam;
