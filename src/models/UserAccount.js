const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserAccount = sequelize.define('UserAccount', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true, // Cho phép null khi dùng Google/Facebook
  },
  /* [TẠM ẨN - Chức năng Social Login]
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  facebookId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  authProvider: {
    type: DataTypes.STRING,
    defaultValue: 'local', // 'local', 'google', 'facebook'
  },
  */
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user',
  },
}, {
  timestamps: false,
  freezeTableName: true,
});

module.exports = UserAccount;
