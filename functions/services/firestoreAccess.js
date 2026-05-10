const admin = require('firebase-admin')
const { FieldValue, getFirestore } = require('firebase-admin/firestore')

function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp()
  }

  return getFirestore()
}

function normalizeSnapshot(snapshot) {
  return { id: snapshot.id, ...snapshot.data() }
}

async function getSubmission(submissionId) {
  const snapshot = await getDb().collection('submissions').doc(submissionId).get()

  if (!snapshot.exists) {
    throw new Error(`Submission not found for id: ${submissionId}`)
  }

  return normalizeSnapshot(snapshot)
}

async function getCandidate(candidateId) {
  const snapshot = await getDb().collection('candidates').doc(candidateId).get()

  if (!snapshot.exists) {
    throw new Error(`Candidate not found for id: ${candidateId}`)
  }

  return normalizeSnapshot(snapshot)
}

async function getProgram(programIdOrSlug) {
  if (!programIdOrSlug) {
    throw new Error('Program id or slug is required.')
  }

  const programsRef = getDb().collection('programs')
  const directSnapshot = await programsRef.doc(programIdOrSlug).get()

  if (directSnapshot.exists) {
    return normalizeSnapshot(directSnapshot)
  }

  const querySnapshot = await programsRef.where('slug', '==', programIdOrSlug).limit(1).get()

  if (querySnapshot.empty) {
    throw new Error(`Program not found for id or slug: ${programIdOrSlug}`)
  }

  return normalizeSnapshot(querySnapshot.docs[0])
}

async function getQuestionsByProgramSlug(programSlug) {
  if (!programSlug) {
    throw new Error('Program slug is required to load questions.')
  }

  const snapshot = await getDb().collection('questions').where('programSlug', '==', programSlug).get()
  const questions = snapshot.docs
    .map(normalizeSnapshot)
    .filter((question) => question.isActive !== false && question.active !== false)
    .sort((left, right) => Number(left.order ?? 0) - Number(right.order ?? 0))

  if (!questions.length) {
    throw new Error(`No active questions found for program slug: ${programSlug}`)
  }

  return questions
}

async function getActiveRules(programSlug) {
  if (!programSlug) {
    throw new Error('Program slug is required to load active rules.')
  }

  const snapshot = await getDb().collection('selectionRules').where('programSlug', '==', programSlug).get()
  const rules = snapshot.docs
    .map(normalizeSnapshot)
    .filter((rule) => rule.isActive === true || rule.active === true)
    .sort((left, right) => {
      const leftVersion = Number(left.criteriaVersion ?? left.version ?? 0)
      const rightVersion = Number(right.criteriaVersion ?? right.version ?? 0)
      return rightVersion - leftVersion
    })

  if (!rules.length) {
    throw new Error(`No active selection rules found for program slug: ${programSlug}`)
  }

  return rules[0]
}

async function updateSubmissionScore(submissionId, scorePayload) {
  const submissionRef = getDb().collection('submissions').doc(submissionId)
  const timestamp = FieldValue.serverTimestamp()

  await submissionRef.update({
    ...scorePayload,
    scoredAt: timestamp,
    updatedAt: timestamp,
  })
}

module.exports = {
  getSubmission,
  getCandidate,
  getProgram,
  getQuestionsByProgramSlug,
  getActiveRules,
  updateSubmissionScore,
}
