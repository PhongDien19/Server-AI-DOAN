const {
  Taikhoan: UserAccount,
  NguoiDung: UserProfile,
  CauHoi: Question,
  KetQuaDiscoveryHoc,
  KetQuaDiscoveryLam,
  KetQuaTargetHoc,
  KetQuaTargetLam,
  LichSuTest
} = require("../models");
const {
  getSessionContext,
  deleteSessionContext,
  peekPendingEvaluation,
  consumePendingEvaluation,
} = require("./sessionContextStore");

const isStudyingHighSchool = (education) => {
  if (!education) return false;
  const eduLower = String(education).toLowerCase().trim();
  if (eduLower.includes("đại học") || eduLower.includes("đi làm") || eduLower.includes("cao đẳng") || eduLower.includes("tốt nghiệp")) {
    return false;
  }
  return eduLower.includes("thpt") ||
    eduLower.includes("học sinh") ||
    eduLower.includes("cấp 3") ||
    eduLower.includes("đang học");
};

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

  const profile = await UserProfile.findOne({ where: { userId: uid } });
  if (!profile) {
    return { success: false, message: "Không tìm thấy UserProfile" };
  }

  const pending = peekPendingEvaluation(sessionId);
  if (!pending || !pending.evaluation) {
    // Check if questions are already claimed/saved for this user and session
    const existingQ = await Question.findOne({ where: { sessionId, userId: uid } });
    if (existingQ) {
      const testType = existingQ.testType;
      let evalResult = null;
      const isHighSchool = isStudyingHighSchool(profile.educationLevel);
      if (testType === 'career') {
        const testName = existingQ.testName || '';
        const isTarget = testName.toLowerCase().includes('khảo sát nghề') || testName.toLowerCase().includes('mục tiêu') || testName.toLowerCase().includes('targeted');
        if (isTarget) {
          if (isHighSchool) {
            const schools = await KetQuaTargetHoc.findAll({ where: { userId: uid, sessionId } });
            evalResult = {
              trainingInstitutions: schools.map(s => s.toJSON()),
              roadmap: [
                "Giai đoạn 1: Nắm bắt kiến thức cơ bản và kỹ năng tự học nền tảng",
                "Giai đoạn 2: Tham gia hoạt động thực hành, làm đồ án/dự án nhỏ cấp trường",
                "Giai đoạn 3: Chuẩn bị hồ sơ năng lực và ôn luyện cho kỳ thi xét tuyển chuyên ngành"
              ]
            };
          } else {
            const companies = await KetQuaTargetLam.findAll({ where: { userId: uid, sessionId } });
            const first = companies[0] || {};
            evalResult = {
              companies: companies.map(c => c.toJSON()),
              laborMarket: first.laborMarket,
              roadmap: [
                "Giai đoạn 1: Bổ sung các kiến thức nền tảng và tích lũy chứng chỉ bổ trợ chuyên ngành",
                "Giai đoạn 2: Tham gia thiết kế/xây dựng các dự án thực tế hoặc học việc",
                "Giai đoạn 3: Tìm kiếm cơ hội thực tập hoặc ứng tuyển chính thức vào các doanh nghiệp tiêu biểu"
              ]
            };
          }
        } else {
          if (isHighSchool) {
            const schools = await KetQuaDiscoveryHoc.findAll({ where: { userId: uid, sessionId } });
            const careersMap = {};
            for (const sch of schools) {
              const cName = sch.careerName || 'Ngành học';
              if (!careersMap[cName]) {
                careersMap[cName] = {
                  career: cName,
                  careerName: cName,
                  reason: 'Ngành học định hướng tối ưu dựa trên sở thích và hành vi của bạn.',
                  matchRate: 'Cao',
                  studyInfo: {
                    topSchools: []
                  },
                  workInfo: {
                    hiringCompanies: ['FPT Software', 'Viettel', 'Các tập đoàn công nghệ'],
                    marketDemand: 'Nhu cầu tuyển dụng cao, triển vọng phát triển tốt.'
                  },
                  trainingInstitutions: []
                };
              }
              careersMap[cName].studyInfo.topSchools.push(sch.schoolName);
              careersMap[cName].trainingInstitutions.push(sch.toJSON());
            }
            evalResult = { compatibleCareers: Object.values(careersMap) };
          } else {
            const careers = await KetQuaDiscoveryLam.findAll({ where: { userId: uid, sessionId } });
            evalResult = {
              compatibleCareers: careers.map(c => ({
                career: c.careerName,
                careerName: c.careerName,
                reason: 'Ngành nghề định hướng dựa trên phân tích sở thích và hành vi của bạn.',
                matchRate: 'Cao',
                jobDescription: c.jobDescription,
                roles: c.roles,
                outlook: c.outlook,
                requiredSkills: c.requiredSkills,
                studyInfo: {
                  topSchools: ['Đại học Bách Khoa', 'Đại học Quốc Gia', 'Đại học FPT']
                },
                workInfo: {
                  hiringCompanies: ['FPT Software', 'Viettel', 'Các tập đoàn đa quốc gia'],
                  marketDemand: 'Triển vọng phát triển tốt, thu nhập hấp dẫn.'
                }
              }))
            };
          }
        }
      } else {
        evalResult = {};
      }

      const profileJson = {
        fullName: profile.fullName,
        educationLevel: profile.educationLevel,
        interests: profile.interests,
        hobby: profile.interests
      };

      return {
        success: true,
        message: "Bài test này đã được đồng bộ với tài khoản của bạn.",
        evaluation: evalResult,
        profile: profileJson,
      };
    }

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

  // Profile already loaded above

  const interests =
    ctx.hobby != null && String(ctx.hobby).trim() !== ""
      ? { hobbies: ctx.hobby }
      : profile.interests;

  // Xác định loại test từ testName hoặc dữ liệu evaluation
  const testType = determineTestType(testNameSaved, evaluation);

  try {
    const updateData = {
      fullName: (ctx.fullName && String(ctx.fullName).trim()) || profile.fullName,
      educationLevel:
        (ctx.educationLevel && String(ctx.educationLevel).trim()) || profile.educationLevel,
      interests,
    };

    // Cập nhật dữ liệu theo loại test (Không cập nhật thêm trường nào vào profile nữa vì CSDL đã được lược giản)
    switch (testType) {
      case 'career':
      case 'holland':
      case 'personality':
      case 'cognitive':
      case 'values':
        break;
    }

    await profile.update(updateData);

    await Question.update({ userId: uid }, { where: { sessionId } });

    // --- LƯU THÔNG TIN CHI TIẾT VÀO CÁC BẢNG KẾT QUẢ ---
    try {
      // A. Tạo bản ghi lịch sử bài test trong LichSuTest
      let modeLower = 'discovery';
      let scoreVal = null;

      if (testType === 'career') {
        const mode = ctx.mode || 'Discovery';
        if (mode === 'Targeted') {
          modeLower = 'target';
          if (evaluation && evaluation.score != null) {
            scoreVal = parseFloat(evaluation.score);
          }
        }
      }

      await LichSuTest.create({
        userId: uid,
        sessionId: sessionId,
        testMode: modeLower,
        score: scoreVal,
        createdAt: new Date()
      });

      // B. Lưu toàn bộ kết quả phân tích AI chi tiết vào các bảng kết quả tinh gọn mới
      if (testType === 'career') {
        const mode = ctx.mode || 'Discovery';
        const isHighSchool = isStudyingHighSchool(ctx.userContext?.education || profile.educationLevel);

        if (mode === 'Discovery') {
          if (isHighSchool) {
            if (evaluation.compatibleCareers && Array.isArray(evaluation.compatibleCareers)) {
              for (const career of evaluation.compatibleCareers) {
                const careerName = career.careerName || career.career || '';
                if (career.trainingInstitutions && Array.isArray(career.trainingInstitutions)) {
                  for (const school of career.trainingInstitutions) {
                    await KetQuaDiscoveryHoc.create({
                      userId: uid,
                      sessionId: sessionId,
                      careerName: careerName,
                      schoolName: school.schoolName || '',
                      benchmark2024: school.benchmark2024 || null,
                      benchmark2023: school.benchmark2023 || null,
                      benchmark2022: school.benchmark2022 || null,
                      officialLink: school.officialLink || null,
                      admissionLink: school.admissionLink || null
                    });
                  }
                }
              }
            }
          } else {
            if (evaluation.compatibleCareers && Array.isArray(evaluation.compatibleCareers)) {
              for (const career of evaluation.compatibleCareers) {
                let requiredSkillsStr = career.requiredSkills || '';
                if (Array.isArray(requiredSkillsStr)) {
                  requiredSkillsStr = requiredSkillsStr.join(', ');
                }
                await KetQuaDiscoveryLam.create({
                  userId: uid,
                  sessionId: sessionId,
                  careerName: career.careerName || career.career || '',
                  jobDescription: career.jobDescription || null,
                  roles: career.roles || null,
                  outlook: career.outlook || null,
                  requiredSkills: requiredSkillsStr || null
                });
              }
            }
          }
        } else if (mode === 'Targeted') {
          if (isHighSchool) {
            if (evaluation.trainingInstitutions && Array.isArray(evaluation.trainingInstitutions)) {
              for (const school of evaluation.trainingInstitutions) {
                await KetQuaTargetHoc.create({
                  userId: uid,
                  sessionId: sessionId,
                  careerName: targetCareer,
                  schoolName: school.schoolName || '',
                  benchmark2024: school.benchmark2024 || null,
                  benchmark2023: school.benchmark2023 || null,
                  benchmark2022: school.benchmark2022 || null,
                  officialLink: school.officialLink || null,
                  admissionLink: school.admissionLink || null
                });
              }
            }
          } else {
            if (evaluation.companies && Array.isArray(evaluation.companies)) {
              for (const comp of evaluation.companies) {
                await KetQuaTargetLam.create({
                  userId: uid,
                  sessionId: sessionId,
                  careerName: targetCareer,
                  companyName: comp.companyName || '',
                  companyDescription: comp.companyDescription || null,
                  careerLink: comp.careerLink || null,
                  basicSalary: comp.basicSalary || null,
                  laborMarket: comp.laborMarket || null
                });
              }
            }
          }
        }
      }
    } catch (dbErr) {
      console.error("Lỗi khi lưu dữ liệu kết quả vào CSDL:", dbErr);
      // Không chặn luồng chính để đảm bảo hồ sơ cơ bản vẫn được lưu
    }

    consumePendingEvaluation(sessionId);
    deleteSessionContext(sessionId);

    await profile.reload();
  } catch (err) {
    console.error("claimAssessmentResult:", err);
    return { success: false, message: "Lỗi khi lưu kết quả vào CSDL" };
  }

  const profileJson = profile.toJSON();
  profileJson.hobby = profile.interests;

  return {
    success: true,
    message: "Đã lưu điểm và kết quả đánh giá vào hồ sơ",
    evaluation,
    profile: profileJson,
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
