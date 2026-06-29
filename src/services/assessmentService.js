const {
  Taikhoan: UserAccount,
  NguoiDung: UserProfile,
  CauHoi: Question,
  KetQua,
  NgheNghiep,
  DanhMucNganh,
  GoiYNgheNghiep,
  LoTrinhNgheNghiep,
  DuLieuThiTruong
} = require("../models");
const {
  getSessionContext,
  deleteSessionContext,
  peekPendingEvaluation,
  consumePendingEvaluation,
} = require("./sessionContextStore");

/**
 * Gắn kết quả chấm điểm đang chờ với user đã đăng nhập, cập nhật profile và gán userId cho câu hỏi.
 * Lưu ý bảo mật: production nên xác thực JWT thay vì tin userId từ body.
 */
async function claimAssessmentResult(sessionId, userId) {
  if (!sessionId || userId == null) {
    return { success: false, message: "Thiếu sessionId hoặc userId" };
  }

  const uid = Number(userId);
  if (Number.isNaN(uid)) {
    return { success: false, message: "userId không hợp lệ" };
  }

  const account = await UserAccount.findByPk(uid);
  if (!account) {
    return { success: false, message: "Tài khoản không tồn tại" };
  }

  const pending = peekPendingEvaluation(sessionId);
  if (!pending || !pending.evaluation) {
    return {
      success: false,
      message: "Không có kết quả chờ cho phiên này hoặc đã hết hạn. Vui lòng làm lại bài đánh giá.",
    };
  }

  let ctx = pending.contextSnapshot || {};
  const live = getSessionContext(sessionId);
  if (live && typeof live === "object") {
    ctx = { ...ctx, ...live };
  }

  const evaluation = pending.evaluation;
  if (evaluation.error) {
    return { success: false, message: "Kết quả AI không hợp lệ", raw: evaluation };
  }

  const firstQ = await Question.findOne({
    where: { sessionId },
    order: [["order", "ASC"]],
  });
  const testNameSaved = firstQ ? firstQ.testName : null;

  const profile = await UserProfile.findOne({ where: { userId: uid } });
  if (!profile) {
    return { success: false, message: "Không tìm thấy UserProfile" };
  }

  const interests =
    ctx.hobby != null && String(ctx.hobby).trim() !== ""
      ? { hobbies: ctx.hobby }
      : profile.interests;

  // Xác định loại test từ testName hoặc dữ liệu evaluation
  const testType = determineTestType(testNameSaved, evaluation);

  try {
    const updateData = {
      fullName: (ctx.fullName && String(ctx.fullName).trim()) || profile.fullName,
      targetJob: (ctx.targetJob && String(ctx.targetJob).trim()) || profile.targetJob,
      educationLevel:
        (ctx.educationLevel && String(ctx.educationLevel).trim()) || profile.educationLevel,
      interests,
    };

    // Cập nhật dữ liệu theo loại test
    switch (testType) {
      case 'career':
        updateData.careerFitScore = evaluation.score;
        updateData.careerFitResult = {
          ...evaluation,
          testName: testNameSaved || undefined,
        };
        break;

      case 'holland':
        updateData.hollandScores = evaluation.hollandScores;
        updateData.hollandResult = {
          topTypes: evaluation.topTypes,
          summary: evaluation.summary,
          careerSuggestions: evaluation.careerSuggestions,
          advice: evaluation.advice,
          testName: testNameSaved || undefined,
        };
        break;

      case 'personality':
        updateData.personalityScores = evaluation.big5Scores;
        updateData.personalityResult = {
          suggestedMBTI: evaluation.suggestedMBTI,
          personalitySummary: evaluation.personalitySummary,
          strengths: evaluation.strengths,
          careerFit: evaluation.careerFit,
          developmentAdvice: evaluation.developmentAdvice,
          testName: testNameSaved || undefined,
        };
        updateData.mbtiType = evaluation.suggestedMBTI;
        break;

      case 'cognitive':
        updateData.cognitiveScores = evaluation.cognitiveScores;
        updateData.cognitiveResult = {
          overallScore: evaluation.overallScore,
          correctPercentage: evaluation.correctPercentage,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          careerImplications: evaluation.careerImplications,
          improvementSuggestions: evaluation.improvementSuggestions,
          testName: testNameSaved || undefined,
        };
        updateData.cognitiveOverallScore = evaluation.overallScore;
        updateData.cognitiveCorrectPercentage = evaluation.correctPercentage;
        break;

      case 'values':
        updateData.valuesScores = evaluation.valuesScores;
        updateData.valuesResult = {
          topValues: evaluation.topValues,
          valuesSummary: evaluation.valuesSummary,
          workEnvironment: evaluation.workEnvironment,
          advice: evaluation.advice,
          testName: testNameSaved || undefined,
        };
        updateData.topValues = evaluation.topValues;
        updateData.valuesSummary = evaluation.valuesSummary;
        break;
    }

    await profile.update(updateData);

    await Question.update({ userId: uid }, { where: { sessionId } });

    // --- LƯU THÔNG TIN CHI TIẾT VÀO CÁC BẢNG QUAN HỆ (CSDL 11 BẢNG) ---
    try {
        const allSessionQuestions = await Question.findAll({ where: { sessionId } });
        
        // A. Lưu từng câu hỏi và câu trả lời đã trả lời vào bảng KetQua
        const ketQuaRecords = [];
        for (const q of allSessionQuestions) {
            let score = 5.0; // Điểm mặc định
            const ansVal = parseFloat(q.userAnswer);
            if (!isNaN(ansVal)) {
                score = ansVal;
            }

            const kq = await KetQua.create({
                MaCH: q.id,
                CauTL: q.userAnswer || 'Chưa trả lời',
                SoDiem: score,
                MaND: profile.id,
                NgayLamBai: new Date()
            });
            ketQuaRecords.push(kq);
        }

        const firstKq = ketQuaRecords[0];

        if (firstKq) {
            // Tạo mặc định danh mục ngành nghề Công nghệ thông tin
            let dm = await DanhMucNganh.findOne({ where: { TenDM: 'Công nghệ thông tin' } });
            if (!dm) {
                dm = await DanhMucNganh.create({
                    TenDM: 'Công nghệ thông tin',
                    MoTa: 'Lĩnh vực Công nghệ thông tin và Truyền thông',
                    TrangThai: 1
                });
            }

            if (testType === 'career') {
                // Chế độ Discovery: có compatibleCareers
                if (evaluation.compatibleCareers && Array.isArray(evaluation.compatibleCareers)) {
                    for (const item of evaluation.compatibleCareers) {
                        const careerName = item.career;
                        
                        let nghe = await NgheNghiep.findOne({ where: { TenNghe: careerName } });
                        if (!nghe) {
                            nghe = await NgheNghiep.create({
                                MaDM: dm.MaDM,
                                TenNghe: careerName,
                                Slug: careerName.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''),
                                MoTa: item.reason || `Mô tả ngành ${careerName}`,
                                KyNangCT: 'Kỹ năng chuyên môn cốt lõi',
                                TrangThai: 1
                            });
                        }

                        // Lưu gợi ý ngành nghề
                        await GoiYNgheNghiep.create({
                            MaNghe: nghe.MaNghe,
                            MaKQ: firstKq.MaKQ
                        });
                    }
                }

                // Chế độ Target hoặc Discovery có roadmap
                if (evaluation.roadmap && Array.isArray(evaluation.roadmap)) {
                    const targetJob = ctx.targetJob || profile.targetJob || 'Lập trình viên';
                    
                    let nghe = await NgheNghiep.findOne({ where: { TenNghe: targetJob } });
                    if (!nghe) {
                        nghe = await NgheNghiep.create({
                            MaDM: dm.MaDM,
                            TenNghe: targetJob,
                            Slug: targetJob.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''),
                            MoTa: `Định hướng nghề nghiệp mục tiêu: ${targetJob}`,
                            KyNangCT: 'Các kỹ năng nghiệp vụ chính',
                            TrangThai: 1
                        });
                    }

                    // Lưu gợi ý nghề mục tiêu
                    await GoiYNgheNghiep.create({
                        MaNghe: nghe.MaNghe,
                        MaKQ: firstKq.MaKQ
                    });

                    // Lưu lộ trình chi tiết từng giai đoạn
                    for (let idx = 0; idx < evaluation.roadmap.length; idx++) {
                        await LoTrinhNgheNghiep.create({
                            MaNganh: nghe.MaNghe,
                            MaKQ: firstKq.MaKQ,
                            TieuDe: `Giai đoạn ${idx + 1}`,
                            MoTa: evaluation.roadmap[idx]
                        });
                    }

                    // Lưu dữ liệu thị trường (Mức lương & Thông tin thị trường lao động)
                    if (evaluation.basicSalary) {
                        await DuLieuThiTruong.create({
                            MaNghe: nghe.MaNghe,
                            Loai: 'Lương',
                            TieuDe: 'Mức lương trung bình',
                            GiaTri: evaluation.basicSalary,
                            NgayCapNhat: new Date()
                        });
                    }
                    if (evaluation.laborMarket) {
                        await DuLieuThiTruong.create({
                            MaNghe: nghe.MaNghe,
                            Loai: 'Thị trường',
                            TieuDe: 'Nhu cầu nhân lực',
                            GiaTri: evaluation.laborMarket,
                            NgayCapNhat: new Date()
                        });
                    }
                }
            } else if (testType === 'holland') {
                if (evaluation.careerSuggestions && Array.isArray(evaluation.careerSuggestions)) {
                    for (const careerName of evaluation.careerSuggestions) {
                        let nghe = await NgheNghiep.findOne({ where: { TenNghe: careerName } });
                        if (!nghe) {
                            nghe = await NgheNghiep.create({
                                MaDM: dm.MaDM,
                                TenNghe: careerName,
                                Slug: careerName.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''),
                                MoTa: `Gợi ý nghề từ trắc nghiệm RIASEC`,
                                KyNangCT: 'Kỹ năng RIASEC liên quan',
                                TrangThai: 1
                            });
                        }

                        await GoiYNgheNghiep.create({
                            MaNghe: nghe.MaNghe,
                            MaKQ: firstKq.MaKQ
                        });
                    }
                }
            }
        }
    } catch (dbErr) {
        console.error("Lỗi khi lưu dữ liệu quan hệ vào CSDL:", dbErr);
        // Không chặn luồng chính để đảm bảo hồ sơ cơ bản vẫn được lưu
    }

    consumePendingEvaluation(sessionId);
    deleteSessionContext(sessionId);

    await profile.reload();
  } catch (err) {
    console.error("claimAssessmentResult:", err);
    return { success: false, message: "Lỗi khi lưu kết quả vào CSDL" };
  }

  return {
    success: true,
    message: "Đã lưu điểm và kết quả đánh giá vào hồ sơ",
    evaluation,
    profile: profile.toJSON(),
  };
}

/**
 * Xác định loại test từ testName hoặc dữ liệu evaluation
 */
function determineTestType(testName, evaluation) {
  if (!testName) return 'career';

  const name = testName.toLowerCase();

  if (name.includes('holland') || evaluation.hollandScores) {
    return 'holland';
  }

  if (name.includes('personality') || name.includes('big 5') || name.includes('mbti') || evaluation.big5Scores) {
    return 'personality';
  }

  if (name.includes('cognitive') || name.includes('năng lực') || evaluation.cognitiveScores) {
    return 'cognitive';
  }

  if (name.includes('values') || name.includes('giá trị') || evaluation.valuesScores) {
    return 'values';
  }

  return 'career'; // Default
}

module.exports = { claimAssessmentResult };
