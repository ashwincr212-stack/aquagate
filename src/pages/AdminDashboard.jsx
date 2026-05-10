import StatCard from '../components/StatCard.jsx'
import { dashboardStats, programs } from '../data/mockData.js'

function AdminDashboard() {
  return (
    <div className="stack-lg">
      <section className="panel panel--glow">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Operations overview</p>
            <h2>Selection activity across all active gateways</h2>
          </div>
          <span className="status-pill">3 active programs</span>
        </div>
        <p className="muted">Live-looking dashboard using mock analytics only. Designed for future Firestore and AI pipeline wiring.</p>
      </section>

      <section className="stats-grid">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Program watchlist</p>
            <h3>Active routing destinations</h3>
          </div>
        </div>
        <div className="program-summary-grid">
          {programs.map((program) => (
            <div key={program.id} className="info-card">
              <p>{program.name}</p>
              <strong>{program.slug}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
