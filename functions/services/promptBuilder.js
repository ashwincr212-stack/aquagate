function buildCandidateSummary(candidate = {}) {
  return {
    fullName: candidate.fullName ?? '',
    email: candidate.email ?? '',
    qualification: candidate.qualification ?? '',
    experience: candidate.experience ?? '',
    city: candidate.city ?? '',
  }
}

function buildRulesSnapshot(rules = {}) {
  return {
    id: rules.id ?? '',
    programId: rules.programId ?? '',
    programSlug: rules.programSlug ?? '',
    criteriaVersion: Number(rules.criteriaVersion ?? rules.version ?? 1),
    minShortlistScore: Number(rules.minShortlistScore ?? rules.shortlistCutoff ?? 0),
    minWaitlistScore: Number(rules.minWaitlistScore ?? rules.waitlistCutoff ?? 0),
    borderlineMinScore: Number(rules.borderlineMinScore ?? rules.borderlineRange?.min ?? 0),
    minEachQuestionScore: Number(rules.minEachQuestionScore ?? rules.minimumScorePerQuestion ?? 0),
    aiStrictnessLevel: String(rules.aiStrictnessLevel ?? 'balanced').toLowerCase(),
  }
}

function buildQuestionsWithRubrics(questions = []) {
  return questions.map((question) => ({
    questionId: question.id ?? question.questionId ?? '',
    order: Number(question.order ?? 0),
    questionText: question.questionText ?? question.prompt ?? '',
    modelAnswer: question.modelAnswer ?? '',
    maxScore: Number(question.maxScore ?? 10),
    rubric: question.rubricMarks ?? question.rubric ?? '',
  }))
}

function buildAnswers(submission = {}) {
  return Array.isArray(submission.answers)
    ? submission.answers.map((answer) => ({
        questionId: answer.questionId ?? '',
        order: Number(answer.order ?? 0),
        questionText: answer.questionText ?? '',
        answerText: answer.answerText ?? '',
        maxScore: Number(answer.maxScore ?? 10),
      }))
    : []
}

function buildScoringPayload({ submission, candidate, program, questions, rules }) {
  // This structured object is the future source for a strict Gemini prompt.
  // No Gemini API call happens in this step.
  return {
    candidateSummary: buildCandidateSummary(candidate),
    program: {
      id: program.id ?? '',
      title: program.title ?? program.name ?? '',
      slug: program.slug ?? submission.programSlug ?? '',
      category: program.category ?? '',
    },
    rulesSnapshot: buildRulesSnapshot(rules),
    questionsWithRubrics: buildQuestionsWithRubrics(questions),
    answers: buildAnswers(submission),
  }
}

module.exports = {
  buildScoringPayload,
}
