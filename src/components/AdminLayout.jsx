import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext.jsx'

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/programs', label: 'Programs' },
  { to: '/admin/questions', label: 'Questions' },
  { to: '/admin/rules', label: 'Rules' },
  { to: '/admin/submissions', label: 'Submissions' },
]

function AdminLayout() {
  const { user, adminProfile, logout } = useAdminAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const current = adminLinks.find((link) => location.pathname.startsWith(link.to))?.label ?? 'Admin'

  const handleSignOut = async () => {
    await logout()
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="admin-sidebar__brand">
          <span className="brand-mark__crest">AG</span>
          <div>
            <strong>AquaGate</strong>
            <small>Control center</small>
          </div>
        </div>

        <nav className="admin-sidebar__nav">
          {adminLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? 'is-active' : '')}
              onClick={() => setSidebarOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="button button--ghost admin-menu" onClick={() => setSidebarOpen((open) => !open)}>
            Menu
          </button>
          <div>
            <p className="eyebrow">Admin workspace</p>
            <h1>{current}</h1>
          </div>
          <div className="admin-topbar__status">
            <div className="admin-identity">
              <strong>{adminProfile?.displayName || user?.displayName || user?.email || 'Admin user'}</strong>
              <small>{user?.email || 'Signed in with Firebase Auth'}</small>
            </div>
            {adminProfile?.source === 'dev_email_fallback' ? <span className="status-pill">DEV admin fallback active</span> : null}
            <button type="button" className="button button--ghost" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AdminLayout
