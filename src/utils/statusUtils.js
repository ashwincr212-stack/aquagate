const STATUS_LABELS = {
  pending_registration: 'Pending Registration',
  registered: 'Registered',
  assessment_started: 'Assessment Started',
  pending_ai_score: 'Pending AI Score',
  shortlisted: 'Shortlisted',
  waitlisted: 'Waitlisted',
  rejected: 'Rejected',
  borderline_review: 'Borderline Review',
  ai_failed: 'AI Failed',
  admin_approved: 'Admin Approved',
  admin_rejected: 'Admin Rejected',
}

const STATUS_TONES = {
  pending_registration: 'neutral',
  registered: 'info',
  assessment_started: 'info',
  pending_ai_score: 'warning',
  shortlisted: 'success',
  waitlisted: 'warning',
  rejected: 'danger',
  borderline_review: 'warning',
  ai_failed: 'danger',
  admin_approved: 'success',
  admin_rejected: 'danger',
}

function normalizeBorderlineRange(range) {
  if (!range) {
    return null
  }

  if (typeof range === 'object' && range !== null && Number.isFinite(range.min) && Number.isFinite(range.max)) {
    return range
  }

  if (typeof range === 'string') {
    const parts = range
      .split('-')
      .map((part) => Number(part.trim()))
      .filter((value) => Number.isFinite(value))

    if (parts.length === 2) {
      return { min: parts[0], max: parts[1] }
    }
  }

  return null
}

export function getCandidateStatusLabel(status) {
  return STATUS_LABELS[status] ?? 'Unknown Status'
}

export function getStatusTone(status) {
  return STATUS_TONES[status] ?? 'neutral'
}

export function isBorderlineScore(score, rules) {
  const range = normalizeBorderlineRange(rules?.borderlineRange)

  if (!range || !Number.isFinite(score)) {
    return false
  }

  return score >= range.min && score <= range.max
}

export function applySelectionRules(totalScore, questionScores = [], rules = {}) {
  const minimumScorePerQuestion = Number(rules.minimumScorePerQuestion ?? 0)
  const belowQuestionMinimum = questionScores.some((score) => Number(score) < minimumScorePerQuestion)
  const borderline = isBorderlineScore(totalScore, rules)

  if (belowQuestionMinimum) {
    return {
      status: 'rejected',
      borderline: false,
      reason: 'below_minimum_question_score',
    }
  }

  if (borderline) {
    return {
      status: 'borderline_review',
      borderline: true,
      reason: 'within_borderline_range',
    }
  }

  if (Number(totalScore) >= Number(rules.shortlistCutoff ?? Number.POSITIVE_INFINITY)) {
    return {
      status: 'shortlisted',
      borderline: false,
      reason: 'above_shortlist_cutoff',
    }
  }

  if (Number(totalScore) >= Number(rules.waitlistCutoff ?? Number.POSITIVE_INFINITY)) {
    return {
      status: 'waitlisted',
      borderline: false,
      reason: 'above_waitlist_cutoff',
    }
  }

  return {
    status: 'rejected',
    borderline: false,
    reason: 'below_waitlist_cutoff',
  }
}
