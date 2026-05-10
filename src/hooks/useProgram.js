import { useEffect, useState } from 'react'
import { programs as mockPrograms } from '../data/mockData.js'
import { getProgramForPublic } from '../services/firestoreService.js'

function getMockProgram(programSlug) {
  return mockPrograms.find((program) => program.slug === programSlug) ?? null
}

function normalizeProgram(program, fallbackSlug) {
  if (!program) {
    return null
  }

  return {
    id: program.id ?? program.programId ?? program.slug ?? fallbackSlug,
    title: program.title ?? program.name ?? 'Untitled Program',
    name: program.name ?? program.title ?? 'Untitled Program',
    description:
      program.description ??
      'A premium screening gateway designed to assess fit before access is granted.',
    courseAccessUrl: program.courseAccessUrl ?? program.accessUrl ?? '',
    accessUrl: program.accessUrl ?? program.courseAccessUrl ?? '',
    isActive: program.isActive ?? program.active ?? false,
    active: program.active ?? program.isActive ?? false,
    slug: program.slug ?? program.programSlug ?? fallbackSlug,
    category: program.category ?? 'Program',
    mode: program.mode ?? 'Online',
    duration: program.duration ?? 'Self-paced',
    intake: program.intake ?? 'Current intake',
    applicationsOpenUntil: program.applicationsOpenUntil ?? 'Currently open',
    highlights: program.highlights ?? [],
    eligibility: program.eligibility ?? [],
    timeline: program.timeline ?? [],
    seats: program.seats ?? 0,
  }
}

export function useProgram(programSlug) {
  const [state, setState] = useState({
    loading: true,
    program: null,
    error: '',
    fallbackMessage: '',
    source: 'loading',
  })

  useEffect(() => {
    let cancelled = false

    async function loadProgram() {
      setState({
        loading: true,
        program: null,
        error: '',
        fallbackMessage: '',
        source: 'loading',
      })

      try {
        const firestoreProgram = await getProgramForPublic(programSlug)

        if (!cancelled && firestoreProgram) {
          setState({
            loading: false,
            program: normalizeProgram(firestoreProgram, programSlug),
            error: '',
            fallbackMessage: '',
            source: 'firestore',
          })
          return
        }

        const mockProgram = getMockProgram(programSlug)

        if (!cancelled && mockProgram) {
          setState({
            loading: false,
            program: normalizeProgram(mockProgram, programSlug),
            error: '',
            fallbackMessage: 'Using local mock program data because this Firestore program was not found.',
            source: 'mock',
          })
          return
        }

        if (!cancelled) {
          setState({
            loading: false,
            program: null,
            error: 'Program not found.',
            fallbackMessage: '',
            source: 'missing',
          })
        }
      } catch (error) {
        const mockProgram = getMockProgram(programSlug)

        if (!cancelled && mockProgram) {
          setState({
            loading: false,
            program: normalizeProgram(mockProgram, programSlug),
            error: '',
            fallbackMessage: `Firestore is unavailable right now. Showing local mock data instead. ${error.message}`,
            source: 'mock',
          })
          return
        }

        if (!cancelled) {
          setState({
            loading: false,
            program: null,
            error: `Unable to load program from Firestore. ${error.message}`,
            fallbackMessage: '',
            source: 'error',
          })
        }
      }
    }

    loadProgram()

    return () => {
      cancelled = true
    }
  }, [programSlug])

  return state
}
