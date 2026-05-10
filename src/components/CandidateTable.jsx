function CandidateTable({ submissions, activeFilter, onFilterChange, onSelectCandidate, selectedCandidateId }) {
  const filters = ['All', 'Shortlisted', 'Waitlisted', 'Rejected', 'Borderline', 'Pending AI review']

  return (
    <section className="panel">
      <div className="table-toolbar">
        <div>
          <p className="eyebrow">Submission pipeline</p>
          <h3>Candidate review queue</h3>
        </div>
        <div className="filter-row">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`chip ${activeFilter === filter ? 'chip--active' : ''}`}
              onClick={() => onFilterChange(filter)}
            >
              {filter}
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
              <th>Score</th>
              <th>Status</th>
              <th>Borderline</th>
              <th>Submitted date</th>
              <th>Email sent</th>
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
                <td>{submission.program}</td>
                <td>{submission.score}</td>
                <td>{submission.status}</td>
                <td>{submission.borderline ? 'Yes' : 'No'}</td>
                <td>{submission.submittedDate}</td>
                <td>{submission.emailSent ? 'Sent' : 'Pending'}</td>
                <td>{submission.adminDecision}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default CandidateTable
