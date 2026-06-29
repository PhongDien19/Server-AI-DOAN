const sequelize = require('../config/database');

const Taikhoan = require('./Taikhoan');
const NguoiDung = require('./NguoiDung');
const CauHoi = require('./CauHoi');
const KetQua = require('./KetQua');
const Chatbox = require('./Chatbox');
const Prompt = require('./Prompt');
const DanhMucNganh = require('./DanhMucNganh');
const NgheNghiep = require('./NgheNghiep');
const GoiYNgheNghiep = require('./GoiYNgheNghiep');
const LoTrinhNgheNghiep = require('./LoTrinhNgheNghiep');
const DuLieuThiTruong = require('./DuLieuThiTruong');
const SurveyFeedback = require('./SurveyFeedback'); // Keep existing model for api support

// Define Associations

// Taikhoan <-> NguoiDung (1-1)
Taikhoan.hasOne(NguoiDung, { foreignKey: 'userId', as: 'Profile' });
NguoiDung.belongsTo(Taikhoan, { foreignKey: 'userId', as: 'Account' });

// NguoiDung <-> Chatbox (1-n)
NguoiDung.hasMany(Chatbox, { foreignKey: 'MaND', as: 'Messages' });
Chatbox.belongsTo(NguoiDung, { foreignKey: 'MaND', as: 'User' });

// NguoiDung <-> KetQua (1-n)
NguoiDung.hasMany(KetQua, { foreignKey: 'MaND', as: 'Results' });
KetQua.belongsTo(NguoiDung, { foreignKey: 'MaND', as: 'User' });

// CauHoi <-> KetQua (1-n)
CauHoi.hasMany(KetQua, { foreignKey: 'MaCH', as: 'Results' });
KetQua.belongsTo(CauHoi, { foreignKey: 'MaCH', as: 'Question' });

// DanhMucNganh <-> NgheNghiep (1-n)
DanhMucNganh.hasMany(NgheNghiep, { foreignKey: 'MaDM', as: 'Careers' });
NgheNghiep.belongsTo(DanhMucNganh, { foreignKey: 'MaDM', as: 'Category' });

// NgheNghiep <-> GoiYNgheNghiep (1-n)
NgheNghiep.hasMany(GoiYNgheNghiep, { foreignKey: 'MaNghe', as: 'Recommendations' });
GoiYNgheNghiep.belongsTo(NgheNghiep, { foreignKey: 'MaNghe', as: 'Career' });

// NgheNghiep <-> LoTrinhNgheNghiep (1-n)
NgheNghiep.hasMany(LoTrinhNgheNghiep, { foreignKey: 'MaNganh', as: 'Roadmaps' });
LoTrinhNgheNghiep.belongsTo(NgheNghiep, { foreignKey: 'MaNganh', as: 'Career' });

// NgheNghiep <-> DuLieuThiTruong (1-n)
NgheNghiep.hasMany(DuLieuThiTruong, { foreignKey: 'MaNghe', as: 'MarketData' });
DuLieuThiTruong.belongsTo(NgheNghiep, { foreignKey: 'MaNghe', as: 'Career' });

// KetQua <-> GoiYNgheNghiep (1-n)
KetQua.hasMany(GoiYNgheNghiep, { foreignKey: 'MaKQ', as: 'Recommendations' });
GoiYNgheNghiep.belongsTo(KetQua, { foreignKey: 'MaKQ', as: 'Result' });

// KetQua <-> LoTrinhNgheNghiep (1-n)
KetQua.hasMany(LoTrinhNgheNghiep, { foreignKey: 'MaKQ', as: 'Roadmaps' });
LoTrinhNgheNghiep.belongsTo(KetQua, { foreignKey: 'MaKQ', as: 'Result' });

module.exports = {
  sequelize,
  Taikhoan,
  NguoiDung,
  CauHoi,
  KetQua,
  Chatbox,
  Prompt,
  DanhMucNganh,
  NgheNghiep,
  GoiYNgheNghiep,
  LoTrinhNgheNghiep,
  DuLieuThiTruong,
  SurveyFeedback,
};
