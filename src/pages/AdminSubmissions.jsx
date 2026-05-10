import { useMemo, useState } from 'react'
import CandidateTable from '../components/CandidateTable.jsx'
import { mockSubmissions } from '../data/mockData.js'

function AdminSubmissions() {
  const [submissions, setSubmissions] = useState(mockSubmissions)
  const [activeFilter, setActiveFilter] = useState('All')
  const [selectedCandidate, setSelectedCandidate] = useState(mockSubmissions[0])

  const filteredSubmissions = useMemo(() => {
    if (activeFilter === 'All') {
      return submissions
    }

    if (activeFilter === 'Borderline') {
      return submissions.filter((submission) => submission.borderline)
    }

    return submissions.filter((submission) => submission.status === activeFilter)
  }, [activeFilter, submissions])

  const updateDecision = (decision, status) => {
    setSubmissions((current) =>
      current.map((submission) =>
        submission.id === selectedCandidate.id ? { ...submission, adminDecision: decision, status } : submission,
      ),
    )
    setSelectedCandidate((current) => ({ ...current, adminDecision: decision, status }))
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
        <div className="section-heading">
          <div>
            <p className="eyebrow">Candidate detail</p>
            <h3>{selectedCandidate.name}</h3>
          </div>
          <span className="status-pill">{selectedCandidate.status}</span>
        </div>

        <div className="detail-stack">
          <div className="info-card">
            <p>Profile</p>
            <strong>{selectedCandidate.email}</strong>
            <span>{selectedCandidate.phone}</span>
            <span>{selectedCandidate.city}</span>
          </div>
          <div className="info-card">
            <p>AI score</p>
            <strong>{selectedCandidate.score}/100</strong>
            <span>{selectedCandidate.borderline ? 'Borderline submission' : 'Within clear threshold range'}</span>
          </div>
          <div className="info-card">
            <p>AI feedback</p>
            <span>{selectedCandidate.aiFeedback}</span>
          </div>
          <div className="info-card">
            <p>Strengths</p>
            {selectedCandidate.strengths.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="info-card">
            <p>Weaknesses</p>
            {selectedCandidate.weaknesses.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="info-card">
            <p>Answers</p>
            {selectedCandidate.answersPreview.map((item, index) => (
              <span key={`${selectedCandidate.id}-${index + 1}`}>Q{index + 1}: {item}</span>
            ))}
          </div>
        </div>

        <div className="button-row button-row--stack">
          <button type="button" className="button" onClick={() => updateDecision('Approved', 'Shortlisted')}>
            Approve
          </button>
          <button type="button" className="button button--ghost" onClick={() => updateDecision('Waitlisted', 'Waitlisted')}>
            Waitlist
          </button>
          <button type="button" className="button button--ghost button--danger" onClick={() => updateDecision('Rejected', 'Rejected')}>
            Reject
          </button>
        </div>
      </aside>
    </div>
  )
}

export default AdminSubmissions
