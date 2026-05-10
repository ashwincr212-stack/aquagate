function buildExpectedResponseShape() {
  return {
    aiScores: [
      {
        questionId: 'question-id',
        order: 1,
        score: 8,
        feedback: 'Specific scoring feedback',
        strengths: ['Strength 1'],
        weaknesses: ['Weakness 1'],
      },
    ],
    aiSummary: 'Overall summary',
    aiRecommendation: 'Overall recommendation',
  }
}

function buildGeminiPrompt(scoringPayload = {}) {
  const expectedShape = buildExpectedResponseShape()

  return {
    systemInstruction:
      'You are an admissions scoring assistant. Score each answer strictly against the supplied rubric and return JSON only.',
    developerNotes: [
      'Future real implementation will send this prompt to Gemini from the backend only.',
      'Do not place Gemini API keys in frontend code, .env files used by Vite, or browser-exposed configuration.',
      'This file does not call Gemini yet and contains placeholders only.',
    ],
    rubricContext: {
      candidateSummary: scoringPayload.candidateSummary ?? {},
      program: scoringPayload.program ?? {},
      rulesSnapshot: scoringPayload.rulesSnapshot ?? {},
      questionsWithRubrics: Array.isArray(scoringPayload.questionsWithRubrics)
        ? scoringPayload.questionsWithRubrics
        : [],
      answers: Array.isArray(scoringPayload.answers) ? scoringPayload.answers : [],
    },
    outputRequirements: {
      format: 'json',
      expectedShape,
      instructions: [
        'Return valid JSON only.',
        'Include one aiScores item for every answer.',
        'Keep scores within the allowed maxScore for each question.',
      ],
    },
  }
}

function parseGeminiJsonResponse(rawText) {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new Error('Gemini response text is empty.')
  }

  try {
    return JSON.parse(rawText)
  } catch (error) {
    throw new Error(`Gemini response is not valid JSON. ${error.message}`)
  }
}

function validateGeminiScoreResponse(parsedResponse, scoringPayload = {}) {
  if (!parsedResponse || typeof parsedResponse !== 'object') {
    throw new Error('Gemini response must be an object.')
  }

  if (!Array.isArray(parsedResponse.aiScores)) {
    throw new Error('Gemini response aiScores must be an array.')
  }

  const answers = Array.isArray(scoringPayload.answers) ? scoringPayload.answers : []
  const questions = Array.isArray(scoringPayload.questionsWithRubrics)
    ? scoringPayload.questionsWithRubrics
    : []

  if (parsedResponse.aiScores.length !== answers.length) {
    throw new Error('Gemini response aiScores count must match the number of answers.')
  }

  if (typeof parsedResponse.aiSummary !== 'string' || parsedResponse.aiSummary.trim().length === 0) {
    throw new Error('Gemini response aiSummary must exist.')
  }

  if (typeof parsedResponse.aiRecommendation !== 'string' || parsedResponse.aiRecommendation.trim().length === 0) {
    throw new Error('Gemini response aiRecommendation must exist.')
  }

  const questionMap = new Map(
    questions.map((question) => [question.questionId, question]),
  )

  parsedResponse.aiScores.forEach((scoreItem, index) => {
    if (typeof scoreItem?.questionId !== 'string' || scoreItem.questionId.trim().length === 0) {
      throw new Error(`Gemini response aiScores[${index}] is missing questionId.`)
    }

    if (typeof scoreItem?.score !== 'number' || Number.isNaN(scoreItem.score)) {
      throw new Error(`Gemini response aiScores[${index}] score must be a number.`)
    }

    if (typeof scoreItem?.feedback !== 'string' || scoreItem.feedback.trim().length === 0) {
      throw new Error(`Gemini response aiScores[${index}] feedback must exist.`)
    }

    const matchingQuestion = questionMap.get(scoreItem.questionId)
    if (!matchingQuestion) {
      throw new Error(`Gemini response aiScores[${index}] questionId does not match the scoring payload.`)
    }

    const maxScore = Number(matchingQuestion.maxScore ?? 0)
    if (scoreItem.score < 0 || scoreItem.score > maxScore) {
      throw new Error(`Gemini response aiScores[${index}] score must be between 0 and ${maxScore}.`)
    }
  })

  return parsedResponse
}

/*
 Future real function outline only:

 async function scoreWithGemini(scoringPayload) {
   // 1. Build prompt with buildGeminiPrompt(scoringPayload)
   // 2. Send prompt to Gemini from the backend only
   // 3. Parse raw text with parseGeminiJsonResponse(rawText)
   // 4. Validate with validateGeminiScoreResponse(parsed, scoringPayload)
   // 5. Return the validated score payload
 }

 This must not be implemented until backend-only secrets are configured.
*/

module.exports = {
  buildGeminiPrompt,
  parseGeminiJsonResponse,
  validateGeminiScoreResponse,
}
