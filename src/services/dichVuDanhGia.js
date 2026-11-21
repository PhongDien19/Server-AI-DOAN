const {
  PhienDanhGia,
  PhanDanhGia,
  CauTraLoiDanhGia,
  KetQuaDanhGia,
  KiemTraDoTinCay,
  CauHoi,
  NguoiDung,
  Nganh,
  HoSoNganh,
  TruongDaiHoc,
  DiemChuan
} = require('../models/danhSachModel');
const ScoringService = require('./dichVuChamDiem');
const AIService = require('./dichVuAI');
const { SEED_QUESTIONS } = require('../data/duLieuMau');

// Service chứa các bước xử lý bài trắc nghiệm, tách khỏi phần giao tiếp HTTP.
const AssessmentService = {
  /**
   * Khởi tạo phiên làm bài test mới
   */
  async startAssessment({
    userId = null,
    flow = 'main', // 'main' (Khám phá) hoặc 'flow_b' (Đã có ngành mục tiêu)
    audience = 'student', // 'student' (THPT) hoặc 'freshman' (SV năm 1)
    targetMajorId = null,
    certaintyLevel = null,
    targetReason = null
  }) {
    const assessmentId = `asm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const initialSection = flow === 'flow_b' ? 'personality' : 'profile';

    const assessment = await PhienDanhGia.create({
      id: assessmentId,
      userId,
      flow,
      audience,
      targetMajorId,
      certaintyLevel: certaintyLevel ? parseInt(certaintyLevel, 10) : null,
      targetReason,
      currentSection: initialSection,
      completedSections: [],
      status: 'in_progress'
    });

    return {
      success: true,
      assessment: {
        id: assessment.id,
        flow: assessment.flow,
        audience: assessment.audience,
        currentSection: assessment.currentSection,
        targetMajorId: assessment.targetMajorId
      }
    };
  },

  /**
   * Lấy danh sách câu hỏi cho một section cụ thể
   */
  async getQuestionsForSection(assessmentId, sectionType) {
    const assessment = await PhienDanhGia.findByPk(assessmentId);
    if (!assessment) {
      throw new Error('Không tìm thấy phiên đánh giá');
    }

    // Load the standard question bank first; AI may only personalize its wording.
    let questions = await CauHoi.findAll({
      where: {
        section: sectionType,
        isActive: true
      },
      order: [['orderIndex', 'ASC']]
    });

    // Lọc theo audience
    if (questions && questions.length > 0) {
      questions = questions.filter(
        q => q.audience === 'all' || q.audience === assessment.audience
      );
    }

    // 2. Nếu DB chưa có câu hỏi -> Lấy từ ngân hàng SEED_QUESTIONS
    if (!questions || questions.length === 0) {
      questions = SEED_QUESTIONS.filter(q => {
        const matchSec = q.section === sectionType;
        const matchAud = q.audience === 'all' || q.audience === assessment.audience;
        return matchSec && matchAud;
      });
    }

    const profile = assessment.userId
      ? await NguoiDung.findOne({ where: { userId: assessment.userId } })
      : null;
    const targetMajor = assessment.targetMajorId
      ? await Nganh.findByPk(assessment.targetMajorId, {
          include: [{ model: HoSoNganh, as: 'Profile' }]
        })
      : null;
    const questionContext = {
      audience: assessment.audience,
      educationLevel: profile?.educationLevel || null,
      interests: profile?.interests || null,
      targetMajor: targetMajor
        ? {
            name: targetMajor.name,
            category: targetMajor.category,
            description: targetMajor.description,
            profile: targetMajor.Profile
              ? {
                  skillsRequired: targetMajor.Profile.skillsRequired,
                  subjectRequirements: targetMajor.Profile.subjectRequirements,
                  careerPaths: targetMajor.Profile.careerPaths
                }
              : null
          }
        : profile?.targetMajor
          ? { name: profile.targetMajor }
          : null,
      targetReason: assessment.targetReason || null,
      certaintyLevel: assessment.certaintyLevel || null
    };

    const plainQuestions = questions.map(question =>
      typeof question.toJSON === 'function' ? question.toJSON() : question
    );
    const personalizedQuestionTexts =
      await AIService.personalizeAssessmentQuestions({
        section: sectionType,
        questions: plainQuestions,
        context: questionContext
      });
    const finalQuestions = personalizedQuestionTexts
      ? plainQuestions.map(question => ({
          ...question,
          text:
            personalizedQuestionTexts.get(question.id) ??
            question.text
        }))
      : plainQuestions;

    return {
      success: true,
      assessmentId: assessment.id,
      section: sectionType,
      audience: assessment.audience,
      flow: assessment.flow,
      totalQuestions: finalQuestions.length,
      questions: finalQuestions
    };
  },

  /**
   * Nộp câu trả lời cho một section, tính điểm thành phần và xác định section tiếp theo
   */
  async submitSectionAnswers(assessmentId, sectionType, answers = []) {
    const assessment = await PhienDanhGia.findByPk(assessmentId);
    if (!assessment) {
      throw new Error('Không tìm thấy phiên đánh giá');
    }

    // Bước 1: lưu từng câu trả lời vào database.
    for (const ans of answers) {
      await CauTraLoiDanhGia.create({
        assessmentId,
        questionId: ans.questionId,
        section: sectionType,
        userAnswer: typeof ans.userAnswer === 'object' ? JSON.stringify(ans.userAnswer) : String(ans.userAnswer),
        scoreContribution: ans.scoreContribution || null
      });
    }

    // Bước 2: chọn cách tính điểm tùy theo phần trắc nghiệm.
    let sectionScore = 70;
    let scoreDetails = null;

    if (sectionType === 'personality') {
      const pResult = ScoringService.calculatePersonality(answers);
      sectionScore = pResult.clarityScore;
      scoreDetails = pResult;
    } else if (sectionType === 'holland') {
      const hResult = ScoringService.calculateHolland(answers);
      sectionScore = hResult.averageScore;
      scoreDetails = hResult;
    } else if (sectionType === 'language') {
      const languageQuestions = await CauHoi.findAll({
        where: { section: 'language' }
      });
      const questionsById = new Map(
        languageQuestions.map(question => [question.id, question])
      );
      for (const question of SEED_QUESTIONS) {
        if (question.section === 'language' && !questionsById.has(question.id)) {
          questionsById.set(question.id, question);
        }
      }
      const verifiedAnswers = answers.map(answer => {
        const question = questionsById.get(answer.questionId);
        const selectedOption = question?.options?.find(
          option => option.id === String(answer.userAnswer)
        );
        return {
          ...answer,
          isCorrect: selectedOption?.isCorrect === true
        };
      });
      const lResult = ScoringService.calculateLanguage(verifiedAnswers);
      sectionScore = lResult.score;
      scoreDetails = lResult;
    } else if (sectionType === 'career_opportunity') {
      const coResult = ScoringService.calculateCareerOpportunity(answers);
      sectionScore = coResult.score;
      scoreDetails = coResult;
    } else if (sectionType === 'profile') {
      const profResult = ScoringService.calculateProfile(answers);
      sectionScore = profResult.score;
      scoreDetails = profResult;
    }

    // Lưu điểm thành phần vào PhanDanhGia
    await PhanDanhGia.create({
      assessmentId,
      sectionType,
      score: sectionScore,
      scoreDetails,
      completedAt: new Date()
    });

    // Bước 3: ghi nhớ những phần người dùng đã hoàn thành.
    const completed = Array.isArray(assessment.completedSections) ? [...assessment.completedSections] : [];
    if (!completed.includes(sectionType)) {
      completed.push(sectionType);
    }
    assessment.completedSections = completed;

    // Bước 4: chọn phần tiếp theo dựa trên luồng bài và đối tượng.
    let nextSection = null;

    if (assessment.flow === 'flow_b') {
      // --- LUỒNG B (Đã có ngành mong muốn) ---
      // Lộ trình: personality (24 câu) -> holland (18 câu) -> language -> (nếu SV năm 1: career_opportunity) -> trust_check
      if (sectionType === 'personality') {
        nextSection = 'holland';
      } else if (sectionType === 'holland') {
        nextSection = 'language';
      } else if (sectionType === 'language') {
        nextSection = assessment.audience === 'freshman' ? 'career_opportunity' : 'completed';
      } else if (sectionType === 'career_opportunity') {
        nextSection = 'completed';
      }
    } else {
      // --- LUỒNG CHÍNH (Khám phá) ---
      // Lộ trình: profile -> personality -> (kiểm tra rẽ nhánh Holland) -> language -> (SV năm 1: career_opportunity) -> completed
      if (sectionType === 'profile') {
        nextSection = 'personality';
      } else if (sectionType === 'personality') {
        const pDetails = scoreDetails;
        // Luật rẽ nhánh: Nếu có từ 1 chiều tính cách "chưa rõ" (hòa 3-3) trở lên -> Kích hoạt Holland
        if (pDetails && pDetails.shouldTriggerHolland) {
          nextSection = 'holland';
        } else {
          // Nếu đã rõ tính cách, sang thẳng ngoại ngữ
          nextSection = 'holland'; // Vẫn khuyến khích làm Holland để đối sánh đa chiều hoặc sang language
        }
      } else if (sectionType === 'holland') {
        nextSection = 'language';
      } else if (sectionType === 'language') {
        nextSection = assessment.audience === 'freshman' ? 'career_opportunity' : 'completed';
      } else if (sectionType === 'career_opportunity') {
        nextSection = 'completed';
      }
    }

    assessment.currentSection = nextSection || 'completed';
    if (nextSection === 'completed') {
      assessment.status = 'completed';
    }
    await assessment.save();

    return {
      success: true,
      assessmentId,
      submittedSection: sectionType,
      sectionScore,
      scoreDetails,
      nextSection: assessment.currentSection,
      isCompleted: assessment.currentSection === 'completed'
    };
  },

  /**
   * Ghi nhận phản hồi Trust Check và xử lý tiếp theo
   */
  async submitTrustCheck(assessmentId, {
    userId = null,
    section = 'overall',
    trustScore, // 1 đến 5 sao
    isTrusted,
    disagreeReasons = [],
    feedbackText = ''
  }) {
    const assessment = await PhienDanhGia.findByPk(assessmentId);
    if (!assessment) {
      throw new Error('Không tìm thấy phiên đánh giá');
    }

    const numericScore = parseInt(trustScore, 10) || 5;
    const trusted = isTrusted !== undefined ? Boolean(isTrusted) : numericScore >= 3;

    let actionTaken = 'Đã xác nhận kết quả đánh giá tin cậy';
    let suggestedSection = null;

    if (!trusted || numericScore <= 2) {
      // Luật xử lý khi người dùng không tin kết quả:
      const completed = assessment.completedSections || [];
      if (!completed.includes('holland')) {
        actionTaken = 'Đề xuất làm bài trắc nghiệm sở thích nghề nghiệp Holland';
        suggestedSection = 'holland';
      } else if (!completed.includes('language')) {
        actionTaken = 'Đề xuất làm bài đánh giá năng lực ngoại ngữ';
        suggestedSection = 'language';
      } else {
        actionTaken = 'Đã hoàn thành toàn bộ bài test nhưng mức độ tin tưởng thấp. Khuyến nghị đặt lịch trao đổi với giáo viên hoặc chuyên gia hướng nghiệp.';
      }
    }

    const record = await KiemTraDoTinCay.create({
      assessmentId,
      userId: userId || assessment.userId,
      section,
      trustScore: numericScore,
      isTrusted: trusted,
      disagreeReasons,
      feedbackText,
      actionTaken
    });

    assessment.trustScore = numericScore;
    assessment.trustFeedback = feedbackText;
    if (suggestedSection) {
      assessment.currentSection = suggestedSection;
      assessment.status = 'in_progress';
    }
    await assessment.save();

    return {
      success: true,
      trustCheckId: record.id,
      trustScore: numericScore,
      actionTaken,
      suggestedSection
    };
  },

  /**
   * Tổng hợp kết quả toàn diện của bài đánh giá
   */
  async getOrGenerateResult(assessmentId) {
    const assessment = await PhienDanhGia.findByPk(assessmentId);
    if (!assessment) {
      throw new Error('Không tìm thấy phiên đánh giá');
    };

    // Kiểm tra xem kết quả đã được tính và lưu trước đó chưa
    let existingResult = await KetQuaDanhGia.findOne({ where: { assessmentId } });
    if (existingResult) {
      return {
        success: true,
        assessment,
        result: existingResult
      };
    }

    // Gom điểm từng phần để tính độ phù hợp với từng ngành.
    const sections = await PhanDanhGia.findAll({ where: { assessmentId } });
    const sectionMap = {};
    sections.forEach(s => {
      sectionMap[s.sectionType] = s;
    });

    // Lấy thông tin chi tiết từng thành phần
    const pDetails = sectionMap['personality']?.scoreDetails || ScoringService.calculatePersonality([]);
    const hDetails = sectionMap['holland']?.scoreDetails || { normalizedScores: { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 }, topCode: 'IRC' };
    const langScore = sectionMap['language']?.score || 65;
    const profScore = sectionMap['profile']?.score || 75;
    const careerScore = sectionMap['career_opportunity']?.score || null;

    // Lấy danh sách toàn bộ các ngành & hồ sơ năng lực ngành
    const majors = await Nganh.findAll({
      include: [{ model: HoSoNganh, as: 'Profile' }]
    });

    // Tính điểm phù hợp cho tất cả các ngành
    const majorFitList = majors.map(m => {
      const mProfile = m.Profile || {};
      const fit = ScoringService.calculateFitForMajor({
        major: m,
        majorProfile: mProfile,
        hollandResult: hDetails,
        personalityResult: pDetails,
        languageResult: { score: langScore },
        profileResult: { score: profScore },
        careerResult: careerScore !== null ? { score: careerScore } : null,
        flow: assessment.flow,
        audience: assessment.audience
      });
      return fit;
    });

    // Load admission data in one query instead of waiting for a query per major.
    const admissionScores = majors.length
      ? await DiemChuan.findAll({
          where: { majorId: majors.map(major => major.id) },
          include: [{ model: TruongDaiHoc, as: 'University' }]
        })
      : [];
    const scoresByMajor = new Map();
    for (const score of admissionScores) {
      const majorId = String(score.majorId);
      if (!scoresByMajor.has(majorId)) {
        scoresByMajor.set(majorId, []);
      }
      scoresByMajor.get(majorId).push(score);
    }

    for (const fit of majorFitList) {
      fit.suggestedSchools = (scoresByMajor.get(String(fit.majorId)) || [])
        .slice(0, 5)
        .map(as => ({
          universityId: as.universityId,
          universityName: as.TruongDaiHoc?.name || as.universityId,
          region: as.TruongDaiHoc?.region || 'Toàn quốc',
          cutoffScore: as.cutoffScore,
          scoreScale: as.scoreScale,
          admissionMethod: as.admissionMethod,
          sourceUrl: as.sourceUrl
        }));
    }

    // Sắp xếp các ngành theo điểm phù hợp giảm dần
    majorFitList.sort((a, b) => b.fitScore - a.fitScore);

    let primaryFit;
    let recommendedMajors;

    if (assessment.flow === 'flow_b' && assessment.targetMajorId) {
      // Luồng B: Ngành trọng tâm là ngành mục tiêu người dùng đã chọn
      const targetFit = majorFitList.find(item => item.majorId === assessment.targetMajorId) || majorFitList[0];
      primaryFit = targetFit;

      // Danh sách gợi ý gồm: ngành mục tiêu + các ngành liên quan hoặc ngành thay thế
      recommendedMajors = [
        targetFit,
        ...majorFitList.filter(item => item.majorId !== targetFit.majorId).slice(0, 9)
      ];
    } else {
      // Luồng chính: Top 10 ngành có điểm cao nhất
      primaryFit = majorFitList[0] || { fitScore: 75, fitLevel: 'Khá phù hợp', actionRecommendation: '' };
      recommendedMajors = majorFitList.slice(0, 10);
    }

    // Sinh lời khuyên từ AI
    const aiAdvice = await AIService.explainAssessmentResult({
      majorName: primaryFit.majorName,
      fitScore: primaryFit.fitScore,
      strengths: primaryFit.strengths,
      improvementAreas: primaryFit.improvementAreas,
      mbtiType: pDetails.mbtiType,
      hollandCode: hDetails.topCode
    });

    // Lưu kết quả cuối cùng vào DB
    const finalResult = await KetQuaDanhGia.create({
      assessmentId,
      userId: assessment.userId,
      targetMajorId: assessment.targetMajorId,
      fitScore: primaryFit.fitScore,
      fitLevel: primaryFit.fitLevel,
      actionRecommendation: `${primaryFit.actionRecommendation}\n\nLời khuyên chuyên gia: ${aiAdvice}`,
      hollandScores: hDetails,
      personalityScores: pDetails,
      languageScore: langScore,
      profileScore: profScore,
      careerScore: careerScore,
      recommendedMajors,
      strengths: primaryFit.strengths,
      improvementAreas: primaryFit.improvementAreas,
      scoringVersion: 'v1.0.0'
    });

    assessment.status = 'completed';
    assessment.currentSection = 'completed';
    await assessment.save();

    return {
      success: true,
      assessment,
      result: finalResult
    };
  },
};

module.exports = AssessmentService;
