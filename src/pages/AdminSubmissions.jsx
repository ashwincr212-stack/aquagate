import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CandidateTable from '../components/CandidateTable.jsx'
import { applyMockAiScore, prepareSubmissionForScoring } from '../services/aiScoringService.js'
import { scoreSubmissionWithBackendMock, scoreSubmissionWithGemini } from '../services/functionsService.js'
import { getActiveRules, getAllSubmissions, getCandidate, getQuestions, updateCandidate, updateSubmission } from '../services/firestoreService.js'
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

function getScoringSourceLabel(submission) {
  if (submission?.backendScoringSource === 'gemini_real_local' || submission?.realAiUsed === true) {
    return 'Gemini'
  }

  if (submission?.backendScoringSource === 'firebase_function_mock') {
    return 'Backend Mock'
  }

  if (submission?.backendScoringSource === 'frontend_mock') {
    return 'Frontend Mock'
  }

  if (!submission?.backendScoringSource && submission?.futureProvider === 'gemini') {
    return 'Gemini'
  }

  return 'Frontend Mock'
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
    backendScoringSource: submission.backendScoringSource ?? '',
    futureProvider: submission.futureProvider ?? '',
    realAiUsed: Boolean(submission.realAiUsed),
    ruleUsedSnapshot: submission.ruleUsedSnapshot ?? null,
    submittedAt: submission.submittedAt ?? null,
    submittedAtLabel: formatTimestamp(submission.submittedAt),
    scoredAtLabel: formatTimestamp(submission.scoredAt),
    emailSent: Boolean(submission.emailSent),
    adminDecision: submission.adminDecision ?? 'Pending',
    adminDecisionNote: submission.adminDecisionNote ?? '',
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
  const [actionState, setActionState] = useState({ saving: false, error: '', message: '' })
  const [adminDecisionNote, setAdminDecisionNote] = useState('')
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

  const reloadSubmissions = async (selectedSubmissionId = selectedCandidate?.id) => {
    const submissionRows = await getAllSubmissions()
    const mergedRows = await Promise.all(
      submissionRows.map(async (submission) => {
        const candidate = submission.candidateId ? await getCandidate(submission.candidateId) : null
        return normalizeSubmissionForAdmin(submission, candidate)
      }),
    )

    setSubmissions(mergedRows)
    setSelectedCandidate(
      mergedRows.find((submission) => submission.id === selectedSubmissionId) ?? mergedRows[0] ?? null,
    )
  }

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

  useEffect(() => {
    setAdminDecisionNote(selectedCandidate?.adminDecisionNote ?? '')
  }, [selectedCandidate])

  const updateDecision = async (adminDecision, status) => {
    if (!selectedCandidate) {
      return
    }

    const isFinalDecision = status === 'admin_approved' || status === 'admin_rejected' || status === 'waitlisted'
    const nextAdminDecisionAt = new Date().toISOString()

    try {
      setActionState({ saving: true, error: '', message: '' })
      await updateSubmission(selectedCandidate.id, {
        adminDecision,
        adminDecisionAt: nextAdminDecisionAt,
        adminDecisionNote: adminDecisionNote.trim(),
        finalDecision: isFinalDecision,
        status,
        borderline: status === 'borderline_review',
      })

      if (selectedCandidate.candidateId) {
        await updateCandidate(selectedCandidate.candidateId, {
          status,
          adminDecision,
          adminDecisionAt: nextAdminDecisionAt,
          adminDecisionNote: adminDecisionNote.trim(),
        })
      }

      setSubmissions((current) =>
        current.map((submission) =>
          submission.id === selectedCandidate.id
            ? {
                ...submission,
                adminDecision,
                adminDecisionNote: adminDecisionNote.trim(),
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
              adminDecisionNote: adminDecisionNote.trim(),
              status,
              statusLabel: getCandidateStatusLabel(status),
              borderline: status === 'borderline_review',
            }
          : current,
      )
    } catch (saveError) {
      setActionState({ saving: false, error: `Unable to update submission. ${saveError.message}`, message: '' })
      return
    }

    setActionState({ saving: false, error: '', message: `${adminDecision} decision saved successfully.` })
  }

  const handleMockAiScore = async () => {
    if (!selectedCandidate) {
      return
    }

    try {
      setActionState({ saving: true, error: '', message: '' })

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
      setActionState({ saving: false, error: `Unable to apply mock AI score. ${saveError.message}`, message: '' })
      return
    }

    setActionState({ saving: false, error: '', message: 'Frontend mock score applied successfully.' })
  }

  const handleBackendMockScore = async () => {
    if (!selectedCandidate) {
      return
    }

    try {
      // Frontend Mock AI Score is the local dev fallback.
      // Backend Mock Score is the future production pathway.
      // Real Gemini will replace the backend mock later.
      setActionState({ saving: true, error: '', message: '' })
      const response = await scoreSubmissionWithBackendMock(selectedCandidate.id)
      await reloadSubmissions(selectedCandidate.id)
      setActionState({
        saving: false,
        error: '',
        message: response?.message || 'Backend mock score completed successfully.',
      })
    } catch (saveError) {
      setActionState({ saving: false, error: saveError.message, message: '' })
    }
  }

  const handleGeminiScore = async () => {
    if (!selectedCandidate) {
      return
    }

    try {
      setActionState({ saving: true, error: '', message: '' })
      const response = await scoreSubmissionWithGemini(selectedCandidate.id)
      await reloadSubmissions(selectedCandidate.id)
      setActionState({
        saving: false,
        error: '',
        message: response?.message || 'Submission scored with Gemini from backend.',
      })
    } catch (saveError) {
      setActionState({ saving: false, error: saveError.message, message: '' })
    }
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
                <div className="feedback-card__head">
                  <strong>
                    {selectedCandidate.score == null
                      ? 'AI score pending'
                      : `${selectedCandidate.score} / ${getTotalMaxScore(selectedCandidate)}`}
                  </strong>
                  {selectedCandidate.score != null ? (
                    <span className="status-pill status-pill--soft">{getScoringSourceLabel(selectedCandidate)}</span>
                  ) : null}
                </div>
                <span>{selectedCandidate.borderline ? 'Marked borderline for manual review' : 'Scoring outcome stored on submission'}</span>
                <span>Scored at: {selectedCandidate.scoredAtLabel}</span>
              </div>
              <div className="info-card">
                <p>Recommendation</p>
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
                <div className="info-card feedback-board">
                  <p>Per-question feedback</p>
                  <div className="feedback-card-grid">
                    {selectedCandidate.aiScores.map((scoreItem, index) => (
                      <div key={`${selectedCandidate.id}-score-${scoreItem.questionId}`} className="feedback-card feedback-card--compact">
                        <div className="feedback-card__head">
                          <span className="status-pill status-pill--soft">Question {scoreItem.order}</span>
                          <strong>{scoreItem.score} / {getAnswerMaxScore(selectedCandidate, scoreItem, index)}</strong>
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
                </div>
              ) : null}
            </div>

            {actionState.error ? <p className="error-copy">{actionState.error}</p> : null}
            {actionState.message ? <p className="success-copy">{actionState.message}</p> : null}

            <label className="field">
              <span>Admin decision note</span>
              <textarea
                rows="3"
                placeholder="Optional context for the final decision..."
                value={adminDecisionNote}
                onChange={(event) => setAdminDecisionNote(event.target.value)}
              />
            </label>

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
                <>
                  <button type="button" className="button" disabled={actionState.saving} onClick={handleBackendMockScore}>
                    Backend Mock Score
                  </button>
                  <button type="button" className="button" disabled={actionState.saving} onClick={handleGeminiScore}>
                    Gemini Score
                  </button>
                  <button type="button" className="button button--ghost" disabled={actionState.saving} onClick={handleMockAiScore}>
                    Mock AI Score
                  </button>
                </>
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
                onClick={() => updateDecision('Borderline Review', 'borderline_review')}
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
