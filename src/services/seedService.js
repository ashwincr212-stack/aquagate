import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { demoProgram, demoQuestions, demoSelectionRules } from '../data/demoSeedData.js'
import { db } from '../firebase.js'

function mapProgramToDocument(program) {
  return {
    name: program.title,
    title: program.title,
    slug: program.slug,
    description: program.description,
    category: 'Course',
    active: program.isActive,
    isActive: program.isActive,
    accessUrl: program.courseAccessUrl,
    courseAccessUrl: program.courseAccessUrl,
    programId: program.slug,
    programSlug: program.slug,
    questionVersion: program.questionVersion,
    criteriaVersion: program.criteriaVersion,
    highlights: ['Seeded demo program for AquaGate development'],
    eligibility: ['Demo seed data only'],
    timeline: ['Program seeded', 'Questions seeded', 'Rules seeded'],
    intake: 'Demo',
    seats: 0,
  }
}

function mapQuestionToDocument(programId, question) {
  return {
    programId,
    programSlug: demoProgram.slug,
    prompt: question.questionText,
    questionText: question.questionText,
    modelAnswer: question.modelAnswer,
    rubric: question.rubric,
    rubricMarks: `Correctness ${question.rubric.correctness}, Clarity ${question.rubric.clarity}, Depth ${question.rubric.depth}, Examples ${question.rubric.examples}`,
    maxScore: question.maxScore,
    order: question.order,
    active: question.isActive,
    isActive: question.isActive,
    version: demoProgram.questionVersion,
  }
}

function mapRulesToDocument(programId, rules) {
  return {
    programId,
    programSlug: demoProgram.slug,
    active: rules.isActive,
    isActive: rules.isActive,
    version: rules.criteriaVersion,
    criteriaVersion: rules.criteriaVersion,
    shortlistCutoff: rules.minShortlistScore,
    minShortlistScore: rules.minShortlistScore,
    waitlistCutoff: rules.minWaitlistScore,
    minWaitlistScore: rules.minWaitlistScore,
    borderlineRange: {
      min: rules.borderlineMinScore,
      max: rules.minShortlistScore - 1,
    },
    borderlineMinScore: rules.borderlineMinScore,
    minimumScorePerQuestion: rules.minEachQuestionScore,
    minEachQuestionScore: rules.minEachQuestionScore,
    aiStrictnessLevel: rules.aiStrictnessLevel,
    autoShortlist: rules.autoShortlist,
    manualReview: rules.manualReviewEnabled,
    manualReviewEnabled: rules.manualReviewEnabled,
    autoEmail: rules.autoEmailEnabled,
    autoEmailEnabled: rules.autoEmailEnabled,
    requiredKeywords: [],
    negativeFlags: [],
    questionWeightage: {},
    aiRubricTemplate: {
      correctness: 2,
      clarity: 2,
      depth: 3,
      examples: 3,
    },
  }
}

function withServerTimestamps(data) {
  return {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

async function getDemoProgramDocument() {
  if (!db) {
    throw new Error('Firestore is not configured. Check the Vite Firebase env variables.')
  }

  const programRef = doc(db, 'programs', demoProgram.slug)
  const snapshot = await getDoc(programRef)
  return { programRef, snapshot }
}

export async function seedDemoProgram() {
  const { programRef, snapshot } = await getDemoProgramDocument()

  if (snapshot.exists()) {
    return {
      created: false,
      programId: demoProgram.slug,
      message: 'Demo program already exists in Firestore.',
    }
  }

  const programId = demoProgram.slug

  await setDoc(programRef, withServerTimestamps(mapProgramToDocument(demoProgram)))

  await Promise.all(
    demoQuestions.map((question) =>
      addDoc(collection(db, 'questions'), withServerTimestamps(mapQuestionToDocument(programId, question))),
    ),
  )

  await setDoc(
    doc(db, 'selectionRules', `${demoProgram.slug}-v${demoSelectionRules.criteriaVersion}`),
    withServerTimestamps(mapRulesToDocument(programId, demoSelectionRules)),
  )

  return {
    created: true,
    programId,
    message: 'Demo program, 10 questions, and default selection rules were seeded successfully.',
  }
}
