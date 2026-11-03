const {
  Assessment,
  AssessmentSection,
  AssessmentResponse,
  AssessmentResult,
  TrustCheck,
  Question,
  Major,
  MajorProfile,
  University,
  AdmissionScore
} = require('../models');
const ScoringService = require('./scoringService');
const AIService = require('./aiService');
const { SEED_QUESTIONS } = require('../data/seedData');

class AssessmentService {
  /**
   * Khởi tạo phiên làm bài test mới
   */
  static async startAssessment({
    userId = null,
    flow = 'main', // 'main' (Khám phá) hoặc 'flow_b' (Đã có ngành mục tiêu)
    audience = 'student', // 'student' (THPT) hoặc 'freshman' (SV năm 1)
    targetMajorId = null,
    certaintyLevel = null,
    targetReason = null
  }) {
    const assessmentId = `asm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const initialSection = flow === 'flow_b' ? 'personality' : 'profile';

    const assessment = await Assessment.create({
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
  }

  /**
   * Lấy danh sách câu hỏi cho một section cụ thể
   */
  static async getQuestionsForSection(assessmentId, sectionType) {
    const assessment = await Assessment.findByPk(assessmentId);
    if (!assessment) {
      throw new Error('Không tìm thấy phiên đánh giá');
    }

    // 1. Thử lấy câu hỏi từ Database
    let questions = await Question.findAll({
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

    return {
      success: true,
      assessmentId,
      section: sectionType,
      audience: assessment.audience,
      flow: assessment.flow,
      totalQuestions: questions.length,
      questions
    };
  }

  /**
   * Nộp câu trả lời cho một section, tính điểm thành phần và xác định section tiếp theo
   */
  static async submitSectionAnswers(assessmentId, sectionType, answers = []) {
    const assessment = await Assessment.findByPk(assessmentId);
    if (!assessment) {
      throw new Error('Không tìm thấy phiên đánh giá');
    }

    // 1. Lưu các câu trả lời của người dùng
    for (const ans of answers) {
      await AssessmentResponse.create({
        assessmentId,
        questionId: ans.questionId,
        section: sectionType,
        userAnswer: typeof ans.userAnswer === 'object' ? JSON.stringify(ans.userAnswer) : String(ans.userAnswer),
        scoreContribution: ans.scoreContribution || null
      });
    }

    // 2. Tính điểm thành phần theo từng loại bài test
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
      const lResult = ScoringService.calculateLanguage(answers);
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

    // Lưu điểm thành phần vào AssessmentSection
    await AssessmentSection.create({
      assessmentId,
      sectionType,
      score: sectionScore,
      scoreDetails,
      completedAt: new Date()
    });

    // 3. Cập nhật danh sách completedSections
    const completed = Array.isArray(assessment.completedSections) ? [...assessment.completedSections] : [];
    if (!completed.includes(sectionType)) {
      completed.push(sectionType);
    }
    assessment.completedSections = completed;

    // 4. Áp dụng Luật chuyển bài (Adaptive Navigation Rules)
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
  }

  /**
   * Ghi nhận phản hồi Trust Check và xử lý tiếp theo
   */
  static async submitTrustCheck(assessmentId, {
    userId = null,
    section = 'overall',
    trustScore, // 1 đến 5 sao
    isTrusted,
    disagreeReasons = [],
    feedbackText = ''
  }) {
    const assessment = await Assessment.findByPk(assessmentId);
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

    const record = await TrustCheck.create({
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
  }

  /**
   * Tổng hợp kết quả toàn diện của bài đánh giá
   */
  static async getOrGenerateResult(assessmentId) {
    const assessment = await Assessment.findByPk(assessmentId);
    if (!assessment) {
      throw new Error('Không tìm thấy phiên đánh giá');
    }

    // Kiểm tra xem kết quả đã được tính và lưu trước đó chưa
    let existingResult = await AssessmentResult.findOne({ where: { assessmentId } });
    if (existingResult) {
      return {
        success: true,
        assessment,
        result: existingResult
      };
    }

    // Lấy tất cả các sections đã hoàn thành
    const sections = await AssessmentSection.findAll({ where: { assessmentId } });
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
    const majors = await Major.findAll({
      include: [{ model: MajorProfile, as: 'Profile' }]
    });

    // Tính điểm phù hợp cho tất cả các ngành
    const majorFitList = [];
    for (const m of majors) {
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

      // Lấy danh sách các trường đại học tiêu biểu đào tạo ngành này kèm điểm chuẩn
      const admissionScores = await AdmissionScore.findAll({
        where: { majorId: m.id },
        include: [{ model: University, as: 'University' }],
        limit: 5
      });

      fit.suggestedSchools = admissionScores.map(as => ({
        universityId: as.universityId,
        universityName: as.University?.name || as.universityId,
        region: as.University?.region || 'Toàn quốc',
        cutoffScore: as.cutoffScore,
        scoreScale: as.scoreScale,
        admissionMethod: as.admissionMethod,
        sourceUrl: as.sourceUrl
      }));

      majorFitList.push(fit);
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
        ...majorFitList.filter(item => item.majorId !== targetFit.majorId).slice(0, 4)
      ];
    } else {
      // Luồng chính: Top 3 - 5 ngành có điểm cao nhất
      primaryFit = majorFitList[0] || { fitScore: 75, fitLevel: 'Khá phù hợp', actionRecommendation: '' };
      recommendedMajors = majorFitList.slice(0, 5);
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
    const finalResult = await AssessmentResult.create({
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
  }
}

module.exports = AssessmentService;

