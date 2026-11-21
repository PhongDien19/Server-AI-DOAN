const CHANGE_THRESHOLD = 5;
const SHORT_INTERVAL_DAYS = 3;
const HOLLAND_TYPES = ['R', 'I', 'A', 'S', 'E', 'C'];
const PERSONALITY_DIMENSIONS = [
  { code: 'EI', label: 'E/I', first: 'E', second: 'I' },
  { code: 'SN', label: 'S/N', first: 'S', second: 'N' },
  { code: 'TF', label: 'T/F', first: 'T', second: 'F' },
  { code: 'JP', label: 'J/P', first: 'J', second: 'P' }
];
const COMPONENT_LABELS = {
  language: 'Ngoại ngữ',
  profile: 'Học tập',
  career: 'Cơ hội nghề nghiệp'
};

const asObject = value => {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch (error) {
      return {};
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
};

const asArray = value => {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch (error) {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
};

const asNumber = value => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const rounded = value => Math.round(value * 10) / 10;

const changeColor = direction => {
  if (direction === 'increase') return 'green';
  if (direction === 'decrease') return 'red';
  return 'gray';
};

const compareScore = (previousValue, currentValue) => {
  const previous = asNumber(previousValue);
  const current = asNumber(currentValue);
  if (previous === null || current === null) {
    return {
      previous,
      current,
      difference: null,
      direction: 'unavailable',
      color: 'gray'
    };
  }

  const difference = rounded(current - previous);
  const direction = Math.abs(difference) < CHANGE_THRESHOLD
    ? 'stable'
    : difference > 0
      ? 'increase'
      : 'decrease';

  return {
    previous: rounded(previous),
    current: rounded(current),
    difference,
    direction,
    color: changeColor(direction)
  };
};

const getMajorKey = major => {
  const id = major.majorId ?? major.id;
  if (id !== null && id !== undefined) return String(id);
  return String(major.majorName || '').trim().toLocaleLowerCase('vi');
};

const getMajorName = major => major.majorName || major.name || 'Ngành chưa có tên';

const summarizeMajor = major => ({
  majorId: major.majorId || major.id || null,
  majorName: getMajorName(major),
  fitScore: asNumber(major.fitScore)
});

const getHollandScores = result => {
  const holland = asObject(result.hollandScores);
  return asObject(holland.normalizedScores);
};

const getPersonalityType = result => {
  const type = asObject(result.personalityScores).mbtiType;
  return typeof type === 'string' && /^[EIX][SNX][TFX][JPX]$/.test(type) && type !== 'XXXX'
    ? type
    : null;
};

const buildScoreSummary = (label, score) => {
  if (score.direction === 'unavailable') {
    return `${label}: chưa đủ dữ liệu để so sánh.`;
  }
  if (score.direction === 'stable') {
    return `${label} nhìn chung ổn định (${score.previous}% → ${score.current}%).`;
  }
  const verb = score.direction === 'increase' ? 'tăng' : 'giảm';
  return `${label} ${verb} từ ${score.previous}% lên ${score.current}% (chênh ${Math.abs(score.difference)} điểm).`;
};

const compareAssessments = ({
  previousAssessment,
  currentAssessment,
  previousResult,
  currentResult
}) => {
  const scores = {
    fit: compareScore(previousResult.fitScore, currentResult.fitScore),
    language: compareScore(previousResult.languageScore, currentResult.languageScore),
    profile: compareScore(previousResult.profileScore, currentResult.profileScore),
    career: compareScore(previousResult.careerScore, currentResult.careerScore)
  };

  const componentChanges = ['language', 'profile', 'career']
    .map(key => ({
      key,
      label: COMPONENT_LABELS[key],
      ...scores[key]
    }));
  const improvements = componentChanges
    .filter(item => item.direction === 'increase')
    .sort((a, b) => b.difference - a.difference);
  const declines = componentChanges
    .filter(item => item.direction === 'decrease')
    .sort((a, b) => a.difference - b.difference);
  const mostImproved = improvements[0] || null;
  const mostDeclined = declines[0] || null;

  const previousHolland = getHollandScores(previousResult);
  const currentHolland = getHollandScores(currentResult);
  const previousHollandCode = asObject(previousResult.hollandScores).topCode || null;
  const currentHollandCode = asObject(currentResult.hollandScores).topCode || null;
  const hollandScores = Object.fromEntries(
    HOLLAND_TYPES.map(type => [
      type,
      compareScore(previousHolland[type], currentHolland[type])
    ])
  );
  const hollandChanged = previousHollandCode && currentHollandCode
    ? previousHollandCode !== currentHollandCode
    : null;

  const previousPersonalityType = getPersonalityType(previousResult);
  const currentPersonalityType = getPersonalityType(currentResult);
  const changedDimensions = previousPersonalityType && currentPersonalityType
    ? PERSONALITY_DIMENSIONS.flatMap((dimension, index) => {
        const from = previousPersonalityType[index];
        const to = currentPersonalityType[index];
        return from === to ? [] : [{
          dimension: dimension.label,
          from,
          to
        }];
      })
    : [];
  const personalityChanged = previousPersonalityType && currentPersonalityType
    ? previousPersonalityType !== currentPersonalityType
    : null;

  const previousMajors = asArray(previousResult.recommendedMajors);
  const currentMajors = asArray(currentResult.recommendedMajors);
  const previousByKey = new Map(previousMajors.map(major => [getMajorKey(major), major]));
  const currentByKey = new Map(currentMajors.map(major => [getMajorKey(major), major]));
  const newlyRecommended = currentMajors
    .filter(major => !previousByKey.has(getMajorKey(major)))
    .map(summarizeMajor);
  const noLongerRecommended = previousMajors
    .filter(major => !currentByKey.has(getMajorKey(major)))
    .map(summarizeMajor);
  const retainedMajors = currentMajors
    .filter(major => previousByKey.has(getMajorKey(major)))
    .map(major => {
      const previousMajor = previousByKey.get(getMajorKey(major));
      const fit = compareScore(previousMajor.fitScore, major.fitScore);
      return {
        majorId: major.majorId || major.id || null,
        majorName: getMajorName(major),
        previousFitScore: fit.previous,
        currentFitScore: fit.current,
        difference: fit.difference,
        direction: fit.direction,
        color: fit.color
      };
    })
    .sort((a, b) => (b.currentFitScore ?? -1) - (a.currentFitScore ?? -1));

  const previousDate = new Date(previousAssessment.createdAt);
  const currentDate = new Date(currentAssessment.createdAt);
  const elapsedMilliseconds = Math.abs(currentDate - previousDate);
  const daysBetween = Number.isFinite(elapsedMilliseconds)
    ? rounded(elapsedMilliseconds / (24 * 60 * 60 * 1000))
    : null;
  const shortInterval = daysBetween !== null && daysBetween < SHORT_INTERVAL_DAYS;

  let stability;
  if (hollandChanged === null || personalityChanged === null) {
    stability = 'Chưa đủ dữ liệu để nhận xét mức ổn định về sở thích và tính cách.';
  } else if (!hollandChanged && !personalityChanged) {
    stability = `Mã Holland ${currentHollandCode} và MBTI ${currentPersonalityType} giữ nguyên; sở thích và tính cách có vẻ khá ổn định qua hai lần làm.`;
  } else {
    const observations = [];
    if (hollandChanged) {
      observations.push(`Mã Holland đổi từ ${previousHollandCode} sang ${currentHollandCode}; sở thích có thể đang thay đổi.`);
    } else {
      observations.push(`Mã Holland ${currentHollandCode} giữ nguyên.`);
    }
    if (personalityChanged) {
      observations.push(`MBTI đổi từ ${previousPersonalityType} sang ${currentPersonalityType}${changedDimensions.length ? ` (${changedDimensions.map(item => `${item.dimension}: ${item.from} → ${item.to}`).join(', ')})` : ''}.`);
    } else {
      observations.push(`MBTI ${currentPersonalityType} giữ nguyên.`);
    }
    stability = observations.join(' ');
  }

  const majorGuidance = [];
  if (retainedMajors.length) {
    majorGuidance.push(
      `Các ngành xuất hiện ở cả hai lần nên được ưu tiên cân nhắc: ${retainedMajors.map(major => major.majorName).join(', ')}.`
    );
  } else {
    majorGuidance.push('Hai lần làm chưa có ngành gợi ý nào trùng nhau để ưu tiên.');
  }
  if (newlyRecommended.length || noLongerRecommended.length) {
    majorGuidance.push('Ngành mới xuất hiện hoặc không còn trong danh sách chỉ nên xem là gợi ý để tìm hiểu thêm.');
  }

  const highlights = {
    mostImproved: mostImproved
      ? { key: mostImproved.key, label: mostImproved.label, difference: mostImproved.difference }
      : null,
    mostDeclined: mostDeclined
      ? { key: mostDeclined.key, label: mostDeclined.label, difference: mostDeclined.difference }
      : null
  };
  const highlightText = [];
  if (mostImproved) {
    highlightText.push(`${mostImproved.label} tiến bộ nhiều nhất (+${mostImproved.difference} điểm).`);
  }
  if (mostDeclined) {
    highlightText.push(`${mostDeclined.label} giảm nhiều nhất (${mostDeclined.difference} điểm).`);
  }
  if (!mostImproved && !mostDeclined) {
    highlightText.push('Ngoại ngữ, học tập và cơ hội nghề nghiệp chưa có thay đổi đủ lớn để xem là tăng hoặc giảm.');
  }

  return {
    threshold: CHANGE_THRESHOLD,
    previous: {
      assessmentId: previousAssessment.id,
      assessedAt: previousAssessment.createdAt,
      fitScore: scores.fit.previous
    },
    current: {
      assessmentId: currentAssessment.id,
      assessedAt: currentAssessment.createdAt,
      fitScore: scores.fit.current
    },
    interval: {
      days: daysBetween,
      isShort: shortInterval,
      note: shortInterval ? 'Khoảng cách thời gian ngắn có thể chưa tạo ra nhiều thay đổi.' : null
    },
    scores,
    trend: {
      direction: scores.fit.direction,
      color: scores.fit.color,
      text: buildScoreSummary('Mức độ phù hợp', scores.fit)
    },
    highlights: {
      ...highlights,
      text: highlightText.join(' ')
    },
    holland: {
      previousCode: previousHollandCode,
      currentCode: currentHollandCode,
      changed: hollandChanged,
      scores: hollandScores
    },
    personality: {
      previousType: previousPersonalityType,
      currentType: currentPersonalityType,
      changed: personalityChanged,
      changedDimensions
    },
    stability,
    majors: {
      newlyRecommended,
      noLongerRecommended,
      retained: retainedMajors,
      guidance: majorGuidance.join(' ')
    },
    summaries: {
      language: buildScoreSummary('Ngoại ngữ', scores.language),
      profile: buildScoreSummary('Học tập', scores.profile),
      career: buildScoreSummary('Cơ hội nghề nghiệp', scores.career)
    },
    shortIntervalNote: shortInterval
      ? 'Hai bài test cách nhau chưa tới vài ngày, nên khoảng cách thời gian ngắn có thể chưa làm thay đổi nhiều.'
      : null,
    disclaimer: 'Kết quả chỉ mang tính tham khảo, không phải phép đo chính xác tuyệt đối và không bắt buộc bạn phải làm theo gợi ý của ứng dụng.'
  };
};

module.exports = {
  CHANGE_THRESHOLD,
  compareAssessments
};
