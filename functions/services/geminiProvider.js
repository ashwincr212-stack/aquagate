const { GoogleGenAI } = require('@google/genai')
const { getGeminiApiKey, getGeminiConfig } = require('../config/geminiConfig')

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
  const programTitle = scoringPayload.program?.title ?? 'Untitled Program'
  const programSlug = scoringPayload.program?.slug ?? ''
  const strictness = scoringPayload.rulesSnapshot?.aiStrictnessLevel ?? 'balanced'
  const questions = Array.isArray(scoringPayload.questionsWithRubrics) ? scoringPayload.questionsWithRubrics : []
  const answers = Array.isArray(scoringPayload.answers) ? scoringPayload.answers : []

  return [
    'You are an admissions scoring assistant for AquaGate.',
    'Score each answer using the question maxScore, rubric, and any model answer guidance.',
    'Do not exceed maxScore for any question.',
    'Give useful and concise feedback for each answer.',
    'Return valid JSON only.',
    'Do not return markdown.',
    'Do not wrap the JSON in code fences.',
    'Do not include any extra text before or after the JSON.',
    '',
    `Program: ${programTitle} (${programSlug})`,
    `AI strictness: ${strictness}`,
    `Candidate summary: ${JSON.stringify(scoringPayload.candidateSummary ?? {})}`,
    `Rules snapshot: ${JSON.stringify(scoringPayload.rulesSnapshot ?? {})}`,
    '',
    'Questions with rubrics:',
    JSON.stringify(questions, null, 2),
    '',
    'Candidate answers:',
    JSON.stringify(answers, null, 2),
    '',
    'Return JSON with exactly this shape:',
    JSON.stringify(expectedShape, null, 2),
  ].join('\n')
}

function parseGeminiJsonResponse(rawText) {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new Error('Gemini response text is empty.')
  }

  try {
    const cleanedText = rawText
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    return JSON.parse(cleanedText)
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

function getGeminiProviderStatus(options = {}) {
  const { hasApiKey, model, provider } = getGeminiConfig({ apiKey: options.apiKey })

  return {
    provider,
    configured: hasApiKey,
    model,
    realCallsEnabled: hasApiKey,
    mode: hasApiKey ? 'Gemini backend available' : 'Backend mock only',
  }
}

async function scoreWithGemini(scoringPayload = {}, options = {}) {
  const apiKey = getGeminiApiKey({ apiKey: options.apiKey })
  const { model } = getGeminiConfig({ apiKey: options.apiKey })

  if (!apiKey) {
    throw new Error('Gemini API key is not configured in Firebase Functions secrets or functions/.env')
  }

  const prompt = buildGeminiPrompt(scoringPayload)
  const client = new GoogleGenAI({ apiKey })
  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  })
  const rawText =
    typeof response.text === 'string' && response.text.trim().length > 0
      ? response.text
      : response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
  const parsedResponse = parseGeminiJsonResponse(rawText)
  return validateGeminiScoreResponse(parsedResponse, scoringPayload)
}

/*
 Future real function outline only:

 async function scoreWithGemini(scoringPayload) {
   // Implemented for local emulator testing only.
   // Keep all secrets on the backend and never expose them to the frontend.
 }

 This must not be implemented until backend-only secrets are configured.
*/

module.exports = {
  buildGeminiPrompt,
  getGeminiProviderStatus,
  parseGeminiJsonResponse,
  scoreWithGemini,
  validateGeminiScoreResponse,
}
