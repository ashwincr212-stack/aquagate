import { Link, NavLink, Outlet } from 'react-router-dom'

function PublicLayout() {
  return (
    <div className="site-shell">
      <header className="public-header">
        <Link to="/" className="brand-mark">
          <span className="brand-mark__crest">AG</span>
          <span>
            <strong>AquaGate</strong>
            <small>AI-powered enrollment gateway</small>
          </span>
        </Link>

        <nav className="public-nav">
          <NavLink to="/">Overview</NavLink>
          <NavLink to="/programs">Programs</NavLink>
          <Link to="/admin/login" className="button button--ghost">
            Admin Portal
          </Link>
        </nav>
      </header>

      <main className="page-shell">
        <Outlet />
      </main>

      <footer className="public-footer">
        <div>
          <strong>AquaGate</strong>
          <p>Reusable selection infrastructure for premium programs, cohorts, and private access experiences.</p>
        </div>
        <div className="public-footer__links">
          <span>Mock frontend shell only</span>
          <span>Future-ready for Firestore and AI workflows</span>
        </div>
      </footer>
    </div>
  )
}

export default PublicLayout
