import { calculateTotalScore, getDecisionFromRules } from '../utils/scoringRules.js'

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeRulesSnapshot(rules = {}) {
  return {
    id: rules.id ?? null,
    programId: rules.programId ?? '',
    programSlug: rules.programSlug ?? '',
    criteriaVersion: Number(rules.criteriaVersion ?? rules.version ?? 1),
    minShortlistScore: toFiniteNumber(rules.minShortlistScore ?? rules.shortlistCutoff, 80),
    minWaitlistScore: toFiniteNumber(rules.minWaitlistScore ?? rules.waitlistCutoff, 60),
    borderlineMinScore: toFiniteNumber(rules.borderlineMinScore ?? rules.borderlineRange?.min, 40),
    minEachQuestionScore: toFiniteNumber(rules.minEachQuestionScore ?? rules.minimumScorePerQuestion),
    aiStrictnessLevel: String(rules.aiStrictnessLevel ?? 'balanced').toLowerCase(),
    autoShortlist: Boolean(rules.autoShortlist),
    manualReviewEnabled: Boolean(rules.manualReviewEnabled ?? rules.manualReview),
  }
}

function createRubricSnapshot(questions = [], rules = {}) {
  return {
    source: 'dev_mock_foundation_only',
    strictness: String(rules.aiStrictnessLevel ?? 'balanced').toLowerCase(),
    questions: questions.map((question) => ({
      questionId: question.id ?? question.questionId ?? '',
      order: Number(question.order ?? 0),
      maxScore: toFiniteNumber(question.maxScore),
      questionText: question.questionText ?? question.prompt ?? '',
      rubricMarks: question.rubricMarks ?? '',
    })),
  }
}

function scoreAnswerText(answer = '', maxScore = 10, strictness = 'balanced', order = 0) {
  const trimmedAnswer = String(answer).trim()
  const words = trimmedAnswer ? trimmedAnswer.split(/\s+/).filter(Boolean) : []
  const uniqueWords = new Set(words.map((word) => word.toLowerCase()))
  const sentences = trimmedAnswer.split(/[.!?]+/).filter((part) => part.trim().length > 0)
  const baseScore =
    2 +
    Math.min(3, Math.floor(words.length / 20)) +
    Math.min(2, Math.floor(uniqueWords.size / 18)) +
    Math.min(2, sentences.length) +
    ((trimmedAnswer.length + order) % 3)

  const strictnessAdjustment =
    strictness === 'strict' ? -1 : strictness === 'lenient' ? 1 : 0

  return Math.max(0, Math.min(maxScore, baseScore + strictnessAdjustment))
}

function buildFeedback(score, maxScore, answerText) {
  const answerLength = String(answerText ?? '').trim().length

  if (score >= Math.max(1, maxScore - 1)) {
    return {
      feedback: 'Strong answer with clear structure and useful detail.',
      strengths: ['Addresses the prompt directly', 'Shows enough depth for this stage'],
      weaknesses: answerLength < 80 ? ['Could include one more concrete example'] : ['Minor room to tighten phrasing'],
    }
  }

  if (score >= Math.max(1, Math.ceil(maxScore * 0.6))) {
    return {
      feedback: 'Reasonable answer, but it needs stronger specificity to score higher.',
      strengths: ['Covers the core topic', 'Readable and mostly organized'],
      weaknesses: ['Needs more concrete examples', 'Could explain impact more clearly'],
    }
  }

  return {
    feedback: 'Answer is currently too thin to clear the stronger scoring thresholds.',
    strengths: answerLength > 0 ? ['An attempt was submitted for review'] : ['Submission captured successfully'],
    weaknesses: ['Needs more depth', 'Needs clearer structure and evidence'],
  }
}

export function prepareSubmissionForScoring(submission, questions = [], rules = {}) {
  const answers = Array.isArray(submission?.answers) ? submission.answers : []
  const ruleUsedSnapshot =
    Object.keys(rules ?? {}).length > 0 ? normalizeRulesSnapshot(rules) : submission?.ruleUsedSnapshot ?? normalizeRulesSnapshot()
  const aiRubricUsedSnapshot =
    questions.length > 0 ? createRubricSnapshot(questions, ruleUsedSnapshot) : submission?.aiRubricUsedSnapshot ?? createRubricSnapshot([], ruleUsedSnapshot)

  return {
    submissionId: submission?.id ?? '',
    candidateId: submission?.candidateId ?? '',
    programId: submission?.programId ?? '',
    programSlug: submission?.programSlug ?? '',
    programTitle: submission?.programTitle ?? '',
    status: submission?.status ?? 'pending_ai_score',
    answers: answers.map((answer) => ({
      questionId: answer.questionId ?? '',
      order: Number(answer.order ?? 0),
      questionText: answer.questionText ?? '',
      answerText: answer.answerText ?? '',
      maxScore: toFiniteNumber(answer.maxScore, 10),
    })),
    ruleUsedSnapshot,
    aiRubricUsedSnapshot,
  }
}

// DEV ONLY: this creates deterministic mock scoring for local testing and must
// never be mistaken for real AI evaluation. Production AI must run in Cloud
// Functions or another backend where secrets are protected.
export function applyMockAiScore(submission, rules = {}) {
  const preparedSubmission =
    submission?.ruleUsedSnapshot && submission?.aiRubricUsedSnapshot
      ? prepareSubmissionForScoring(submission, [], Object.keys(rules ?? {}).length > 0 ? rules : submission.ruleUsedSnapshot)
      : prepareSubmissionForScoring(submission, [], rules)
  const strictness = preparedSubmission.ruleUsedSnapshot.aiStrictnessLevel
  const aiScores = preparedSubmission.answers.map((answer) => {
    const score = scoreAnswerText(answer.answerText, answer.maxScore, strictness, answer.order)
    const feedback = buildFeedback(score, answer.maxScore, answer.answerText)

    return {
      questionId: answer.questionId,
      order: answer.order,
      maxScore: answer.maxScore,
      score,
      feedback: feedback.feedback,
      strengths: feedback.strengths,
      weaknesses: feedback.weaknesses,
    }
  })

  const totalScore = calculateTotalScore(aiScores)
  const evaluation = getDecisionFromRules(totalScore, aiScores, preparedSubmission.ruleUsedSnapshot)
  const scoredAt = new Date().toISOString()

  return {
    status: evaluation.decision,
    borderline: evaluation.borderline,
    reason: evaluation.reason,
    totalScore,
    aiScores,
    aiSummary: `DEV ONLY mock scoring generated ${totalScore} total points across ${aiScores.length} answers. Real AI is not connected in this step.`,
    aiRecommendation:
      evaluation.decision === 'shortlisted'
        ? 'Mock recommendation: candidate is ready for the next review stage.'
        : evaluation.decision === 'waitlisted'
          ? 'Mock recommendation: keep candidate in the waitlist band for later review.'
          : evaluation.decision === 'borderline_review'
            ? 'Mock recommendation: send this submission to manual review before a final decision.'
            : 'Mock recommendation: reject under the current configured thresholds.',
    ruleUsedSnapshot: preparedSubmission.ruleUsedSnapshot,
    aiRubricUsedSnapshot: preparedSubmission.aiRubricUsedSnapshot,
    scoredAt,
    updatedAt: scoredAt,
  }
}

export function explainFutureBackendFlow() {
  return [
    'Candidate submits answers from the frontend and Firestore stores the raw submission only.',
    'A Firebase Cloud Function or backend worker reads the submission and active rule snapshot.',
    'The backend calls the real AI provider using secret keys stored outside the frontend.',
    'The backend writes aiScores, totalScore, summary, recommendation, and final status back to Firestore.',
    'Deployed Cloud Functions will require Firebase Blaze later, but this step stays mock-only and frontend-safe.',
  ]
}
