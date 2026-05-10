const admin = require('firebase-admin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')

const {
  getSubmission,
  getCandidate,
  getProgram,
  getQuestionsByProgramSlug,
  getActiveRules,
  updateSubmissionScore,
} = require('./services/firestoreAccess')
const { buildScoringPayload } = require('./services/promptBuilder')
const { mockScoreSubmission } = require('./services/scoringService')
const { calculateTotalScore, evaluateRules } = require('./services/rulesEngine')

if (!admin.apps.length) {
  admin.initializeApp()
}

// Future provider: Gemini API.
// Gemini API keys must stay backend-only through Firebase secrets or secure
// server environment configuration later. No real Gemini call happens here yet.
exports.scoreSubmission = onCall(async (request) => {
  const submissionId = request.data?.submissionId

  if (!submissionId || typeof submissionId !== 'string') {
    throw new HttpsError('invalid-argument', 'A valid submissionId is required.')
  }

  try {
    const submission = await getSubmission(submissionId)
    const candidate = submission.candidateId ? await getCandidate(submission.candidateId) : null
    const program = await getProgram(submission.programId || submission.programSlug)
    const programSlug = submission.programSlug || program.slug

    if (!programSlug) {
      throw new Error('Program slug is missing on the submission and program record.')
    }

    const questions = await getQuestionsByProgramSlug(programSlug)
    const rules = await getActiveRules(programSlug)
    const scoringPayload = buildScoringPayload({
      submission,
      candidate,
      program,
      questions,
      rules,
    })
    const mockScore = mockScoreSubmission(scoringPayload)
    const totalScore = calculateTotalScore(mockScore.aiScores)
    const evaluation = evaluateRules(totalScore, mockScore.aiScores, rules)

    await updateSubmissionScore(submissionId, {
      status: evaluation.decision,
      borderline: evaluation.borderline,
      totalScore,
      aiScores: mockScore.aiScores,
      aiSummary: mockScore.aiSummary,
      aiRecommendation: mockScore.aiRecommendation,
      ruleUsedSnapshot: scoringPayload.rulesSnapshot,
      aiRubricUsedSnapshot: mockScore.aiRubricUsedSnapshot,
      backendScoringSource: 'firebase_function_mock',
      futureProvider: 'gemini',
      scoringReason: evaluation.reason,
    })

    return {
      success: true,
      submissionId,
      status: evaluation.decision,
      totalScore,
      message: 'Submission scored with the backend mock function skeleton. No Gemini API call was made.',
    }
  } catch (error) {
    throw new HttpsError('internal', error.message || 'Unable to score submission.')
  }
})
