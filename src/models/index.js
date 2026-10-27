const sequelize = require('../config/database');
const Taikhoan = require('./Taikhoan');
const NguoiDung = require('./NguoiDung');

// Mối quan hệ giữa Tài khoản và Người dùng (1 - 1)
Taikhoan.hasOne(NguoiDung, {
  foreignKey: 'userId',
  as: 'Profile',
  onDelete: 'CASCADE'
});

NguoiDung.belongsTo(Taikhoan, {
  foreignKey: 'userId',
  as: 'Account'
});

module.exports = {
  sequelize,
  Taikhoan,
  NguoiDung
};
