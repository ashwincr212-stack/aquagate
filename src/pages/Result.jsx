import { useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { getResultBySubmissionId } from '../data/mockData.js'

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
}

function Result() {
  const { submissionId } = useParams()
  const [searchParams] = useSearchParams()
  const statusKey = searchParams.get('status') ?? 'shortlisted'
  const submission = useMemo(() => getResultBySubmissionId(submissionId), [submissionId])
  const result = resultMap[statusKey] ?? resultMap.shortlisted

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
