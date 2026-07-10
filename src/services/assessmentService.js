const {
  Taikhoan: UserAccount,
  NguoiDung: UserProfile,
  CauHoi: Question,
  DiemHocSinh,
  DiemNguoiLam,
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

/**
 * Chuẩn hóa một trường text trước khi lưu DB.
 * - Nếu là null/undefined -> trả về null
 * - Nếu là mảng -> nối các phần tử bằng dấu ", "
 * - Nếu là object -> JSON.stringify
 * - Ngược lại -> ép về chuỗi
 */
function normalizeTextField(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    return value.map((v) => (v === null || v === undefined ? '' : String(v))).join(', ');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }
  return String(value);
}

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

  let profile = await UserProfile.findOne({ where: { userId: uid } });
    if (!profile) {
      profile = await UserProfile.create({
        userId: uid,
        fullName: account.email,
        educationLevel: null,
        interests: null,
      });
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
            const careersMap = {};
            for (const c of careers) {
              const cName = c.careerName || 'Ngành học';
              if (!careersMap[cName]) {
                careersMap[cName] = {
                  career: cName,
                  careerName: cName,
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
                    hiringCompanies: [],
                    marketDemand: c.companyDescription || 'Triển vọng phát triển tốt, thu nhập hấp dẫn.'
                  },
                  companyDetails: []
                };
              }
              if (c.companyName) {
                careersMap[cName].workInfo.hiringCompanies.push(c.companyName);
                careersMap[cName].companyDetails.push({
                  companyName: c.companyName,
                  companyDescription: c.companyDescription,
                  careerLink: c.careerLink,
                  basicSalary: c.basicSalary
                });
              }
            }
            // Fallback for hiringCompanies if empty
            for (const cName in careersMap) {
              if (careersMap[cName].workInfo.hiringCompanies.length === 0) {
                careersMap[cName].workInfo.hiringCompanies = ['FPT Software', 'Viettel', 'Các tập đoàn đa quốc gia'];
              }
            }
            evalResult = { compatibleCareers: Object.values(careersMap) };
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

    // --- LƯU ĐIỂM SỐ HỌC TẬP NẾU CÓ academicData ---
    const acadData = ctx.academicData || ctx.userContext?.academicData;
    if (acadData) {
      const isStudent = isStudyingHighSchool(profile.educationLevel);
      if (isStudent && (acadData.type === 'high_school' || acadData.scores)) {
        const scores = acadData.scores || {};
        const getVal = (keys) => {
          for (const k of keys) {
            if (scores[k] !== undefined && scores[k] !== null) return scores[k];
          }
          return null;
        };
        await DiemHocSinh.upsert({
          MaND: profile.id,
          Toan: getVal(['Toán', 'Toan']),
          Van: getVal(['Văn', 'Van']),
          Anh: getVal(['Anh Văn', 'Anh']),
          Ly: getVal(['Lý', 'Ly']),
          Hoa: getVal(['Hoá', 'Hoa']),
          Sinh: getVal(['Sinh']),
          Su: getVal(['Lịch sử', 'Sử', 'Su']),
          Dia: getVal(['Địa lý', 'Địa', 'Dia']),
          GDCD: getVal(['GDCD'])
        });
      } else if (!isStudent) {
        const gpaVal = acadData.gpa ?? acadData.scores?.gpa ?? acadData.scores?.GPA;
        if (gpaVal !== undefined && gpaVal !== null) {
          await DiemNguoiLam.upsert({
            MaND: profile.id,
            GPA: parseFloat(gpaVal) || null
          });
        }
      }
    }

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

        // Lấy điểm đánh giá để lưu vào cột diem
        const diemValue = evaluation.score != null ? parseFloat(evaluation.score.toFixed(2)) : null;

        if (mode === 'Discovery') {
          if (isHighSchool) {
            if (evaluation.compatibleCareers && Array.isArray(evaluation.compatibleCareers)) {
              for (const career of evaluation.compatibleCareers) {
                const careerName = career.careerName || career.career || '';
                const schools = career.trainingInstitutions || career.schools || [];
                if (Array.isArray(schools)) {
                  for (const school of schools) {
                    await KetQuaDiscoveryHoc.create({
                      userId: uid,
                      sessionId: sessionId,
                      careerName: careerName,
                      schoolName: school.schoolName || school.name || '',
                      benchmark2025: school.benchmark2025 || null,
                      benchmark2024: school.benchmark2024 || null,
                      benchmark2023: school.benchmark2023 || null,
                      officialLink: school.officialLink || school.link || null,
                      admissionLink: school.admissionLink || null
                    });
                  }
                }
              }
            }
          } else {
            if (evaluation.compatibleCareers && Array.isArray(evaluation.compatibleCareers)) {
              for (const career of evaluation.compatibleCareers) {
                const careerName = career.careerName || career.career || '';
                const jobDescription = normalizeTextField(career.jobDescription);
                const roles = normalizeTextField(career.roles);
                const outlook = normalizeTextField(career.outlook);
                const requiredSkills = normalizeTextField(career.requiredSkills);

                if (career.companyDetails && Array.isArray(career.companyDetails) && career.companyDetails.length > 0) {
                  for (const comp of career.companyDetails) {
                    await KetQuaDiscoveryLam.create({
                      userId: uid,
                      sessionId: sessionId,
                      careerName: careerName,
                      jobDescription: jobDescription,
                      roles: roles,
                      outlook: outlook,
                      requiredSkills: requiredSkills,
                      companyName: comp.companyName || null,
                      companyDescription: normalizeTextField(comp.companyDescription) || null,
                      careerLink: comp.careerLink || null,
                      basicSalary: comp.basicSalary || null
                    });
                  }
                } else {
                  // Fallback if AI didn't return companyDetails
                  const hiringCompanies = career.workInfo?.hiringCompanies || [];
                  const marketDemand = career.workInfo?.marketDemand || '';
                  const companyName = hiringCompanies.length > 0 ? hiringCompanies[0] : null;

                  await KetQuaDiscoveryLam.create({
                    userId: uid,
                    sessionId: sessionId,
                    careerName: careerName,
                    jobDescription: jobDescription,
                    roles: roles,
                    outlook: outlook,
                    requiredSkills: requiredSkills,
                    companyName: companyName,
                    companyDescription: normalizeTextField(marketDemand),
                    careerLink: null,
                    basicSalary: null
                  });
                }
              }
            }
          }
        } else if (mode === 'Targeted') {
          const targetCareerName = ctx.targetCareer || evaluation.targetCareer || '';
          if (isHighSchool) {
            const schools = evaluation.trainingInstitutions || evaluation.schools || [];
            if (Array.isArray(schools)) {
              for (const school of schools) {
                await KetQuaTargetHoc.create({
                  userId: uid,
                  sessionId: sessionId,
                  diem: diemValue,
                  careerName: targetCareerName,
                  schoolName: school.schoolName || school.name || '',
                  benchmark2025: school.benchmark2025 || null,
                  benchmark2024: school.benchmark2024 || null,
                  benchmark2023: school.benchmark2023 || null,
                  officialLink: school.officialLink || school.link || null,
                  admissionLink: school.admissionLink || null,
                  scoreEvaluation: school.scoreEvaluation || null
                });
              }
            }
          } else {
            const targetCompanies = evaluation.companies || evaluation.companyDetails || [];
            if (Array.isArray(targetCompanies)) {
              for (const comp of targetCompanies) {
                await KetQuaTargetLam.create({
                  userId: uid,
                  sessionId: sessionId,
                  diem: diemValue,
                  careerName: targetCareerName,
                  companyName: comp.companyName || comp.name || '',
                  companyDescription: normalizeTextField(comp.companyDescription || comp.description),
                  careerLink: normalizeTextField(comp.careerLink || comp.link),
                  basicSalary: normalizeTextField(comp.basicSalary || comp.salary),
                  laborMarket: normalizeTextField(comp.laborMarket || evaluation.laborMarket),
                  careerRoadmap: normalizeTextField(comp.careerRoadmap || evaluation.careerRoadmap || comp.roadmap)
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
  profileJson.isStudent = isStudyingHighSchool(profile.educationLevel);

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
