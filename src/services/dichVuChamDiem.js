/**
 * Dịch vụ chấm điểm và chuẩn hóa thuật toán (Scoring Service)
 * Thực hiện theo đặc tả chuẩn trong tài liệu kỹ thuật:
 * - Nguyên tắc: Cùng câu trả lời + cùng phiên bản thuật toán phải cho ra cùng một kết quả
 * - Chuẩn hóa toàn bộ thành phần về thang điểm 0 - 100
 * - Tự động tái phân bổ trọng số khi thiếu dữ liệu (ví dụ học sinh THPT không có phần việc làm)
 */

// Mỗi hàm nhận câu trả lời và trả về điểm đã tính.
const ScoringService = {
  /**
   * Chấm điểm bài tính cách 4 chiều rút gọn (24 câu forced-choice)
   * Mỗi chiều có 6 câu. Bên nào >= 4 thì chọn cực đó. Hòa 3-3 ghi nhận "chưa rõ" (X).
   * Độ rõ = hiệu số 2 cực (|c1 - c2|, từ 0 đến 6).
   */
  calculatePersonality(answers = []) {
    const counts = {
      E: 0, I: 0,
      S: 0, N: 0,
      T: 0, F: 0,
      J: 0, P: 0
    };

    // Đếm số câu trả lời thuộc mỗi lựa chọn, ví dụ E hoặc I.
    answers.forEach(ans => {
      const val = ans.userAnswer;
      if (counts[val] !== undefined) {
        counts[val] += 1;
      }
    });

    const resolveDimension = (posKey, negKey) => {
      const posCount = counts[posKey];
      const negCount = counts[negKey];
      const diff = Math.abs(posCount - negCount);

      if (posCount >= 4) {
        return { selected: posKey, isUnclear: false, clarity: diff, counts: { [posKey]: posCount, [negKey]: negCount } };
      }
      if (negCount >= 4) {
        return { selected: negKey, isUnclear: false, clarity: diff, counts: { [posKey]: posCount, [negKey]: negCount } };
      }
      // Hòa 3-3: Đánh dấu chưa rõ (X), lưu cả 2 khả năng
      return { selected: 'X', isUnclear: true, clarity: 0, possibilities: [posKey, negKey], counts: { [posKey]: posCount, [negKey]: negCount } };
    };

    const ei = resolveDimension('E', 'I');
    const sn = resolveDimension('S', 'N');
    const tf = resolveDimension('T', 'F');
    const jp = resolveDimension('J', 'P');

    const mbtiType = `${ei.selected}${sn.selected}${tf.selected}${jp.selected}`;
    const unclearCount = [ei, sn, tf, jp].filter(d => d.isUnclear).length;

    // Tính điểm chuẩn hóa độ rõ nét tính cách (0 - 100)
    const totalClarity = ei.clarity + sn.clarity + tf.clarity + jp.clarity; // Max: 6*4 = 24
    const clarityScore = Math.round((totalClarity / 24) * 100);

    return {
      mbtiType,
      dimensions: {
        EI: ei,
        SN: sn,
        TF: tf,
        JP: jp
      },
      counts,
      clarityScore,
      unclearCount,
      shouldTriggerHolland: unclearCount >= 1 // Luật: Từ 1 chiều chưa rõ trở lên kích hoạt Holland
    };
  },

  /**
   * Chấm điểm bài Holland RIASEC (18 câu likert 1-5, 3 câu/nhóm)
   * Chuẩn hóa điểm từng nhóm về thang 0 - 100
   */
  calculateHolland(answers = [], questions = []) {
    const questionMap = new Map();
    questions.forEach(q => questionMap.set(q.id, q));

    const rawScores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    const maxPerGroup = 3 * 5; // 3 câu * 5 điểm = 15

    answers.forEach(ans => {
      const q = questionMap.get(ans.questionId);
      const dimension = q?.scoring?.dimension || ans.dimension;
      let scoreVal = parseInt(ans.userAnswer, 10);
      if (isNaN(scoreVal)) scoreVal = 3;

      if (rawScores[dimension] !== undefined) {
        rawScores[dimension] += scoreVal;
      }
    });

    // Đưa điểm của 6 nhóm về cùng thang 0 - 100 để dễ so sánh.
    const normalizedScores = {};
    Object.keys(rawScores).forEach(key => {
      normalizedScores[key] = Math.round((rawScores[key] / maxPerGroup) * 100);
    });

    // Sắp xếp tìm mã Holland trội nhất (Top 3)
    const sortedGroups = Object.keys(normalizedScores).sort(
      (a, b) => normalizedScores[b] - normalizedScores[a]
    );

    const topCode = sortedGroups.slice(0, 3).join('');
    const averageScore = Math.round(
      Object.values(normalizedScores).reduce((a, b) => a + b, 0) / 6
    );

    return {
      rawScores,
      normalizedScores,
      topTypes: sortedGroups.slice(0, 3),
      topCode,
      averageScore
    };
  },

  /**
   * Chấm điểm bài Ngoại ngữ (chuẩn hóa thang 0 - 100)
   */
  calculateLanguage(answers = [], questions = []) {
    let totalScore = 0;
    let maxPossible = 0;

    answers.forEach(ans => {
      let scoreVal = 0;
      if (typeof ans.userAnswer === 'number') {
        scoreVal = ans.userAnswer;
      } else if (!isNaN(parseFloat(ans.userAnswer))) {
        scoreVal = parseFloat(ans.userAnswer);
      } else {
        scoreVal = ans.isCorrect === true ? 100 : 0;
      }

      totalScore += scoreVal;
      maxPossible += 100;
    });

    const finalScore = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 60;
    return {
      score: Math.min(100, Math.max(0, finalScore)),
      level: finalScore >= 85 ? 'B2+' : finalScore >= 65 ? 'B1' : finalScore >= 45 ? 'A2' : 'A1'
    };
  },

  /**
   * Chấm điểm Năng lực học tập & Profile (chuẩn hóa thang 0 - 100)
   */
  calculateProfile(answers = []) {
    let totalScore = 70; // Mặc định khá
    answers.forEach(ans => {
      if (ans.questionId === 'PROF_GPA_01') {
        const val = parseInt(ans.userAnswer, 10);
        if (!isNaN(val)) totalScore = val;
      }
    });
    return {
      score: totalScore
    };
  },

  /**
   * Chấm điểm Cơ hội việc làm (chuẩn hóa thang 0 - 100)
   */
  calculateCareerOpportunity(answers = []) {
    if (!answers || answers.length === 0) return { score: 75 };

    let total = 0;
    answers.forEach(ans => {
      const val = parseFloat(ans.userAnswer) || 75;
      total += val;
    });
    const avg = Math.round(total / answers.length);
    return {
      score: Math.min(100, Math.max(0, avg))
    };
  },

  /**
   * Tính toán độ tương thích giữa Profile người dùng và một Ngành học cụ thể
   * Áp dụng công thức tổng quát: S = sum(Wi * Pi)
   * Tự động tái phân bổ trọng số nếu thiếu thành phần (ví dụ học sinh THPT không có Career Opportunity)
   */
  calculateFitForMajor({
    major,
    majorProfile,
    hollandResult,
    personalityResult,
    languageResult,
    profileResult,
    careerResult,
    flow = 'main',
    audience = 'student'
  }) {
    // 1. Tính điểm thành phần Holland Fit (0 - 100)
    // Dùng khoảng cách Euclidean / tương quan giữa vector Holland người dùng và hồ sơ chuẩn ngành
    const targetHolland = majorProfile.hollandProfile || { R: 5, I: 5, A: 5, S: 5, E: 5, C: 5 };
    const userHolland = hollandResult?.normalizedScores || { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 };

    let diffSum = 0;
    const keys = ['R', 'I', 'A', 'S', 'E', 'C'];
    keys.forEach(k => {
      const targetVal = (targetHolland[k] || 0) * 10; // thang 0 - 10 chuyển sang 0 - 100
      const userVal = userHolland[k] || 0;
      diffSum += Math.abs(targetVal - userVal);
    });
    const hollandFitScore = Math.max(0, Math.min(100, Math.round(100 - (diffSum / 6) * 0.8)));

    // 2. Tính điểm thành phần Personality Fit (0 - 100)
    const userMbti = personalityResult?.mbtiType || 'XXXX';
    const suitableTypes = majorProfile.personalityFit || [];
    let personalityFitScore = 60; // Mặc định trung bình nếu chưa khớp

    if (suitableTypes.includes(userMbti)) {
      personalityFitScore = 95;
    } else {
      // Đếm số ký tự trùng khớp tối đa với các type phù hợp
      let maxMatch = 0;
      suitableTypes.forEach(t => {
        let match = 0;
        for (let i = 0; i < 4; i++) {
          if (userMbti[i] !== 'X' && userMbti[i] === t[i]) match++;
        };
        if (match > maxMatch) maxMatch = match;
      });
      personalityFitScore = maxMatch === 4 ? 95 : maxMatch === 3 ? 80 : maxMatch === 2 ? 65 : 50;
    }

    // 3. Tính điểm Ngoại ngữ Fit (0 - 100)
    const userLangScore = languageResult?.score || 65;
    let languageFitScore = userLangScore;
    const langMin = majorProfile.languageMin || {};
    if (langMin.isRequired && userLangScore < 50) {
      languageFitScore = Math.round(userLangScore * 0.8); // Giảm điểm nếu ngành đòi hỏi cao mà ngoại ngữ yếu
    }

    // 4. Điểm Năng lực & Môn học (0 - 100)
    const profileFitScore = profileResult?.score || 75;

    // 5. Điểm Cơ hội việc làm (0 - 100)
    const careerFitScore = careerResult?.score || 75;

    // ==========================================
    // 6. XÁC ĐỊNH TRỌNG SỐ VÀ TÁI PHÂN BỔ TRỌNG SỐ
    // ==========================================
    let weights;
    const isStudent = audience === 'student' || !careerResult;

    if (flow === 'flow_b') {
      // Luồng B: Holland 40%, Personality 20%, Profile 15%, Language 15%, Career 10%
      if (isStudent) {
        // Tái phân bổ 10% của Career cho 4 thành phần còn lại (tổng 90%)
        weights = {
          holland: 0.40 / 0.90,     // ~44.4%
          personality: 0.20 / 0.90, // ~22.2%
          profile: 0.15 / 0.90,     // ~16.7%
          language: 0.15 / 0.90,    // ~16.7%
          career: 0
        };
      } else {
        weights = {
          holland: 0.40,
          personality: 0.20,
          profile: 0.15,
          language: 0.15,
          career: 0.10
        };
      }
    } else {
      // Luồng chính: Holland 40%, Personality 30%, Profile 10%, Language 10%, Career 10%
      if (isStudent) {
        // Tái phân bổ 10% của Career cho 4 thành phần còn lại (tổng 90%)
        weights = {
          holland: 0.40 / 0.90,     // ~44.4%
          personality: 0.30 / 0.90, // ~33.3%
          profile: 0.10 / 0.90,     // ~11.1%
          language: 0.10 / 0.90,    // ~11.1%
          career: 0
        };
      } else {
        weights = {
          holland: 0.40,
          personality: 0.30,
          profile: 0.10,
          language: 0.10,
          career: 0.10
        };
      }
    }

    // Điểm cuối là tổng các điểm thành phần nhân với trọng số tương ứng.
    const totalFitScore = Math.round(
      hollandFitScore * weights.holland +
      personalityFitScore * weights.personality +
      profileFitScore * weights.profile +
      languageFitScore * weights.language +
      (isStudent ? 0 : careerFitScore * weights.career)
    );

    // Xác định phân loại và hành động
    let fitLevel = 'Chưa phù hợp';
    let actionRecommendation = '';

    if (totalFitScore >= 75) {
      fitLevel = 'Rất phù hợp';
      actionRecommendation = `Ngành ${major.name} có nhiều điểm tương thích theo bài đánh giá hiện tại. Bạn có thể tìm hiểu thêm chương trình học, môi trường làm việc và trường đào tạo trước khi cân nhắc.`;
    } else if (totalFitScore >= 55) {
      fitLevel = 'Khá phù hợp';
      actionRecommendation = `Ngành ${major.name} có một số điểm tương thích. Hãy xem các điểm mạnh và nội dung cần tìm hiểu thêm để cân nhắc mức độ phù hợp với mình.`;
    } else if (totalFitScore >= 40) {
      fitLevel = 'Phù hợp một phần';
      actionRecommendation = `Bạn có một số điểm tương đồng với ngành ${major.name}. Có thể tham khảo thêm các ngành liên quan (${(majorProfile.relatedMajors || []).join(', ')}) và tìm hiểu thực tế chương trình học, công việc.`;
    } else {
      fitLevel = 'Chưa phù hợp';
      actionRecommendation = `Điểm tương thích với ngành ${major.name} hiện còn hạn chế theo dữ liệu bài test. Bạn có thể tìm hiểu thêm các ngành khác trong danh sách; kết quả không phải kết luận bắt buộc.`;
    }

    // Điểm mạnh & Điểm cần cải thiện
    const strengths = [];
    const improvementAreas = [];

    if (hollandFitScore >= 75) strengths.push('Sở thích nghề nghiệp (Holland) hoàn toàn tương thích');
    if (personalityFitScore >= 75) strengths.push(`Đặc điểm tính cách (${userMbti}) phát huy tối đa trong ngành này`);
    if (languageFitScore >= 70) strengths.push('Năng lực ngoại ngữ đáp ứng tốt chuẩn đầu ra và tài liệu');
    if (profileFitScore >= 75) strengths.push('Nền tảng môn học và tư duy giải quyết vấn đề vững chắc');

    if (hollandFitScore < 60) improvementAreas.push('Cần tìm hiểu thêm về tính chất công việc thực tế');
    if (personalityFitScore < 65) improvementAreas.push('Môi trường làm việc có thể đòi hỏi phong cách giao tiếp khác với thói quen của bạn');
    if (languageFitScore < 60) improvementAreas.push('Cần nâng cao trình độ ngoại ngữ (Tiếng Anh giao tiếp và chuyên ngành)');
    if (profileFitScore < 65) improvementAreas.push('Cần bổ sung kiến thức các môn nền tảng của ngành');

    return {
      majorId: major.id,
      majorName: major.name,
      category: major.category,
      fitScore: totalFitScore,
      fitLevel,
      actionRecommendation,
      componentScores: {
        holland: hollandFitScore,
        personality: personalityFitScore,
        language: languageFitScore,
        profile: profileFitScore,
        career: isStudent ? null : careerFitScore
      },
      weightsUsed: weights,
      strengths: strengths.length > 0 ? strengths : ['Có tinh thần học hỏi và cầu tiến'],
      improvementAreas: improvementAreas.length > 0 ? improvementAreas : ['Tiếp tục duy trì và nâng cao các kỹ năng chuyên môn'],
      careerPaths: majorProfile.careerPaths || [],
      relatedMajors: majorProfile.relatedMajors || []
    };
  }
}

module.exports = ScoringService;

