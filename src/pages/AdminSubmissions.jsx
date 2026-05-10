import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CandidateTable from '../components/CandidateTable.jsx'
import { applyMockAiScore, prepareSubmissionForScoring } from '../services/aiScoringService.js'
import { getActiveRules, getAllSubmissions, getCandidate, getQuestions, updateSubmission } from '../services/firestoreService.js'
import { getCandidateStatusLabel } from '../utils/statusUtils.js'

function formatTimestamp(value) {
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

function normalizeSubmissionForAdmin(submission, candidate) {
  const status = submission.status ?? 'pending_ai_score'

  return {
    id: submission.id,
    candidateId: submission.candidateId ?? '',
    programId: submission.programId ?? '',
    name: candidate?.fullName ?? 'Unknown Candidate',
    email: candidate?.email ?? 'Unavailable',
    phone: candidate?.phone ?? 'Unavailable',
    city: candidate?.city ?? 'Unavailable',
    qualification: candidate?.qualification ?? 'Unavailable',
    experience: candidate?.experience ?? 'Unavailable',
    programTitle: submission.programTitle ?? submission.programSlug ?? 'Untitled Program',
    programSlug: submission.programSlug ?? '',
    status,
    statusLabel: getCandidateStatusLabel(status),
    score: submission.totalScore,
    scoreLabel: submission.totalScore == null ? 'Pending' : `${submission.totalScore}`,
    borderline: Boolean(submission.borderline),
    aiSummary: submission.aiSummary ?? '',
    aiRecommendation: submission.aiRecommendation ?? '',
    aiScores: Array.isArray(submission.aiScores) ? submission.aiScores : [],
    ruleUsedSnapshot: submission.ruleUsedSnapshot ?? null,
    submittedAt: submission.submittedAt ?? null,
    submittedAtLabel: formatTimestamp(submission.submittedAt),
    scoredAtLabel: formatTimestamp(submission.scoredAt),
    emailSent: Boolean(submission.emailSent),
    adminDecision: submission.adminDecision ?? 'Pending',
    adminNotes: submission.adminNotes ?? '',
    totalQuestions: submission.totalQuestions ?? submission.answers?.length ?? 0,
    answers: Array.isArray(submission.answers) ? submission.answers : [],
  }
}

function AdminSubmissions() {
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionState, setActionState] = useState({ saving: false, error: '' })
  const isDevMode = import.meta.env.DEV === true

  useEffect(() => {
    let cancelled = false

    async function loadSubmissions() {
      try {
        setLoading(true)
        setError('')

        const submissionRows = await getAllSubmissions()
        const mergedRows = await Promise.all(
          submissionRows.map(async (submission) => {
            const candidate = submission.candidateId ? await getCandidate(submission.candidateId) : null
            return normalizeSubmissionForAdmin(submission, candidate)
          }),
        )

        if (!cancelled) {
          setSubmissions(mergedRows)
          setSelectedCandidate((current) => current ?? mergedRows[0] ?? null)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(`Unable to load submissions from Firestore. ${loadError.message}`)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSubmissions()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredSubmissions = useMemo(() => {
    if (activeFilter === 'all') {
      return submissions
    }

    return submissions.filter((submission) => submission.status === activeFilter)
  }, [activeFilter, submissions])

  useEffect(() => {
    if (!filteredSubmissions.length) {
      setSelectedCandidate(null)
      return
    }

    setSelectedCandidate((current) => {
      if (current && filteredSubmissions.some((submission) => submission.id === current.id)) {
        return filteredSubmissions.find((submission) => submission.id === current.id) ?? filteredSubmissions[0]
      }

      return filteredSubmissions[0]
    })
  }, [filteredSubmissions])

  const updateDecision = async (adminDecision, status) => {
    if (!selectedCandidate) {
      return
    }

    try {
      setActionState({ saving: true, error: '' })
      await updateSubmission(selectedCandidate.id, {
        adminDecision,
        adminDecisionAt: new Date().toISOString(),
        status,
        borderline: status === 'borderline_review',
      })

      setSubmissions((current) =>
        current.map((submission) =>
          submission.id === selectedCandidate.id
            ? {
                ...submission,
                adminDecision,
                status,
                statusLabel: getCandidateStatusLabel(status),
                borderline: status === 'borderline_review',
              }
            : submission,
        ),
      )
      setSelectedCandidate((current) =>
        current
          ? {
              ...current,
              adminDecision,
              status,
              statusLabel: getCandidateStatusLabel(status),
              borderline: status === 'borderline_review',
            }
          : current,
      )
    } catch (saveError) {
      setActionState({ saving: false, error: `Unable to update submission. ${saveError.message}` })
      return
    }

    setActionState({ saving: false, error: '' })
  }

  const handleMockAiScore = async () => {
    if (!selectedCandidate) {
      return
    }

    try {
      setActionState({ saving: true, error: '' })

      // This stays dev-only on the frontend. Real AI scoring must move to
      // Firebase Cloud Functions or another backend so API keys never ship in Vite.
      const [questions, activeRules] = await Promise.all([
        getQuestions({
          programId: selectedCandidate.programId,
          programSlug: selectedCandidate.programSlug,
        }),
        getActiveRules({
          programId: selectedCandidate.programId,
          programSlug: selectedCandidate.programSlug,
        }),
      ])

      const preparedSubmission = prepareSubmissionForScoring(selectedCandidate, questions, activeRules ?? {})
      const mockScore = applyMockAiScore(preparedSubmission, activeRules ?? {})

      await updateSubmission(selectedCandidate.id, {
        status: mockScore.status,
        borderline: mockScore.borderline,
        totalScore: mockScore.totalScore,
        aiScores: mockScore.aiScores,
        aiSummary: mockScore.aiSummary,
        aiRecommendation: mockScore.aiRecommendation,
        ruleUsedSnapshot: mockScore.ruleUsedSnapshot,
        aiRubricUsedSnapshot: mockScore.aiRubricUsedSnapshot,
        scoredAt: mockScore.scoredAt,
      })

      setSubmissions((current) =>
        current.map((submission) =>
          submission.id === selectedCandidate.id
            ? {
                ...submission,
                status: mockScore.status,
                statusLabel: getCandidateStatusLabel(mockScore.status),
                borderline: mockScore.borderline,
                score: mockScore.totalScore,
                scoreLabel: `${mockScore.totalScore}`,
                aiSummary: mockScore.aiSummary,
                aiRecommendation: mockScore.aiRecommendation,
                aiScores: mockScore.aiScores,
                ruleUsedSnapshot: mockScore.ruleUsedSnapshot,
                scoredAtLabel: formatTimestamp(mockScore.scoredAt),
              }
            : submission,
        ),
      )

      setSelectedCandidate((current) =>
        current
          ? {
              ...current,
              status: mockScore.status,
              statusLabel: getCandidateStatusLabel(mockScore.status),
              borderline: mockScore.borderline,
              score: mockScore.totalScore,
              scoreLabel: `${mockScore.totalScore}`,
              aiSummary: mockScore.aiSummary,
              aiRecommendation: mockScore.aiRecommendation,
              aiScores: mockScore.aiScores,
              ruleUsedSnapshot: mockScore.ruleUsedSnapshot,
              scoredAtLabel: formatTimestamp(mockScore.scoredAt),
            }
          : current,
      )
    } catch (saveError) {
      setActionState({ saving: false, error: `Unable to apply mock AI score. ${saveError.message}` })
      return
    }

    setActionState({ saving: false, error: '' })
  }

  if (loading) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Submissions</p>
        <h2>Loading real submissions...</h2>
        <p className="muted">Fetching candidate and submission records from Firestore.</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Submissions</p>
        <h2>Unable to load submissions</h2>
        <p className="error-copy">{error}</p>
      </section>
    )
  }

  if (!submissions.length) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Submissions</p>
        <h2>No real submissions yet</h2>
        <p className="muted">When candidates complete registration and submit assessments, they will appear here.</p>
      </section>
    )
  }

  return (
    <div className="submissions-layout">
      <CandidateTable
        submissions={filteredSubmissions}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onSelectCandidate={setSelectedCandidate}
        selectedCandidateId={selectedCandidate?.id}
      />

      <aside className="panel detail-panel">
        {selectedCandidate ? (
          <>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Candidate detail</p>
                <h3>{selectedCandidate.name}</h3>
              </div>
              <span className="status-pill">{selectedCandidate.statusLabel}</span>
            </div>

            <div className="detail-stack">
              <div className="info-card">
                <p>Profile</p>
                <strong>{selectedCandidate.email}</strong>
                <span>{selectedCandidate.phone}</span>
                <span>{selectedCandidate.city}</span>
                <span>{selectedCandidate.qualification}</span>
                <span>{selectedCandidate.experience}</span>
              </div>
              <div className="info-card">
                <p>Submission</p>
                <strong>{selectedCandidate.programTitle}</strong>
                <span>Status: {selectedCandidate.statusLabel}</span>
                <span>Total questions: {selectedCandidate.totalQuestions}</span>
                <span>Submitted at: {selectedCandidate.submittedAtLabel}</span>
              </div>
              <div className="info-card">
                <p>AI score</p>
                <strong>{selectedCandidate.score == null ? 'AI score pending' : `${selectedCandidate.score} total points`}</strong>
                <span>{selectedCandidate.borderline ? 'Marked borderline for manual review' : 'Scoring outcome stored on submission'}</span>
                <span>Scored at: {selectedCandidate.scoredAtLabel}</span>
              </div>
              <div className="info-card">
                <p>AI feedback</p>
                <strong>{selectedCandidate.aiRecommendation || 'AI feedback pending'}</strong>
                <span>{selectedCandidate.aiSummary || 'Awaiting AI scoring pipeline'}</span>
              </div>
              <div className="info-card">
                <p>Scoring notes</p>
                <span>Mock scoring is local/dev only in this step.</span>
                <span>Real AI must run in Firebase Cloud Functions or another backend only.</span>
                <span>Frontend must never contain AI API keys or provider secrets.</span>
              </div>
              <div className="info-card">
                <p>Answers</p>
                {selectedCandidate.answers.map((answer) => (
                  <span key={`${selectedCandidate.id}-${answer.questionId}`}>
                    Q{answer.order}: {answer.questionText} | Answer: {answer.answerText} | Max score: {answer.maxScore}
                  </span>
                ))}
              </div>
              {selectedCandidate.aiScores.length ? (
                <div className="info-card">
                  <p>Per-question feedback</p>
                  {selectedCandidate.aiScores.map((scoreItem) => (
                    <span key={`${selectedCandidate.id}-score-${scoreItem.questionId}`}>
                      Q{scoreItem.order}: {scoreItem.score}/{scoreItem.maxScore} | {scoreItem.feedback}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {actionState.error ? <p className="error-copy">{actionState.error}</p> : null}

            <div className="button-row button-row--stack">
              <button
                type="button"
                className="button button--ghost"
                disabled={actionState.saving}
                onClick={() => navigate(`/result/${selectedCandidate.id}`)}
              >
                View Result Page
              </button>
              {isDevMode ? (
                <button type="button" className="button" disabled={actionState.saving} onClick={handleMockAiScore}>
                  Mock AI Score
                </button>
              ) : null}
              <button
                type="button"
                className="button button--ghost"
                disabled={actionState.saving}
                onClick={() => updateDecision('Approved', 'admin_approved')}
              >
                Approve
              </button>
              <button
                type="button"
                className="button button--ghost"
                disabled={actionState.saving}
                onClick={() => updateDecision('Waitlisted', 'waitlisted')}
              >
                Move to waitlist
              </button>
              <button
                type="button"
                className="button button--ghost"
                disabled={actionState.saving}
                onClick={() => updateDecision('Borderline', 'borderline_review')}
              >
                Mark borderline
              </button>
              <button
                type="button"
                className="button button--ghost button--danger"
                disabled={actionState.saving}
                onClick={() => updateDecision('Rejected', 'admin_rejected')}
              >
                Reject
              </button>
            </div>
          </>
        ) : (
          <div className="detail-stack">
            <div className="info-card">
              <p>No submission selected</p>
              <span>Choose a row from the real Firestore submission list to inspect details.</span>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

export default AdminSubmissions
