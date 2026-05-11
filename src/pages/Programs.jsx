import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPrograms } from '../services/firestoreService.js'

function formatDate(value) {
  if (!value) {
    return ''
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate().toLocaleDateString()
  }

  if (typeof value === 'string') {
    return value
  }

  return ''
}

function normalizeProgram(program) {
  return {
    id: program.id,
    title: program.title ?? program.name ?? 'Untitled Program',
    slug: program.slug ?? '',
    description:
      program.description ?? 'A premium screening gateway designed to assess fit before access is granted.',
    isActive: program.isActive ?? program.active ?? false,
    category: program.category ?? program.programType ?? '',
    cohortLabel: program.cohortLabel ?? '',
    seatsAvailable:
      typeof program.seatsAvailable === 'number'
        ? program.seatsAvailable
        : typeof program.seats === 'number'
          ? program.seats
          : null,
    startDate: program.startDate ?? '',
    endDate: program.endDate ?? '',
    createdAt: program.createdAt ?? null,
    updatedAt: program.updatedAt ?? null,
  }
}

function getTimestampValue(value) {
  if (typeof value?.toMillis === 'function') {
    return value.toMillis()
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function getProgramSortValue(program) {
  return Math.max(getTimestampValue(program.updatedAt), getTimestampValue(program.createdAt))
}

function getProgramStatus(program) {
  return program.seatsAvailable === 0 ? 'Closed' : 'Open'
}

function dedupePrograms(programs) {
  const programMap = new Map()

  programs.forEach((program) => {
    const key = program.slug || program.id
    const current = programMap.get(key)

    if (!current) {
      programMap.set(key, program)
      return
    }

    const currentIsActive = current.isActive === true
    const nextIsActive = program.isActive === true

    if (nextIsActive && !currentIsActive) {
      programMap.set(key, program)
      return
    }

    if (nextIsActive === currentIsActive && getProgramSortValue(program) > getProgramSortValue(current)) {
      programMap.set(key, program)
    }
  })

  return [...programMap.values()]
}

function Programs() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadPrograms = async () => {
    try {
      setLoading(true)
      setError('')
      const nextPrograms = dedupePrograms((await getPrograms()).map(normalizeProgram))
        .filter((program) => program.isActive === true)
        .sort((left, right) => {
          const rightCreatedAt = getProgramSortValue(right)
          const leftCreatedAt = getProgramSortValue(left)

          if (rightCreatedAt !== leftCreatedAt) {
            return rightCreatedAt - leftCreatedAt
          }

          return left.title.localeCompare(right.title)
        })

      setPrograms(nextPrograms)
    } catch (loadError) {
      setError(`Unable to load active programs from Firestore. ${loadError.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrograms()
  }, [])

  const hasPrograms = useMemo(() => programs.length > 0, [programs])

  if (loading) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Programs</p>
        <h1>Loading active programs...</h1>
        <p className="hero-copy">Fetching real AquaGate program records from Firestore.</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Programs</p>
        <h1>Unable to load programs</h1>
        <p className="error-copy">{error}</p>
        <div className="button-row">
          <button type="button" className="button" onClick={loadPrograms}>
            Retry
          </button>
        </div>
      </section>
    )
  }

  if (!hasPrograms) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Programs</p>
        <h1>No active programs are open right now.</h1>
        <p className="hero-copy">Please check back later for new cohorts and enrollment windows.</p>
      </section>
    )
  }

  return (
    <div className="stack-lg">
      <section className="panel panel--glow">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Programs</p>
            <h1>Explore active AquaGate programs</h1>
          </div>
        </div>
        <p className="hero-copy">
          Browse the latest active gateways, review program details, and start your registration when you are ready.
        </p>
      </section>

      <section className="program-grid">
        {programs.map((program) => (
          <article key={program.id} className="program-card panel">
            <div className="program-card__head">
              <div>
                <p className="eyebrow">{program.category || 'Program'}</p>
                <h3>{program.title}</h3>
              </div>
              <span className={`status-pill ${getProgramStatus(program) === 'Open' ? '' : 'status-pill--soft'}`}>
                {getProgramStatus(program)}
              </span>
            </div>

            <p className="muted">{program.description}</p>

            <div className="detail-stack">
              {program.cohortLabel ? (
                <div className="info-card">
                  <p>Cohort</p>
                  <strong>{program.cohortLabel}</strong>
                </div>
              ) : null}

              {typeof program.seatsAvailable === 'number' ? (
                <div className="info-card">
                  <p>Seats available</p>
                  <strong>{program.seatsAvailable}</strong>
                </div>
              ) : null}

              {program.startDate || program.endDate ? (
                <div className="info-card">
                  <p>Schedule</p>
                  <strong>
                    {program.startDate ? formatDate(program.startDate) : 'Start TBD'}
                    {program.endDate ? ` - ${formatDate(program.endDate)}` : ''}
                  </strong>
                </div>
              ) : null}
            </div>

            <div className="program-card__actions">
              {getProgramStatus(program) === 'Open' ? (
                <Link to={`/register/${program.slug}`} className="button">
                  Apply / Register
                </Link>
              ) : (
                <button type="button" className="button button--ghost" disabled>
                  Closed
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

export default Programs
