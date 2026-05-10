import { useEffect, useMemo, useState } from 'react'
import StatCard from '../components/StatCard.jsx'
import { getAllCandidates, getAllSubmissions, getPrograms } from '../services/firestoreService.js'
import { getAiProviderStatus } from '../services/functionsService.js'

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

function getSubmittedMillis(item) {
  if (typeof item?.submittedAt?.toMillis === 'function') {
    return item.submittedAt.toMillis()
  }

  if (typeof item?.createdAt?.toMillis === 'function') {
    return item.createdAt.toMillis()
  }

  return 0
}

const initialProviderState = {
  provider: 'Gemini',
  configured: false,
  model: 'gemini-1.5-flash',
  realCallsEnabled: false,
  mode: 'Backend mock only',
  message: 'Loading AI provider status...',
}

function AdminDashboard() {
  const [candidates, setCandidates] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [providerStatus, setProviderStatus] = useState(initialProviderState)
  const [providerLoading, setProviderLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const [nextCandidates, nextSubmissions, nextPrograms] = await Promise.all([
          getAllCandidates(),
          getAllSubmissions(),
          getPrograms(),
        ])

        if (!cancelled) {
          setCandidates(nextCandidates)
          setSubmissions(nextSubmissions)
          setPrograms(nextPrograms)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(`Unable to load dashboard stats from Firestore. ${loadError.message}`)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadProviderStatus() {
      try {
        setProviderLoading(true)
        const nextStatus = await getAiProviderStatus()

        if (!cancelled) {
          setProviderStatus({
            provider: nextStatus?.provider || 'Gemini',
            configured: Boolean(nextStatus?.configured),
            model: nextStatus?.model || 'gemini-1.5-flash',
            realCallsEnabled: Boolean(nextStatus?.realCallsEnabled),
            mode: nextStatus?.mode || 'Backend mock only',
            message: nextStatus?.configured
              ? nextStatus?.message || 'Gemini backend status is available.'
              : 'Gemini key is not configured yet. Backend mock scoring is still available.',
          })
        }
      } catch (loadError) {
        if (!cancelled) {
          setProviderStatus({
            provider: 'Gemini',
            configured: false,
            model: 'gemini-1.5-flash',
            realCallsEnabled: false,
            mode: 'Backend mock only',
            message: loadError.message,
          })
        }
      } finally {
        if (!cancelled) {
          setProviderLoading(false)
        }
      }
    }

    loadProviderStatus()

    return () => {
      cancelled = true
    }
  }, [])

  const refreshProviderStatus = async () => {
    try {
      setProviderLoading(true)
      const nextStatus = await getAiProviderStatus()
      setProviderStatus({
        provider: nextStatus?.provider || 'Gemini',
        configured: Boolean(nextStatus?.configured),
        model: nextStatus?.model || 'gemini-1.5-flash',
        realCallsEnabled: Boolean(nextStatus?.realCallsEnabled),
        mode: nextStatus?.mode || 'Backend mock only',
        message: nextStatus?.configured
          ? nextStatus?.message || 'Gemini backend status is available.'
          : 'Gemini key is not configured yet. Backend mock scoring is still available.',
      })
    } catch (loadError) {
      setProviderStatus({
        provider: 'Gemini',
        configured: false,
        model: 'gemini-1.5-flash',
        realCallsEnabled: false,
        mode: 'Backend mock only',
        message: loadError.message,
      })
    } finally {
      setProviderLoading(false)
    }
  }

  const stats = useMemo(() => {
    const registered = candidates.filter((candidate) => candidate.status === 'registered').length
    const assessmentSubmitted = candidates.filter((candidate) => candidate.status === 'assessment_submitted').length
    const pendingAiReview = submissions.filter((submission) => (submission.status ?? 'pending_ai_score') === 'pending_ai_score').length
    const shortlisted = submissions.filter((submission) => submission.status === 'shortlisted').length
    const waitlisted = submissions.filter((submission) => submission.status === 'waitlisted').length
    const rejected = submissions.filter(
      (submission) => submission.status === 'admin_rejected' || submission.status === 'rejected',
    ).length
    const borderlineReview = submissions.filter(
      (submission) => submission.status === 'borderline_review' || submission.borderline === true,
    ).length
    const activePrograms = programs.filter((program) => program.isActive === true || program.active === true).length
    const scoredSubmissions = submissions.filter((submission) => typeof submission.totalScore === 'number')
    const averageScore = scoredSubmissions.length
      ? (scoredSubmissions.reduce((sum, submission) => sum + submission.totalScore, 0) / scoredSubmissions.length).toFixed(1)
      : 'Pending'

    return [
      { label: 'Total candidates', value: `${candidates.length}`, delta: 'Candidates collection' },
      { label: 'Registered', value: `${registered}`, delta: 'Status: registered' },
      { label: 'Assessment submitted', value: `${assessmentSubmitted}`, delta: 'Status: assessment_submitted' },
      { label: 'Total submissions', value: `${submissions.length}`, delta: 'Submissions collection' },
      { label: 'Pending AI review', value: `${pendingAiReview}`, delta: 'Status: pending_ai_score' },
      { label: 'Shortlisted', value: `${shortlisted}`, delta: 'Status: shortlisted' },
      { label: 'Waitlisted', value: `${waitlisted}`, delta: 'Status: waitlisted' },
      { label: 'Rejected', value: `${rejected}`, delta: 'Status: rejected or admin_rejected' },
      { label: 'Borderline review', value: `${borderlineReview}`, delta: 'Status or borderline flag' },
      { label: 'Active programs', value: `${activePrograms}`, delta: 'Programs where active' },
      { label: 'Average score', value: `${averageScore}`, delta: scoredSubmissions.length ? 'Across scored submissions' : 'No AI scores yet' },
    ]
  }, [candidates, submissions, programs])

  const recentSubmissions = useMemo(() => {
    const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]))

    return [...submissions]
      .sort((left, right) => getSubmittedMillis(right) - getSubmittedMillis(left))
      .slice(0, 5)
      .map((submission) => {
        const candidate = candidateMap.get(submission.candidateId)
        return {
          id: submission.id,
          candidateName: candidate?.fullName ?? 'Unknown Candidate',
          programTitle: submission.programTitle ?? submission.programSlug ?? 'Untitled Program',
          status: submission.status ?? 'pending_ai_score',
          submittedAtLabel: formatTimestamp(submission.submittedAt ?? submission.createdAt),
          scoreLabel: typeof submission.totalScore === 'number' ? `${submission.totalScore}` : 'Pending',
        }
      })
  }, [candidates, submissions])

  const statusSummary = useMemo(() => {
    const pending = submissions.filter((submission) => (submission.status ?? 'pending_ai_score') === 'pending_ai_score').length
    const shortlisted = submissions.filter((submission) => submission.status === 'shortlisted').length
    const waitlisted = submissions.filter((submission) => submission.status === 'waitlisted').length
    const rejected = submissions.filter(
      (submission) => submission.status === 'admin_rejected' || submission.status === 'rejected',
    ).length
    const borderline = submissions.filter(
      (submission) => submission.status === 'borderline_review' || submission.borderline === true,
    ).length

    return [
      { label: 'Pending AI score', value: pending },
      { label: 'Shortlisted', value: shortlisted },
      { label: 'Waitlisted', value: waitlisted },
      { label: 'Rejected', value: rejected },
      { label: 'Borderline', value: borderline },
    ]
  }, [submissions])

  if (loading) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Operations overview</p>
        <h2>Loading real dashboard stats...</h2>
        <p className="muted">Fetching candidates, submissions, and programs from Firestore.</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Operations overview</p>
        <h2>Unable to load dashboard</h2>
        <p className="error-copy">{error}</p>
      </section>
    )
  }

  const hasAnyData = candidates.length > 0 || submissions.length > 0 || programs.length > 0

  return (
    <div className="stack-lg">
      <section className="panel panel--glow">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Operations overview</p>
            <h2>Selection activity across all active gateways</h2>
          </div>
          <span className="status-pill">{stats[9].value} active programs</span>
        </div>
        <p className="muted">
          {hasAnyData
            ? 'Live Firestore-backed dashboard for AquaGate candidate, submission, and program activity.'
            : 'No Firestore data yet. Counts stay at zero until candidates register and submit assessments.'}
        </p>
      </section>

      <section className="stats-grid">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">AI Provider Status</p>
            <h3>Backend AI readiness</h3>
          </div>
          <button type="button" className="button button--ghost" onClick={refreshProviderStatus} disabled={providerLoading}>
            {providerLoading ? 'Refreshing...' : 'Refresh AI Status'}
          </button>
        </div>
        <div className="program-summary-grid">
          <div className="info-card">
            <p>Provider</p>
            <strong>{providerStatus.provider}</strong>
          </div>
          <div className="info-card">
            <p>Configured</p>
            <strong>{providerStatus.configured ? 'Yes' : 'No'}</strong>
          </div>
          <div className="info-card">
            <p>Model</p>
            <strong>{providerStatus.model}</strong>
          </div>
          <div className="info-card">
            <p>Real calls enabled</p>
            <strong>{providerStatus.realCallsEnabled ? 'true' : 'false'}</strong>
          </div>
          <div className="info-card">
            <p>Current mode</p>
            <strong>{providerStatus.mode}</strong>
          </div>
        </div>
        <p className={providerStatus.message.includes('unavailable') ? 'error-copy' : 'muted'}>{providerStatus.message}</p>
      </section>

      <section className="two-column">
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recent submissions</p>
              <h3>Latest 5 submissions</h3>
            </div>
          </div>
          <div className="detail-stack">
            {recentSubmissions.length ? (
              recentSubmissions.map((submission) => (
                <div key={submission.id} className="info-card">
                  <p>{submission.candidateName}</p>
                  <strong>{submission.programTitle}</strong>
                  <span>Status: {submission.status}</span>
                  <span>Submitted: {submission.submittedAtLabel}</span>
                  <span>Score: {submission.scoreLabel}</span>
                </div>
              ))
            ) : (
              <div className="info-card">
                <p>No submissions yet</p>
                <span>Recent submissions will appear here after candidates finish assessments.</span>
              </div>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Status summary</p>
              <h3>Current review breakdown</h3>
            </div>
          </div>
          <div className="program-summary-grid">
            {statusSummary.map((item) => (
              <div key={item.label} className="info-card">
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}

export default AdminDashboard
