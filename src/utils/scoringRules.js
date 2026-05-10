function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeScores(aiScores = []) {
  return Array.isArray(aiScores)
    ? aiScores.map((item) => ({
        ...item,
        score: toFiniteNumber(item?.score),
      }))
    : []
}

function normalizeRules(rules = {}) {
  return {
    minEachQuestionScore: toFiniteNumber(rules.minEachQuestionScore ?? rules.minimumScorePerQuestion),
    minShortlistScore: toFiniteNumber(rules.minShortlistScore ?? rules.shortlistCutoff, Number.POSITIVE_INFINITY),
    minWaitlistScore: toFiniteNumber(rules.minWaitlistScore ?? rules.waitlistCutoff, Number.POSITIVE_INFINITY),
    borderlineMinScore: toFiniteNumber(rules.borderlineMinScore ?? rules.borderlineRange?.min),
  }
}

export function calculateTotalScore(aiScores = []) {
  return normalizeScores(aiScores).reduce((sum, item) => sum + item.score, 0)
}

export function evaluateRules(totalScore, aiScores = [], rules = {}) {
  const normalizedRules = normalizeRules(rules)
  const normalizedScores = normalizeScores(aiScores)
  const belowMinimumQuestionScore = normalizedScores.some(
    (item) => item.score < normalizedRules.minEachQuestionScore,
  )

  if (belowMinimumQuestionScore) {
    return {
      decision: 'borderline_review',
      borderline: true,
      reason: 'below_min_each_question_score',
    }
  }

  if (toFiniteNumber(totalScore) >= normalizedRules.minShortlistScore) {
    return {
      decision: 'shortlisted',
      borderline: false,
      reason: 'met_shortlist_threshold',
    }
  }

  if (toFiniteNumber(totalScore) >= normalizedRules.minWaitlistScore) {
    return {
      decision: 'waitlisted',
      borderline: false,
      reason: 'met_waitlist_threshold',
    }
  }

  if (toFiniteNumber(totalScore) >= normalizedRules.borderlineMinScore) {
    return {
      decision: 'borderline_review',
      borderline: true,
      reason: 'met_borderline_threshold',
    }
  }

  return {
    decision: 'rejected',
    borderline: false,
    reason: 'below_borderline_threshold',
  }
}

export function getDecisionFromRules(totalScore, aiScores = [], rules = {}) {
  return evaluateRules(totalScore, aiScores, rules)
}
