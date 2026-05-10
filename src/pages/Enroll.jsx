import { Link, useParams } from 'react-router-dom'
import { useProgram } from '../hooks/useProgram.js'

function Enroll() {
  const { programSlug } = useParams()
  const { loading, program, error, fallbackMessage } = useProgram(programSlug)

  if (loading) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Enrollment</p>
        <h1>Loading program...</h1>
        <p className="hero-copy">Fetching the latest enrollment details from AquaGate.</p>
      </section>
    )
  }

  if (error || !program) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Enrollment</p>
        <h1>Program unavailable</h1>
        <p className="hero-copy">{error || 'We could not find this enrollment program.'}</p>
      </section>
    )
  }

  return (
    <div className="stack-lg">
      <section className="hero-subpage panel panel--glow">
        <p className="eyebrow">{program.category}</p>
        <h1>{program.title}</h1>
        <p className="hero-copy">{program.description}</p>
        <div className="button-row">
          <Link to={`/register/${program.slug}`} className="button">
            Apply Now
          </Link>
          <span className="status-pill">{program.isActive ? 'Applications open' : 'Applications paused'}</span>
        </div>
        {fallbackMessage ? <p className="muted">{fallbackMessage}</p> : null}
        {!program.isActive ? <p className="error-copy">This enrollment is currently closed.</p> : null}
      </section>

      <section className="two-column">
        <article className="panel">
          <h2>Program overview</h2>
          <p className="muted">
            {program.mode} • {program.duration} • {program.intake}
          </p>
          <ul className="clean-list">
            {program.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Eligibility</h2>
          <ul className="clean-list">
            {program.eligibility.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="two-column">
        <article className="panel">
          <h2>Process timeline</h2>
          <ol className="timeline-list">
            {program.timeline.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>

        <article className="panel">
          <h2>Selection notes</h2>
          <div className="info-card">
            <p>Program slug</p>
            <strong>{program.slug}</strong>
          </div>
          <div className="info-card">
            <p>Applications open until</p>
            <strong>{program.applicationsOpenUntil}</strong>
          </div>
          <div className="info-card">
            <p>Seats planned</p>
            <strong>{program.seats}</strong>
          </div>
          <div className="info-card">
            <p>Downstream access URL</p>
            <strong>{program.courseAccessUrl || 'Configured in Firestore'}</strong>
          </div>
        </article>
      </section>
    </div>
  )
}

export default Enroll
