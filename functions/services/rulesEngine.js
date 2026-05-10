function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function calculateTotalScore(aiScores = []) {
  return Array.isArray(aiScores)
    ? aiScores.reduce((sum, item) => sum + toFiniteNumber(item?.score), 0)
    : 0
}

function evaluateRules(totalScore, aiScores = [], rules = {}) {
  const minEachQuestionScore = toFiniteNumber(rules.minEachQuestionScore ?? rules.minimumScorePerQuestion)
  const minShortlistScore = toFiniteNumber(rules.minShortlistScore ?? rules.shortlistCutoff, Number.POSITIVE_INFINITY)
  const minWaitlistScore = toFiniteNumber(rules.minWaitlistScore ?? rules.waitlistCutoff, Number.POSITIVE_INFINITY)
  const borderlineMinScore = toFiniteNumber(rules.borderlineMinScore ?? rules.borderlineRange?.min)
  const normalizedTotal = toFiniteNumber(totalScore)
  const belowMinimumQuestionScore = (Array.isArray(aiScores) ? aiScores : []).some(
    (item) => toFiniteNumber(item?.score) < minEachQuestionScore,
  )

  if (belowMinimumQuestionScore) {
    return {
      decision: 'borderline_review',
      borderline: true,
      reason: 'below_min_each_question_score',
    }
  }

  if (normalizedTotal >= minShortlistScore) {
    return {
      decision: 'shortlisted',
      borderline: false,
      reason: 'met_shortlist_threshold',
    }
  }

  if (normalizedTotal >= minWaitlistScore) {
    return {
      decision: 'waitlisted',
      borderline: false,
      reason: 'met_waitlist_threshold',
    }
  }

  if (normalizedTotal >= borderlineMinScore) {
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

module.exports = {
  calculateTotalScore,
  evaluateRules,
}
