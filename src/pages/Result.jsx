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
  admin_approved: {
    title: 'Congratulations - you have been approved.',
    copy: 'Your application has been approved by the admin team.',
  },
  admin_rejected: {
    title: 'Application not selected.',
    copy: 'Your application was reviewed, but was not selected at this stage.',
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

function getScoringSourceLabel(submission) {
  if (submission?.backendScoringSource === 'gemini_real_local' || submission?.realAiUsed === true) {
    return 'Gemini AI Review'
  }

  if (submission?.backendScoringSource === 'firebase_function_mock') {
    return 'Backend Mock Review'
  }

  if (submission?.backendScoringSource === 'frontend_mock') {
    return 'Dev Mock Review'
  }

  if (!submission?.backendScoringSource && submission?.futureProvider === 'gemini') {
    return 'Gemini AI Review'
  }

  return 'Dev Mock Review'
}

function getAnswerMaxScore(submission, aiScoreItem, index) {
  const directScoreMax = Number(aiScoreItem?.maxScore)
  if (directScoreMax > 0) {
    return directScoreMax
  }

  const matchingAnswer = Array.isArray(submission?.answers)
    ? submission.answers.find((answer) => answer?.questionId === aiScoreItem?.questionId)
    : null
  const matchingAnswerMax = Number(matchingAnswer?.maxScore)
  if (matchingAnswerMax > 0) {
    return matchingAnswerMax
  }

  const indexedAnswerMax = Number(submission?.answers?.[index]?.maxScore)
  if (indexedAnswerMax > 0) {
    return indexedAnswerMax
  }

  return 10
}

function getTotalMaxScore(submission) {
  const answerTotal = Array.isArray(submission?.answers)
    ? submission.answers.reduce((sum, item) => sum + Number(item?.maxScore || 10), 0)
    : 0

  if (answerTotal > 0) {
    return answerTotal
  }

  const aiScoreTotal = Array.isArray(submission?.aiScores)
    ? submission.aiScores.reduce((sum, item) => sum + Number(item?.maxScore || 10), 0)
    : 0

  if (aiScoreTotal > 0) {
    return aiScoreTotal
  }

  const fallbackTotal = Number(submission?.totalQuestions ?? 0) * 10
  return fallbackTotal > 0 ? fallbackTotal : 100
}

function getResultHeroContent(status) {
  if (status === 'admin_approved') {
    return {
      title: 'Congratulations - you have been approved.',
      subtitle: 'Your application has been approved by the admin team.',
    }
  }

  if (status === 'admin_rejected') {
    return {
      title: 'Application not selected.',
      subtitle: 'Your application was reviewed, but was not selected at this stage.',
    }
  }

  if (status === 'waitlisted') {
    return {
      title: 'You are on the waitlist.',
      subtitle: 'Your application is being held for seat availability or priority review.',
    }
  }

  if (status === 'borderline_review') {
    return {
      title: 'Manual review in progress.',
      subtitle: 'Your application needs additional review before a final decision.',
    }
  }

  if (status === 'pending_ai_score') {
    return {
      title: 'Your assessment has been submitted.',
      subtitle: 'The admin team will review your submission. AI scoring may run before the final decision.',
    }
  }

  return {
    title: 'Your assessment has been scored.',
    subtitle: 'The admin team will review the result before a final decision.',
  }
}

function getNextStepCopy(status) {
  if (status === 'admin_approved') {
    return 'The team can now contact you with next steps.'
  }

  if (status === 'waitlisted') {
    return 'You may be contacted if a seat opens or your priority changes.'
  }

  if (status === 'admin_rejected') {
    return 'You can improve your application and try again in a future cohort.'
  }

  if (status === 'borderline_review') {
    return 'The admin team may manually review your application.'
  }

  return 'The admin team will review your assessment.'
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

    const currentStatus = firestoreSubmission.status ?? 'pending_ai_score'
    const heroContent = getResultHeroContent(currentStatus)
    const nextStepCopy = getNextStepCopy(currentStatus)
    const hasScoredState = currentStatus !== 'pending_ai_score'

    return (
      <section className="result-shell panel panel--glow">
        <section className="score-hero-card">
          <div className="score-hero-card__head">
            <div className="score-hero-copy">
              <div className="result-badge">{getCandidateStatusLabel(currentStatus)}</div>
              <h1>{heroContent.title}</h1>
              <p className="hero-copy">{heroContent.subtitle}</p>
            </div>
            {typeof firestoreSubmission.totalScore === 'number' ? (
              <div className="score-total-pill">
                <span>Overall Score</span>
                <strong>{firestoreSubmission.totalScore} / {getTotalMaxScore(firestoreSubmission)}</strong>
              </div>
            ) : null}
          </div>

          <div className="score-meta-grid">
            <div className="info-card">
              <p>Scoring source</p>
              <strong>{getScoringSourceLabel(firestoreSubmission)}</strong>
            </div>
            <div className="info-card">
              <p>Program</p>
              <strong>{firestoreSubmission.programTitle || firestoreSubmission.programSlug}</strong>
            </div>
            <div className="info-card">
              <p>Submitted at</p>
              <strong>{formatSubmittedAt(firestoreSubmission.submittedAt)}</strong>
            </div>
            <div className="info-card">
              <p>Scored at</p>
              <strong>{formatSubmittedAt(firestoreSubmission.scoredAt)}</strong>
            </div>
          </div>
        </section>

        <div className="result-grid result-grid--wide result-grid--compact">
          <article className="panel result-note">
            <h3>What happens next?</h3>
            <p>{nextStepCopy}</p>
          </article>

          {firestoreSubmission.adminDecisionNote ? (
            <article className="panel result-note">
              <h3>Admin Note</h3>
              <p>{firestoreSubmission.adminDecisionNote}</p>
            </article>
          ) : null}
        </div>

        {hasScoredState ? (
          <>
            <div className="result-grid result-grid--wide result-grid--compact">
              <article className="panel result-note">
                <h3>AI Summary</h3>
                <p>{firestoreSubmission.aiSummary || 'Summary not available.'}</p>
              </article>

              <article className="panel result-note">
                <h3>Recommendation</h3>
                <p>{firestoreSubmission.aiRecommendation || 'Recommendation not available.'}</p>
              </article>
            </div>

            {Array.isArray(firestoreSubmission.aiScores) && firestoreSubmission.aiScores.length ? (
              <article className="panel result-note feedback-board">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">AI Feedback</p>
                    <h3>Per-question feedback</h3>
                  </div>
                </div>
                <div className="feedback-card-grid feedback-card-grid--compact">
                  {firestoreSubmission.aiScores.map((scoreItem, index) => (
                    <div key={`${firestoreSubmission.id}-feedback-${scoreItem.questionId}`} className="feedback-card">
                      <div className="feedback-card__head">
                        <span className="status-pill status-pill--soft">Question {scoreItem.order}</span>
                        <strong>{scoreItem.score} / {getAnswerMaxScore(firestoreSubmission, scoreItem, index)}</strong>
                      </div>
                      <p>{scoreItem.feedback}</p>
                      {Array.isArray(scoreItem.strengths) && scoreItem.strengths.length ? (
                        <div className="feedback-tags">
                          {scoreItem.strengths.map((item) => (
                            <span key={`${scoreItem.questionId}-strength-${item}`} className="feedback-tag feedback-tag--strength">
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {Array.isArray(scoreItem.weaknesses) && scoreItem.weaknesses.length ? (
                        <div className="feedback-tags">
                          {scoreItem.weaknesses.map((item) => (
                            <span key={`${scoreItem.questionId}-weakness-${item}`} className="feedback-tag feedback-tag--weakness">
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>
            ) : null}
          </>
        ) : (
          <div className="result-grid result-grid--compact">
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
          </div>
        )}
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
