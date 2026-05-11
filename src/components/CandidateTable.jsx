function CandidateTable({ submissions, activeFilter, onFilterChange, onSelectCandidate, selectedCandidateId }) {
  const filters = [
    { value: 'all', label: 'All' },
    { value: 'pending_ai_score', label: 'Pending AI score' },
    { value: 'shortlisted', label: 'Shortlisted' },
    { value: 'waitlisted', label: 'Waitlisted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'borderline_review', label: 'Borderline Review' },
    { value: 'admin_approved', label: 'Admin Approved' },
    { value: 'admin_rejected', label: 'Admin Rejected' },
  ]

  return (
    <section className="panel">
      <div className="table-toolbar">
        <div>
          <p className="eyebrow">Submission pipeline</p>
          <h3>Candidate review queue</h3>
        </div>
        <div className="filter-row filter-row--compact">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`chip ${activeFilter === filter.value ? 'chip--active' : ''}`}
              onClick={() => onFilterChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table className="candidate-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Program</th>
              <th>Status</th>
              <th>Score</th>
              <th>Borderline</th>
              <th>Submitted At</th>
              <th>Admin decision</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr
                key={submission.id}
                className={selectedCandidateId === submission.id ? 'is-selected' : ''}
                onClick={() => onSelectCandidate(submission)}
              >
                <td>{submission.name}</td>
                <td>{submission.email}</td>
                <td>{submission.phone}</td>
                <td>{submission.programTitle}</td>
                <td>
                  <span className="status-pill status-pill--soft">{submission.statusLabel}</span>
                </td>
                <td>{submission.scoreLabel}</td>
                <td>
                  <span className={`status-pill ${submission.borderline ? '' : 'status-pill--soft'}`}>
                    {submission.borderline ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>{submission.submittedAtLabel}</td>
                <td>{submission.adminDecisionLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default CandidateTable
