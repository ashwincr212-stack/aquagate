function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function scoreAnswer(answer = {}, strictness = 'balanced') {
  const answerText = String(answer.answerText ?? '').trim()
  const words = answerText ? answerText.split(/\s+/).filter(Boolean) : []
  const uniqueWords = new Set(words.map((word) => word.toLowerCase()))
  const sentenceCount = answerText.split(/[.!?]+/).filter((part) => part.trim()).length
  const baseScore =
    2 +
    Math.min(3, Math.floor(words.length / 20)) +
    Math.min(2, Math.floor(uniqueWords.size / 16)) +
    Math.min(2, sentenceCount) +
    ((answerText.length + toFiniteNumber(answer.order)) % 3)

  const strictnessAdjustment = strictness === 'strict' ? -1 : strictness === 'lenient' ? 1 : 0
  return Math.max(0, Math.min(toFiniteNumber(answer.maxScore, 10), baseScore + strictnessAdjustment))
}

function buildFeedback(score, maxScore) {
  if (score >= Math.max(1, maxScore - 1)) {
    return {
      feedback: 'Strong backend mock answer with clear coverage of the prompt.',
      strengths: ['Directly addresses the question', 'Shows enough depth for this review stage'],
      weaknesses: ['Could still be tightened with one stronger example'],
    }
  }

  if (score >= Math.max(1, Math.ceil(maxScore * 0.6))) {
    return {
      feedback: 'Reasonable backend mock answer, but more specificity would improve the score.',
      strengths: ['Covers the core topic', 'Readable structure'],
      weaknesses: ['Needs more detail', 'Needs clearer supporting examples'],
    }
  }

  return {
    feedback: 'Backend mock scoring found this answer too thin for the current thresholds.',
    strengths: ['Submission was captured successfully'],
    weaknesses: ['Needs more depth', 'Needs clearer structure'],
  }
}

// BACKEND MOCK ONLY — replace with a real Gemini API provider later.
function mockScoreSubmission(scoringPayload = {}) {
  const strictness = String(scoringPayload.rulesSnapshot?.aiStrictnessLevel ?? 'balanced').toLowerCase()
  const answersByQuestionId = new Map(
    (scoringPayload.answers ?? []).map((answer) => [answer.questionId, answer]),
  )

  const aiScores = (scoringPayload.questionsWithRubrics ?? []).map((question) => {
    const answer = answersByQuestionId.get(question.questionId) ?? {
      questionId: question.questionId,
      order: question.order,
      answerText: '',
      maxScore: question.maxScore,
    }
    const score = scoreAnswer(
      {
        ...answer,
        order: question.order,
        maxScore: question.maxScore,
      },
      strictness,
    )
    const feedback = buildFeedback(score, toFiniteNumber(question.maxScore, 10))

    return {
      questionId: question.questionId,
      order: question.order,
      maxScore: toFiniteNumber(question.maxScore, 10),
      score,
      feedback: feedback.feedback,
      strengths: feedback.strengths,
      weaknesses: feedback.weaknesses,
    }
  })

  return {
    aiScores,
    aiSummary: `Backend mock scoring prepared ${aiScores.length} question evaluations for the future Gemini scoring pipeline.`,
    aiRecommendation:
      'Backend mock recommendation only. Replace this service with a Gemini-backed provider after backend secrets are configured.',
    aiRubricUsedSnapshot: {
      source: 'firebase_function_mock',
      futureProvider: 'gemini',
      generatedFromQuestions: (scoringPayload.questionsWithRubrics ?? []).map((question) => ({
        questionId: question.questionId,
        order: question.order,
        questionText: question.questionText,
        modelAnswer: question.modelAnswer,
        rubric: question.rubric,
        maxScore: question.maxScore,
      })),
    },
  }
}

module.exports = {
  mockScoreSubmission,
}
