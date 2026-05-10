/*
 Future AI scoring shape for submissions.
 Real AI scoring must run in Firebase Cloud Functions or another backend only.
 Frontend code must never contain AI API keys, and deployed Cloud Functions will
 require Firebase Blaze later. This file documents the mock/local foundation only.
*/

export const aiScoreItemSchema = {
  questionId: '',
  order: 0,
  maxScore: 0,
  score: 0,
  feedback: '',
  strengths: [],
  weaknesses: [],
}

export const aiScoringSubmissionFields = {
  status: 'pending_ai_score',
  totalScore: null,
  aiScores: [aiScoreItemSchema],
  aiSummary: '',
  aiRecommendation: '',
  ruleUsedSnapshot: {},
  aiRubricUsedSnapshot: {},
  scoredAt: null,
  updatedAt: null,
}

export const aiScoringFieldNotes = [
  'status stores the decision after scoring or manual review.',
  'totalScore stores the sum of per-question AI scores.',
  'aiScores stores per-question scoring output and feedback.',
  'aiSummary stores the aggregate summary returned by backend scoring later.',
  'aiRecommendation stores the backend recommendation text for admins and candidates.',
  'ruleUsedSnapshot stores the exact rule version used during scoring.',
  'aiRubricUsedSnapshot stores the rubric snapshot used by the backend scorer.',
  'scoredAt stores when the backend or dev mock scoring completed.',
  'updatedAt stores the latest Firestore update timestamp.',
]
