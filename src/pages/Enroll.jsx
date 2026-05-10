import { Link, useParams } from 'react-router-dom'
import { getProgramBySlug } from '../data/mockData.js'

function Enroll() {
  const { programSlug } = useParams()
  const program = getProgramBySlug(programSlug)

  return (
    <div className="stack-lg">
      <section className="hero-subpage panel panel--glow">
        <p className="eyebrow">{program.category}</p>
        <h1>{program.name}</h1>
        <p className="hero-copy">
          A premium screening gateway designed to assess fit before access is granted. This intake is mocked for Step
          1, but structured for future Firestore-backed program routing.
        </p>
        <div className="button-row">
          <Link to={`/register/${program.slug}`} className="button">
            Apply Now
          </Link>
          <span className="status-pill">{program.active ? 'Applications open' : 'Applications paused'}</span>
        </div>
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
            <p>Applications open until</p>
            <strong>{program.applicationsOpenUntil}</strong>
          </div>
          <div className="info-card">
            <p>Seats planned</p>
            <strong>{program.seats}</strong>
          </div>
          <div className="info-card">
            <p>Downstream access URL</p>
            <strong>{program.accessUrl}</strong>
          </div>
        </article>
      </section>
    </div>
  )
}

export default Enroll
