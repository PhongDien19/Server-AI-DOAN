const sequelize = require('../config/database');

const Taikhoan = require('./Taikhoan');
const NguoiDung = require('./NguoiDung');
const CauHoi = require('./CauHoi');
const KetQua = require('./KetQua');
const Chatbox = require('./Chatbox');
const Prompt = require('./Prompt');
const SurveyFeedback = require('./SurveyFeedback');
const KetQuaDiscoveryHoc = require('./KetQuaDiscoveryHoc');
const KetQuaDiscoveryLam = require('./KetQuaDiscoveryLam');
const KetQuaTargetHoc = require('./KetQuaTargetHoc');
const KetQuaTargetLam = require('./KetQuaTargetLam');
const DiemHocSinh = require('./DiemHocSinh');
const DiemNguoiLam = require('./DiemNguoiLam');

// Define Associations

// Taikhoan <-> NguoiDung (1-1)
Taikhoan.hasOne(NguoiDung, { foreignKey: 'userId', as: 'Profile' });
NguoiDung.belongsTo(Taikhoan, { foreignKey: 'userId', as: 'Account' });

// NguoiDung <-> DiemHocSinh (1-1)
NguoiDung.hasOne(DiemHocSinh, { foreignKey: 'MaND', as: 'StudentScores' });
DiemHocSinh.belongsTo(NguoiDung, { foreignKey: 'MaND', as: 'Profile' });

// NguoiDung <-> DiemNguoiLam (1-1)
NguoiDung.hasOne(DiemNguoiLam, { foreignKey: 'MaND', as: 'WorkerScores' });
DiemNguoiLam.belongsTo(NguoiDung, { foreignKey: 'MaND', as: 'Profile' });

// NguoiDung <-> Chatbox (1-n)
NguoiDung.hasMany(Chatbox, { foreignKey: 'MaND', as: 'Messages' });
Chatbox.belongsTo(NguoiDung, { foreignKey: 'MaND', as: 'User' });

// NguoiDung <-> KetQua (1-n)
NguoiDung.hasMany(KetQua, { foreignKey: 'MaND', as: 'Results' });
KetQua.belongsTo(NguoiDung, { foreignKey: 'MaND', as: 'User' });

// CauHoi <-> KetQua (1-n)
CauHoi.hasMany(KetQua, { foreignKey: 'MaCH', as: 'Results' });
KetQua.belongsTo(CauHoi, { foreignKey: 'MaCH', as: 'Question' });

// Taikhoan <-> KetQuaDiscoveryHoc (1-n)
Taikhoan.hasMany(KetQuaDiscoveryHoc, { foreignKey: 'userId', as: 'DiscoveryHocResults' });
KetQuaDiscoveryHoc.belongsTo(Taikhoan, { foreignKey: 'userId', as: 'Account' });

// Taikhoan <-> KetQuaDiscoveryLam (1-n)
Taikhoan.hasMany(KetQuaDiscoveryLam, { foreignKey: 'userId', as: 'DiscoveryLamResults' });
KetQuaDiscoveryLam.belongsTo(Taikhoan, { foreignKey: 'userId', as: 'Account' });

// Taikhoan <-> KetQuaTargetHoc (1-n)
Taikhoan.hasMany(KetQuaTargetHoc, { foreignKey: 'userId', as: 'TargetHocResults' });
KetQuaTargetHoc.belongsTo(Taikhoan, { foreignKey: 'userId', as: 'Account' });

// Taikhoan <-> KetQuaTargetLam (1-n)
Taikhoan.hasMany(KetQuaTargetLam, { foreignKey: 'userId', as: 'TargetLamResults' });
KetQuaTargetLam.belongsTo(Taikhoan, { foreignKey: 'userId', as: 'Account' });

module.exports = {
  sequelize,
  Taikhoan,
  NguoiDung,
  CauHoi,
  KetQua,
  Chatbox,
  Prompt,
  SurveyFeedback,
  KetQuaDiscoveryHoc,
  KetQuaDiscoveryLam,
  KetQuaTargetHoc,
  KetQuaTargetLam,
  DiemHocSinh,
  DiemNguoiLam,
};
