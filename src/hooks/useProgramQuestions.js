import { useEffect, useState } from 'react'
import { mockQuestions } from '../data/mockData.js'
import { getQuestionsForProgramSlug } from '../services/firestoreService.js'

function normalizeQuestion(question, index) {
  return {
    id: question.id ?? `question-${index + 1}`,
    order: question.order ?? index + 1,
    questionText: question.questionText ?? question.prompt ?? 'Untitled question',
    prompt: question.prompt ?? question.questionText ?? 'Untitled question',
    maxScore: question.maxScore ?? 10,
  }
}

export function useProgramQuestions(programSlug) {
  const [state, setState] = useState({
    loading: true,
    questions: [],
    error: '',
    fallbackMessage: '',
    source: 'loading',
  })

  useEffect(() => {
    let cancelled = false

    async function loadQuestions() {
      setState({
        loading: true,
        questions: [],
        error: '',
        fallbackMessage: '',
        source: 'loading',
      })

      try {
        const firestoreQuestions = await getQuestionsForProgramSlug(programSlug)

        if (!cancelled && firestoreQuestions.length > 0) {
          setState({
            loading: false,
            questions: firestoreQuestions.map(normalizeQuestion),
            error: '',
            fallbackMessage: '',
            source: 'firestore',
          })
          return
        }

        const canUseMock = programSlug !== 'demo-course'

        if (!cancelled && canUseMock && mockQuestions.length > 0) {
          setState({
            loading: false,
            questions: mockQuestions.map(normalizeQuestion),
            error: '',
            fallbackMessage: 'Using local mock questions because no Firestore questions were found for this program.',
            source: 'mock',
          })
          return
        }

        if (!cancelled) {
          setState({
            loading: false,
            questions: [],
            error: 'No assessment questions were found for this program.',
            fallbackMessage: '',
            source: 'missing',
          })
        }
      } catch (error) {
        const canUseMock = programSlug !== 'demo-course'

        if (!cancelled && canUseMock && mockQuestions.length > 0) {
          setState({
            loading: false,
            questions: mockQuestions.map(normalizeQuestion),
            error: '',
            fallbackMessage: `Firestore is unavailable right now. Showing local mock questions instead. ${error.message}`,
            source: 'mock',
          })
          return
        }

        if (!cancelled) {
          setState({
            loading: false,
            questions: [],
            error: `Unable to load assessment questions from Firestore. ${error.message}`,
            fallbackMessage: '',
            source: 'error',
          })
        }
      }
    }

    loadQuestions()

    return () => {
      cancelled = true
    }
  }, [programSlug])

  return state
}
