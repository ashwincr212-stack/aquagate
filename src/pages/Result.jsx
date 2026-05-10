import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { getResultBySubmissionId } from '../data/mockData.js'
import { getSubmission } from '../services/firestoreService.js'
import { getCandidateStatusLabel } from '../utils/statusUtils.js'

const resultMap = {
  shortlisted: {
    title: 'Shortlisted',
    copy: 'Your application cleared the current mock screening rules. In production, shortlisted candidates would receive the next-step access link.',
  },
  waitlisted: {
    title: 'Waitlisted',
    copy: 'Your application is in a holding queue while seat allocation and priority rules are reviewed.',
  },
  review: {
    title: 'Under Review',
    copy: 'Your submission entered the manual review lane because it is close to the active criteria thresholds.',
  },
  borderline_review: {
    title: 'Borderline Review',
    copy: 'Your submission needs manual review before a final decision is made.',
  },
  rejected: {
    title: 'Rejected',
    copy: 'Your current score did not meet the configured selection thresholds.',
  },
  pending_ai_score: {
    title: 'Pending Review',
    copy: 'Your submission is waiting for the scoring pipeline.',
  },
}

function formatSubmittedAt(value) {
  if (!value) {
    return 'Pending timestamp sync'
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate().toLocaleString()
  }

  if (typeof value === 'string') {
    return value
  }

  return 'Pending timestamp sync'
}

function Result() {
  const { submissionId } = useParams()
  const [searchParams] = useSearchParams()
  const statusKey = searchParams.get('status') ?? 'shortlisted'
  const submission = useMemo(() => getResultBySubmissionId(submissionId), [submissionId])
  const result = resultMap[statusKey] ?? resultMap.shortlisted
  const [firestoreSubmission, setFirestoreSubmission] = useState(null)
  const [loading, setLoading] = useState(submissionId !== 'mock-submission')
  const [error, setError] = useState('')

  useEffect(() => {
    if (submissionId === 'mock-submission') {
      setLoading(false)
      setError('')
      return
    }

    let cancelled = false

    async function loadSubmission() {
      try {
        setLoading(true)
        setError('')
        const nextSubmission = await getSubmission(submissionId)

        if (!cancelled) {
          if (nextSubmission) {
            setFirestoreSubmission(nextSubmission)
          } else {
            setError('Submission not found.')
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(`Unable to load submission. ${loadError.message}`)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSubmission()

    return () => {
      cancelled = true
    }
  }, [submissionId])

  if (submissionId !== 'mock-submission') {
    if (loading) {
      return (
        <section className="result-shell panel panel--glow">
          <div className="result-badge">Loading</div>
          <h1>Loading submission...</h1>
          <p className="hero-copy">Fetching your latest assessment status from AquaGate.</p>
        </section>
      )
    }

    if (error || !firestoreSubmission) {
      return (
        <section className="result-shell panel panel--glow">
          <div className="result-badge">Unavailable</div>
          <h1>Submission unavailable</h1>
          <p className="hero-copy">{error || 'We could not find this submission.'}</p>
        </section>
      )
    }

    return (
      <section className="result-shell panel panel--glow">
        <div className="result-badge">{getCandidateStatusLabel(firestoreSubmission.status ?? 'pending_ai_score')}</div>
        <h1>
          {(firestoreSubmission.status ?? 'pending_ai_score') === 'pending_ai_score'
            ? 'Your assessment has been submitted.'
            : 'Your assessment has been scored.'}
        </h1>
        <p className="hero-copy">
          {(firestoreSubmission.status ?? 'pending_ai_score') === 'pending_ai_score'
            ? 'AI review is not connected yet. Current status: Pending AI score.'
            : (resultMap[firestoreSubmission.status]?.copy ?? 'Your submission has an updated review outcome.')}
        </p>

        <div className="result-grid">
          <div className="info-card">
            <p>Submission ID</p>
            <strong>{submissionId}</strong>
          </div>
          <div className="info-card">
            <p>Program</p>
            <strong>{firestoreSubmission.programTitle || firestoreSubmission.programSlug}</strong>
          </div>
          <div className="info-card">
            <p>Total questions</p>
            <strong>{firestoreSubmission.totalQuestions}</strong>
          </div>
          {typeof firestoreSubmission.totalScore === 'number' ? (
            <div className="info-card">
              <p>Total score</p>
              <strong>{firestoreSubmission.totalScore}</strong>
            </div>
          ) : null}
        </div>

        <article className="panel result-note">
          <h3>Current review state</h3>
          <p>Status: {firestoreSubmission.status}</p>
          <p>Submitted at: {formatSubmittedAt(firestoreSubmission.submittedAt)}</p>
          {typeof firestoreSubmission.totalScore === 'number' ? <p>Score: {firestoreSubmission.totalScore}</p> : null}
          {firestoreSubmission.scoredAt ? <p>Scored at: {formatSubmittedAt(firestoreSubmission.scoredAt)}</p> : null}
        </article>

        {(firestoreSubmission.status ?? 'pending_ai_score') !== 'pending_ai_score' ? (
          <>
            <article className="panel result-note">
              <h3>AI summary</h3>
              <p>{firestoreSubmission.aiSummary || 'Summary not available.'}</p>
              <p>{firestoreSubmission.aiRecommendation || 'Recommendation not available.'}</p>
            </article>

            {Array.isArray(firestoreSubmission.aiScores) && firestoreSubmission.aiScores.length ? (
              <article className="panel result-note">
                <h3>Per-question feedback</h3>
                {firestoreSubmission.aiScores.map((scoreItem) => (
                  <p key={`${firestoreSubmission.id}-feedback-${scoreItem.questionId}`}>
                    Q{scoreItem.order}: {scoreItem.score}/{scoreItem.maxScore} | {scoreItem.feedback}
                  </p>
                ))}
              </article>
            ) : null}
          </>
        ) : null}
      </section>
    )
  }

  return (
    <section className="result-shell panel panel--glow">
      <div className="result-badge">{result.title}</div>
      <h1>Application status updated</h1>
      <p className="hero-copy">{result.copy}</p>

      <div className="result-grid">
        <div className="info-card">
          <p>Submission ID</p>
          <strong>{submissionId}</strong>
        </div>
        <div className="info-card">
          <p>Program</p>
          <strong>{submission.program}</strong>
        </div>
        <div className="info-card">
          <p>Mock score</p>
          <strong>{submission.score}/100</strong>
        </div>
      </div>

      <article className="panel result-note">
        <h3>Confirmation</h3>
        <p>
          This result page is mock-only for Step 1. Final builds can later attach the criteria version, AI feedback,
          email dispatch, and course-access handoff.
        </p>
      </article>
    </section>
  )
}

export default Result
