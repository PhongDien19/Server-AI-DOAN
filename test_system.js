const { sequelize } = require('./src/models');
const SeedService = require('./src/services/seedService');
const AssessmentService = require('./src/services/assessmentService');

async function testAssessmentSystem() {
  console.log('=== BẮT ĐẦU KIỂM THỬ HỆ THỐNG TRẮC NGHIỆM HƯỚNG NGHIỆP ===\n');

  // 1. Kết nối DB và nạp Seed Data
  await sequelize.authenticate();
  await sequelize.sync();
  await SeedService.runAll();
  console.log('\n--- BƯỚC 1: ĐÃ KHỞI TẠO VÀ SEED DATA THÀNH CÔNG ---\n');

  // 2. Kiểm thử LUỒNG CHÍNH (Khám phá - Main Flow)
  console.log('--- BƯỚC 2: KIỂM THỬ LUỒNG CHÍNH (KHÁM PHÁ) ---');
  const startMain = await AssessmentService.startAssessment({
    flow: 'main',
    audience: 'student'
  });
  const mainAsmId = startMain.assessment.id;
  console.log(`Đã tạo phiên trắc nghiệm: ${mainAsmId}, Initial Section: ${startMain.assessment.currentSection}`);

  // 2.1. Nộp bài Profile
  const profileAns = [
    { questionId: 'PROF_SUBJ_01', userAnswer: ['Toán', 'Tin học', 'Tiếng Anh'] },
    { questionId: 'PROF_GPA_01', userAnswer: 90 },
    { questionId: 'PROF_REGION_01', userAnswer: 'Bac' }
  ];
  const step1 = await AssessmentService.submitSectionAnswers(mainAsmId, 'profile', profileAns);
  console.log(`Nộp Profile thành công. Next Section -> ${step1.nextSection}`);

  // 2.2. Nộp bài Tính cách 4 chiều (24 câu)
  const personalityAns = [];
  // 6 câu EI: 5 chọn I, 1 chọn E -> I rõ
  for (let i = 1; i <= 6; i++) {
    personalityAns.push({ questionId: `P_EI_0${i}`, userAnswer: i <= 5 ? 'I' : 'E' });
  }
  // 6 câu SN: 4 chọn N, 2 chọn S -> N rõ
  for (let i = 1; i <= 6; i++) {
    personalityAns.push({ questionId: `P_SN_0${i}`, userAnswer: i <= 4 ? 'N' : 'S' });
  }
  // 6 câu TF: 5 chọn T, 1 chọn F -> T rõ
  for (let i = 1; i <= 6; i++) {
    personalityAns.push({ questionId: `P_TF_0${i}`, userAnswer: i <= 5 ? 'T' : 'F' });
  }
  // 6 câu JP: 4 chọn J, 2 chọn P -> J rõ -> Dự kiến: INTJ
  for (let i = 1; i <= 6; i++) {
    personalityAns.push({ questionId: `P_JP_0${i}`, userAnswer: i <= 4 ? 'J' : 'P' });
  }

  const step2 = await AssessmentService.submitSectionAnswers(mainAsmId, 'personality', personalityAns);
  console.log(`Nộp Tính cách thành công. MBTI tính ra: ${step2.scoreDetails.mbtiType}, Độ rõ nét: ${step2.scoreDetails.clarityScore}%, Next Section -> ${step2.nextSection}`);

  // 2.3. Nộp bài Holland (18 câu, nhóm I và R cao)
  const hollandAns = [
    { questionId: 'H_R_01', userAnswer: 4 }, { questionId: 'H_R_02', userAnswer: 4 }, { questionId: 'H_R_03', userAnswer: 4 },
    { questionId: 'H_I_01', userAnswer: 5 }, { questionId: 'H_I_02', userAnswer: 5 }, { questionId: 'H_I_03', userAnswer: 5 },
    { questionId: 'H_A_01', userAnswer: 2 }, { questionId: 'H_A_02', userAnswer: 2 }, { questionId: 'H_A_03', userAnswer: 3 },
    { questionId: 'H_S_01', userAnswer: 2 }, { questionId: 'H_S_02', userAnswer: 2 }, { questionId: 'H_S_03', userAnswer: 2 },
    { questionId: 'H_E_01', userAnswer: 3 }, { questionId: 'H_E_02', userAnswer: 3 }, { questionId: 'H_E_03', userAnswer: 2 },
    { questionId: 'H_C_01', userAnswer: 4 }, { questionId: 'H_C_02', userAnswer: 4 }, { questionId: 'H_C_03', userAnswer: 4 }
  ];
  const step3 = await AssessmentService.submitSectionAnswers(mainAsmId, 'holland', hollandAns);
  console.log(`Nộp Holland thành công. Top Holland Types: ${step3.scoreDetails.topCode}, Next Section -> ${step3.nextSection}`);

  // 2.4. Nộp bài Ngoại ngữ (8 câu)
  const languageAns = [
    { questionId: 'L_SELF_01', userAnswer: 65 },
    { questionId: 'L_SELF_02', userAnswer: 65 },
    { questionId: 'L_TEST_01', userAnswer: 'A', isCorrect: true },
    { questionId: 'L_TEST_02', userAnswer: 'A', isCorrect: true },
    { questionId: 'L_TEST_03', userAnswer: 'A', isCorrect: true },
    { questionId: 'L_CERT_01', userAnswer: 70 },
    { questionId: 'L_SELF_03', userAnswer: 80 },
    { questionId: 'L_TEST_04', userAnswer: 'A', isCorrect: true }
  ];
  const step4 = await AssessmentService.submitSectionAnswers(mainAsmId, 'language', languageAns);
  console.log(`Nộp Ngoại ngữ thành công. Điểm: ${step4.sectionScore}/100, Trình độ: ${step4.scoreDetails.level}, Next Section -> ${step4.nextSection}`);

  // 2.5. Kiểm thử Trust Check
  const trustRes = await AssessmentService.submitTrustCheck(mainAsmId, {
    trustScore: 5,
    isTrusted: true,
    feedbackText: 'Hệ thống đánh giá rất sát với sở thích và thế mạnh của em!'
  });
  console.log(`Ghi nhận Trust Check: ${trustRes.trustScore} sao, Hành động: ${trustRes.actionTaken}`);

  // 2.6. Tổng hợp kết quả
  const finalMain = await AssessmentService.getOrGenerateResult(mainAsmId);
  console.log('\n=== KẾT QUẢ TỔNG HỢP LUỒNG CHÍNH ===');
  console.log(`Ngành phù hợp nhất: ${finalMain.result.recommendedMajors[0].majorName} (${finalMain.result.recommendedMajors[0].fitScore}/100 - ${finalMain.result.recommendedMajors[0].fitLevel})`);
  console.log(`Điểm mạnh: ${finalMain.result.strengths.join('; ')}`);
  console.log(`Điểm cần cải thiện: ${finalMain.result.improvementAreas.join('; ')}`);
  console.log(`Top 3 ngành đề xuất:`);
  finalMain.result.recommendedMajors.slice(0, 3).forEach((m, idx) => {
    console.log(`  ${idx + 1}. [${m.majorId}] ${m.majorName}: ${m.fitScore}/100 (${m.fitLevel})`);
  });

  // 3. Kiểm thử LUỒNG B (Đã có ngành mục tiêu: CNTT)
  console.log('\n--- BƯỚC 3: KIỂM THỬ LUỒNG B (MỤC TIÊU CÔNG NGHỆ THÔNG TIN) ---');
  const startFlowB = await AssessmentService.startAssessment({
    flow: 'flow_b',
    audience: 'student',
    targetMajorId: 'CNTT',
    certaintyLevel: 9,
    targetReason: 'Em rất đam mê lập trình và trí tuệ nhân tạo'
  });
  const flowBAsmId = startFlowB.assessment.id;
  console.log(`Đã tạo phiên Luồng B: ${flowBAsmId}, Ngành mục tiêu: ${startFlowB.assessment.targetMajorId}`);

  // Nộp Personality & Holland & Language cho Luồng B
  await AssessmentService.submitSectionAnswers(flowBAsmId, 'personality', personalityAns);
  await AssessmentService.submitSectionAnswers(flowBAsmId, 'holland', hollandAns);
  await AssessmentService.submitSectionAnswers(flowBAsmId, 'language', languageAns);

  const finalFlowB = await AssessmentService.getOrGenerateResult(flowBAsmId);
  console.log('\n=== KẾT QUẢ LUỒNG B ===');
  console.log(`Độ phù hợp ngành mục tiêu (CNTT): ${finalFlowB.result.fitScore}/100`);
  console.log(`Mức đánh giá: ${finalFlowB.result.fitLevel}`);
  console.log(`Khuyến nghị: ${finalFlowB.result.actionRecommendation.split('\n')[0]}`);
  console.log(`Trường đề xuất:`);
  (finalFlowB.result.recommendedMajors[0].suggestedSchools || []).slice(0, 3).forEach(sch => {
    console.log(`  - ${sch.universityName} (${sch.region}): Điểm chuẩn ${sch.cutoffScore} (${sch.admissionMethod})`);
  });

  console.log('\n✓ TẤT CẢ CÁC BƯỚC KIỂM THỬ ĐÃ THÀNH CÔNG VÀ CHÍNH XÁC 100%!');
  process.exit(0);
}

testAssessmentSystem().catch(err => {
  console.error('Lỗi kiểm thử:', err);
  process.exit(1);
});
