const sequelize = require('../config/database');

// Import tất cả các Models
const Taikhoan = require('./Taikhoan');
const NguoiDung = require('./NguoiDung');
const Assessment = require('./Assessment');
const AssessmentSection = require('./AssessmentSection');
const AssessmentResponse = require('./AssessmentResponse');
const AssessmentResult = require('./AssessmentResult');
const TrustCheck = require('./TrustCheck');
const Question = require('./Question');
const Major = require('./Major');
const MajorProfile = require('./MajorProfile');
const University = require('./University');
const AdmissionScore = require('./AdmissionScore');
const ScoringVersion = require('./ScoringVersion');

// ==========================================
// 1. Mối quan hệ Tài khoản & Người dùng (1 - 1)
// ==========================================
Taikhoan.hasOne(NguoiDung, {
  foreignKey: 'userId',
  as: 'Profile',
  onDelete: 'CASCADE'
});
NguoiDung.belongsTo(Taikhoan, {
  foreignKey: 'userId',
  as: 'Account'
});

// ==========================================
// 2. Mối quan hệ Tài khoản & Phiên đánh giá (1 - N)
// ==========================================
Taikhoan.hasMany(Assessment, {
  foreignKey: 'userId',
  as: 'Assessments',
  onDelete: 'SET NULL'
});
Assessment.belongsTo(Taikhoan, {
  foreignKey: 'userId',
  as: 'Account'
});

// ==========================================
// 3. Mối quan hệ Phiên đánh giá & Các thành phần bài test (1 - N)
// ==========================================
Assessment.hasMany(AssessmentSection, {
  foreignKey: 'assessmentId',
  as: 'Sections',
  onDelete: 'CASCADE'
});
AssessmentSection.belongsTo(Assessment, {
  foreignKey: 'assessmentId',
  as: 'Assessment'
});

// ==========================================
// 4. Mối quan hệ Phiên đánh giá & Câu trả lời (1 - N)
// ==========================================
Assessment.hasMany(AssessmentResponse, {
  foreignKey: 'assessmentId',
  as: 'Responses',
  onDelete: 'CASCADE'
});
AssessmentResponse.belongsTo(Assessment, {
  foreignKey: 'assessmentId',
  as: 'Assessment'
});

// ==========================================
// 5. Mối quan hệ Phiên đánh giá & Kết quả tổng hợp (1 - 1)
// ==========================================
Assessment.hasOne(AssessmentResult, {
  foreignKey: 'assessmentId',
  as: 'Result',
  onDelete: 'CASCADE'
});
AssessmentResult.belongsTo(Assessment, {
  foreignKey: 'assessmentId',
  as: 'Assessment'
});

// ==========================================
// 6. Mối quan hệ Phiên đánh giá & Trust Check (1 - N)
// ==========================================
Assessment.hasMany(TrustCheck, {
  foreignKey: 'assessmentId',
  as: 'TrustChecks',
  onDelete: 'CASCADE'
});
TrustCheck.belongsTo(Assessment, {
  foreignKey: 'assessmentId',
  as: 'Assessment'
});

// ==========================================
// 7. Mối quan hệ Ngành & Hồ sơ năng lực ngành (1 - 1)
// ==========================================
Major.hasOne(MajorProfile, {
  foreignKey: 'majorId',
  as: 'Profile',
  onDelete: 'CASCADE'
});
MajorProfile.belongsTo(Major, {
  foreignKey: 'majorId',
  as: 'Major'
});

// ==========================================
// 8. Mối quan hệ Trường & Điểm chuẩn (1 - N)
// ==========================================
University.hasMany(AdmissionScore, {
  foreignKey: 'universityId',
  as: 'AdmissionScores',
  onDelete: 'CASCADE'
});
AdmissionScore.belongsTo(University, {
  foreignKey: 'universityId',
  as: 'University'
});

// ==========================================
// 9. Mối quan hệ Ngành & Điểm chuẩn (1 - N)
// ==========================================
Major.hasMany(AdmissionScore, {
  foreignKey: 'majorId',
  as: 'AdmissionScores',
  onDelete: 'CASCADE'
});
AdmissionScore.belongsTo(Major, {
  foreignKey: 'majorId',
  as: 'Major'
});

module.exports = {
  sequelize,
  Taikhoan,
  NguoiDung,
  Assessment,
  AssessmentSection,
  AssessmentResponse,
  AssessmentResult,
  TrustCheck,
  Question,
  Major,
  MajorProfile,
  University,
  AdmissionScore,
  ScoringVersion
};
