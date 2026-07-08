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
  },
  companyName: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  companyDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  careerLink: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  basicSalary: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  sessionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'sessionId',
  }
}, {
  tableName: 'discovery_lam',
  timestamps: false,
  indexes: [
    {
      name: 'idx_discovery_lam_careerName',
      fields: ['careerName']
    }
  ]
});

module.exports = KetQuaDiscoveryLam;
