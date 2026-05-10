import { Link } from 'react-router-dom'

function ProgramCard({ program, admin = false, onToggle, onFieldChange }) {
  return (
    <article className="program-card panel">
      <div className="program-card__head">
        <div>
          <p className="eyebrow">{program.category}</p>
          <h3>{program.name}</h3>
        </div>
        <span className={`status-pill ${program.active ? '' : 'status-pill--soft'}`}>
          {program.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <p className="muted">
        {program.mode} • {program.duration} • {program.intake}
      </p>

      <ul className="clean-list compact-list">
        {program.highlights.slice(0, 3).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {admin ? (
        <div className="program-card__admin">
          <label className="field">
            <span>Program slug</span>
            <input
              value={program.slug}
              onChange={(event) => onFieldChange(program.id, 'slug', event.target.value)}
            />
          </label>
          <label className="field">
            <span>Course access URL</span>
            <input
              value={program.accessUrl}
              onChange={(event) => onFieldChange(program.id, 'accessUrl', event.target.value)}
            />
          </label>
          <button type="button" className="button button--ghost" onClick={() => onToggle(program.id)}>
            {program.active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ) : (
        <div className="program-card__actions">
          <Link to={`/enroll/${program.slug}`} className="button">
            Open Gateway
          </Link>
        </div>
      )}
    </article>
  )
}

export default ProgramCard
