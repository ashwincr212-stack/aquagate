import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase.js'

function requireDb() {
  if (!db) {
    throw new Error('Firestore is not configured. Check the Vite Firebase env variables.')
  }

  return db
}

function withServerTimestamps(data, { isUpdate = false } = {}) {
  return {
    ...data,
    ...(isUpdate ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
  }
}

/*
 Intended Firestore collections for AquaGate:
 programs/{programId}
 questions/{questionId}
 selectionRules/{ruleId}
 candidates/{candidateId}
 submissions/{submissionId}
 accessGrants/{grantId}
 admins/{adminUid}
*/

// Programs
export async function getPrograms() {
  const snapshot = await getDocs(query(collection(requireDb(), 'programs'), orderBy('createdAt', 'desc')))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function getActivePrograms() {
  const snapshot = await getDocs(
    query(collection(requireDb(), 'programs'), where('active', '==', true), orderBy('createdAt', 'desc')),
  )
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function getProgramBySlug(programSlug) {
  const snapshot = await getDocs(
    query(collection(requireDb(), 'programs'), where('slug', '==', programSlug), where('active', '==', true)),
  )

  if (snapshot.empty) {
    return null
  }

  const program = snapshot.docs[0]
  return { id: program.id, ...program.data() }
}

export async function getProgramForPublic(programSlug) {
  const database = requireDb()

  if (programSlug === 'demo-course') {
    const snapshot = await getDoc(doc(database, 'programs', programSlug))
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
  }

  const snapshot = await getDocs(query(collection(database, 'programs'), where('slug', '==', programSlug)))

  if (snapshot.empty) {
    return null
  }

  const program = snapshot.docs[0]
  return { id: program.id, ...program.data() }
}

export async function createProgram(programData) {
  const docRef = await addDoc(
    collection(requireDb(), 'programs'),
    withServerTimestamps({
      active: true,
      version: 1,
      ...programData,
    }),
  )

  return docRef.id
}

export async function updateProgram(programId, updates) {
  await updateDoc(doc(requireDb(), 'programs', programId), withServerTimestamps(updates, { isUpdate: true }))
}

// Questions
export async function getQuestions(programId) {
  const snapshot = await getDocs(
    query(
      collection(requireDb(), 'questions'),
      where('programId', '==', programId),
      where('active', '==', true),
      orderBy('order', 'asc'),
    ),
  )

  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function getQuestionsForProgramSlug(programSlug) {
  const snapshot = await getDocs(query(collection(requireDb(), 'questions'), where('programSlug', '==', programSlug)))

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((question) => question.isActive !== false && question.active !== false)
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
}

export async function createQuestion(programId, questionData) {
  const docRef = await addDoc(
    collection(requireDb(), 'questions'),
    withServerTimestamps({
      programId,
      active: true,
      version: 1,
      ...questionData,
    }),
  )

  return docRef.id
}

export async function updateQuestion(programId, questionId, updates) {
  await updateDoc(
    doc(requireDb(), 'questions', questionId),
    withServerTimestamps(
      {
        ...updates,
        programId,
      },
      { isUpdate: true },
    ),
  )
}

export async function deactivateQuestion(programId, questionId) {
  await updateDoc(
    doc(requireDb(), 'questions', questionId),
    withServerTimestamps(
      {
        programId,
        active: false,
        deactivatedAt: serverTimestamp(),
      },
      { isUpdate: true },
    ),
  )
}

// Rules
export async function getActiveRules(programId) {
  const snapshot = await getDocs(
    query(
      collection(requireDb(), 'selectionRules'),
      where('programId', '==', programId),
      where('active', '==', true),
      orderBy('version', 'desc'),
    ),
  )

  if (snapshot.empty) {
    return null
  }

  const rule = snapshot.docs[0]
  return { id: rule.id, ...rule.data() }
}

export async function createRulesVersion(programId, rulesData) {
  const activeRule = await getActiveRules(programId)
  const nextVersion = (activeRule?.version ?? 0) + 1
  const docRef = await addDoc(
    collection(requireDb(), 'selectionRules'),
    withServerTimestamps({
      programId,
      active: true,
      version: nextVersion,
      ...rulesData,
    }),
  )

  return docRef.id
}

export async function deactivateOldRules(programId) {
  const snapshot = await getDocs(
    query(collection(requireDb(), 'selectionRules'), where('programId', '==', programId), where('active', '==', true)),
  )
  const batch = writeBatch(requireDb())

  snapshot.forEach((item) => {
    batch.update(item.ref, {
      active: false,
      deactivatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })

  await batch.commit()
}

// Candidates
export async function createCandidate(candidateData) {
  const docRef = await addDoc(
    collection(requireDb(), 'candidates'),
    withServerTimestamps({
      status: 'registered',
      ...candidateData,
    }),
  )

  return docRef.id
}

export async function getCandidate(candidateId) {
  const snapshot = await getDoc(doc(requireDb(), 'candidates', candidateId))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export async function updateCandidate(candidateId, updates) {
  await updateDoc(doc(requireDb(), 'candidates', candidateId), withServerTimestamps(updates, { isUpdate: true }))
}

// Submissions
export async function createSubmission(submissionData) {
  const docRef = await addDoc(
    collection(requireDb(), 'submissions'),
    withServerTimestamps({
      status: 'pending_ai_score',
      borderline: false,
      submittedAt: serverTimestamp(),
      scoredAt: null,
      ...submissionData,
    }),
  )

  return docRef.id
}

export async function getSubmission(submissionId) {
  const snapshot = await getDoc(doc(requireDb(), 'submissions', submissionId))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export async function updateSubmission(submissionId, updates) {
  await updateDoc(doc(requireDb(), 'submissions', submissionId), withServerTimestamps(updates, { isUpdate: true }))
}

export async function getSubmissionsByProgram(programId) {
  const snapshot = await getDocs(query(collection(requireDb(), 'submissions'), where('programId', '==', programId)))

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((left, right) => {
      const leftMillis = typeof left.submittedAt?.toMillis === 'function' ? left.submittedAt.toMillis() : 0
      const rightMillis = typeof right.submittedAt?.toMillis === 'function' ? right.submittedAt.toMillis() : 0
      return rightMillis - leftMillis
    })
}

export async function getAllSubmissions() {
  const snapshot = await getDocs(collection(requireDb(), 'submissions'))
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((left, right) => {
      const leftMillis = typeof left.submittedAt?.toMillis === 'function' ? left.submittedAt.toMillis() : 0
      const rightMillis = typeof right.submittedAt?.toMillis === 'function' ? right.submittedAt.toMillis() : 0
      return rightMillis - leftMillis
    })
}
