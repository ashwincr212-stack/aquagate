import { Link } from 'react-router-dom'
import { landingSteps } from '../data/mockData.js'

const DEMO_PROGRAM_SLUG = 'demo-course'

function Landing() {
  return (
    <div className="stack-xl">
      <section className="hero-panel">
        <div className="hero-panel__content">
          <p className="eyebrow">Reusable screening infrastructure</p>
          <h1>Create fair AI-based selection.</h1>
          <p className="hero-copy">
            AquaGate is a premium enrollment and screening gateway for courses, apps, websites, internships,
            workshops, and private programs. Partners can route applicants into one trusted flow, then unlock access
            only for shortlisted candidates.
          </p>
          <div className="button-row">
            <Link to="/programs" className="button">
              View Programs
            </Link>
            <Link to="/admin/dashboard" className="button button--ghost">
              Explore Admin Portal
            </Link>
          </div>
        </div>

        <div className="hero-panel__card panel panel--glow">
          <p className="eyebrow">Why teams use AquaGate</p>
          <ul className="clean-list">
            <li>Reusable ` /enroll/:programSlug ` flow for future partner links</li>
            <li>AI-ready screening criteria with admin-controlled scoring rules</li>
            <li>Shortlist-only downstream access for premium or private experiences</li>
          </ul>
        </div>
      </section>

      <section id="how-it-works" className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Applicant journey</p>
            <h2>Simple for candidates. Controlled for admins.</h2>
          </div>
        </div>

        <div className="steps-grid">
          {landingSteps.map((step, index) => (
            <article key={step.title} className="step-card">
              <span className="step-card__index">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="programs" className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Active program directory</p>
            <h2>One frontend shell, many real enrollment gateways.</h2>
          </div>
          <Link to="/programs" className="button">
            Browse Programs
          </Link>
        </div>
        <p className="hero-copy">
          Explore real active Firestore-backed programs, then register directly through the matching AquaGate route.
        </p>
      </section>
    </div>
  )
}

export default Landing
