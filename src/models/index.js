const sequelize = require('../config/database');

const Taikhoan = require('./Taikhoan');
const NguoiDung = require('./NguoiDung');
const CauHoi = require('./CauHoi');
const Prompt = require('./Prompt');
const SurveyFeedback = require('./SurveyFeedback');
const KetQuaDiscoveryHoc = require('./KetQuaDiscoveryHoc');
const KetQuaDiscoveryLam = require('./KetQuaDiscoveryLam');
const KetQuaTargetHoc = require('./KetQuaTargetHoc');
const KetQuaTargetLam = require('./KetQuaTargetLam');
const DiemHocSinh = require('./DiemHocSinh');
const DiemNguoiLam = require('./DiemNguoiLam');
const LichSuTest = require('./LichSuTest');

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

// Taikhoan <-> LichSuTest (1-n)
Taikhoan.hasMany(LichSuTest, { foreignKey: 'userId', as: 'TestHistories' });
LichSuTest.belongsTo(Taikhoan, { foreignKey: 'userId', as: 'Account' });

// LichSuTest <-> KetQuaDiscoveryHoc (1-n)
LichSuTest.hasMany(KetQuaDiscoveryHoc, { foreignKey: 'sessionId', sourceKey: 'sessionId', as: 'DiscoveryHocDetails' });
KetQuaDiscoveryHoc.belongsTo(LichSuTest, { foreignKey: 'sessionId', targetKey: 'sessionId', as: 'TestHistory' });

// LichSuTest <-> KetQuaDiscoveryLam (1-n)
LichSuTest.hasMany(KetQuaDiscoveryLam, { foreignKey: 'sessionId', sourceKey: 'sessionId', as: 'DiscoveryLamDetails' });
KetQuaDiscoveryLam.belongsTo(LichSuTest, { foreignKey: 'sessionId', targetKey: 'sessionId', as: 'TestHistory' });

// LichSuTest <-> KetQuaTargetHoc (1-n)
LichSuTest.hasMany(KetQuaTargetHoc, { foreignKey: 'sessionId', sourceKey: 'sessionId', as: 'TargetHocDetails' });
KetQuaTargetHoc.belongsTo(LichSuTest, { foreignKey: 'sessionId', targetKey: 'sessionId', as: 'TestHistory' });

// LichSuTest <-> KetQuaTargetLam (1-n)
LichSuTest.hasMany(KetQuaTargetLam, { foreignKey: 'sessionId', sourceKey: 'sessionId', as: 'TargetLamDetails' });
KetQuaTargetLam.belongsTo(LichSuTest, { foreignKey: 'sessionId', targetKey: 'sessionId', as: 'TestHistory' });

module.exports = {
  sequelize,
  Taikhoan,
  NguoiDung,
  CauHoi,
  Prompt,
  SurveyFeedback,
  KetQuaDiscoveryHoc,
  KetQuaDiscoveryLam,
  KetQuaTargetHoc,
  KetQuaTargetLam,
  DiemHocSinh,
  DiemNguoiLam,
  LichSuTest,
};
