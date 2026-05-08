/** Lưu tạm theo sessionId (phiên làm bài chưa đăng nhập). TTL 24h. */
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const sessionUserContext = new Map();
const pendingEvaluation = new Map();

function isExpired(at) {
  return Date.now() - at > SESSION_TTL_MS;
}

/**
 * @param {string} sessionId
 * @param {{ fullName?: string, hobby?: string, age?: number|string, targetJob?: string, educationLevel?: string }} ctx
 */
function setSessionContext(sessionId, ctx) {
  if (!sessionId || !ctx || typeof ctx !== "object") return;
  sessionUserContext.set(sessionId, { data: { ...ctx }, at: Date.now() });
}

function getSessionContext(sessionId) {
  const row = sessionUserContext.get(sessionId);
  if (!row) return null;
  if (isExpired(row.at)) {
    sessionUserContext.delete(sessionId);
    return null;
  }
  return row.data;
}

function deleteSessionContext(sessionId) {
  sessionUserContext.delete(sessionId);
}

/**
 * Kết quả chấm điểm chờ user đăng nhập để nhận.
 */
function setPendingEvaluation(sessionId, evaluation, contextSnapshot) {
  pendingEvaluation.set(sessionId, {
    evaluation,
    contextSnapshot: contextSnapshot && typeof contextSnapshot === "object" ? { ...contextSnapshot } : {},
    at: Date.now(),
  });
}

function peekPendingEvaluation(sessionId) {
  const row = pendingEvaluation.get(sessionId);
  if (!row) return null;
  if (isExpired(row.at)) {
    pendingEvaluation.delete(sessionId);
    return null;
  }
  return row;
}

/** Lấy và xóa pending (một lần nhận điểm). */
function consumePendingEvaluation(sessionId) {
  const row = peekPendingEvaluation(sessionId);
  if (!row) return null;
  pendingEvaluation.delete(sessionId);
  return row;
}

module.exports = {
  setSessionContext,
  getSessionContext,
  deleteSessionContext,
  setPendingEvaluation,
  peekPendingEvaluation,
  consumePendingEvaluation,
};
