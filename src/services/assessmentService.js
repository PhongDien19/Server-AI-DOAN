const UserAccount = require("../models/UserAccount");
const UserProfile = require("../models/UserProfile");
const Question = require("../models/Question");
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
          summary: evaluation.summary,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          advice: evaluation.advice,
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
