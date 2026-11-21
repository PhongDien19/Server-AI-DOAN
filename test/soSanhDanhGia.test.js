const test = require('node:test');
const assert = require('node:assert/strict');
const { compareAssessments } = require('../src/services/dichVuSoSanhDanhGia');

const makeAssessment = (id, createdAt) => ({ id, createdAt });
const makeResult = ({
  fitScore,
  languageScore,
  profileScore,
  careerScore,
  hollandCode = 'RIA',
  holland = { R: 70, I: 60, A: 50, S: 40, E: 30, C: 20 },
  mbtiType = 'ENTJ',
  majors = []
}) => ({
  fitScore,
  languageScore,
  profileScore,
  careerScore,
  hollandScores: { topCode: hollandCode, normalizedScores: holland },
  personalityScores: { mbtiType },
  recommendedMajors: majors
});

test('classifies small score differences as stable and highlights the biggest component change', () => {
  const result = compareAssessments({
    previousAssessment: makeAssessment('older', '2026-11-01T10:00:00Z'),
    currentAssessment: makeAssessment('newer', '2026-11-06T10:00:00Z'),
    previousResult: makeResult({ fitScore: 62, languageScore: 60, profileScore: 70, careerScore: 65 }),
    currentResult: makeResult({ fitScore: 73, languageScore: 75, profileScore: 72, careerScore: 60 })
  });

  assert.equal(result.trend.direction, 'increase');
  assert.equal(result.trend.color, 'green');
  assert.equal(result.scores.fit.difference, 11);
  assert.equal(result.scores.profile.direction, 'stable');
  assert.equal(result.highlights.mostImproved.key, 'language');
  assert.equal(result.highlights.mostDeclined.key, 'career');
  assert.equal(result.interval.isShort, false);
});

test('reports Holland, MBTI dimension, major and short-interval changes', () => {
  const result = compareAssessments({
    previousAssessment: makeAssessment('older', '2026-11-01T10:00:00Z'),
    currentAssessment: makeAssessment('newer', '2026-11-03T10:00:00Z'),
    previousResult: makeResult({
      fitScore: 70,
      languageScore: 65,
      profileScore: 70,
      careerScore: 60,
      hollandCode: 'RIA',
      mbtiType: 'ENTJ',
      majors: [
        { majorId: 'a', majorName: 'Ngành A', fitScore: 70 },
        { majorId: 'b', majorName: 'Ngành B', fitScore: 61 }
      ]
    }),
    currentResult: makeResult({
      fitScore: 69,
      languageScore: 64,
      profileScore: 69,
      careerScore: 60,
      hollandCode: 'RIE',
      holland: { R: 70, I: 60, A: 40, S: 40, E: 40, C: 20 },
      mbtiType: 'INTJ',
      majors: [
        { majorId: 'a', majorName: 'Ngành A', fitScore: 74 },
        { majorId: 'c', majorName: 'Ngành C', fitScore: 82 }
      ]
    })
  });

  assert.equal(result.interval.isShort, true);
  assert.equal(result.holland.changed, true);
  assert.equal(result.holland.scores.A.direction, 'decrease');
  assert.deepEqual(result.personality.changedDimensions, [
    { dimension: 'E/I', from: 'E', to: 'I' }
  ]);
  assert.equal(result.majors.newlyRecommended[0].majorName, 'Ngành C');
  assert.equal(result.majors.noLongerRecommended[0].majorName, 'Ngành B');
  assert.equal(result.majors.retained[0].direction, 'stable');
  assert.match(result.disclaimer, /chỉ mang tính tham khảo/);
});
