import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext.jsx'

function ProtectedAdminRoute() {
  const { user, isAdmin, loading, accessReasonMessage } = useAdminAuth()
  const location = useLocation()
  const isDevMode = import.meta.env.DEV === true

  if (loading) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Admin access</p>
        <h2>Checking admin access...</h2>
        <p className="muted">Validating your Firebase sign-in and admin permissions.</p>
      </section>
    )
  }

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  if (!isAdmin) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Access denied</p>
        <h2>Admin access required</h2>
        <p className="error-copy">You are signed in, but this account does not have admin access.</p>
        {isDevMode && accessReasonMessage ? <p className="muted">{accessReasonMessage}</p> : null}
      </section>
    )
  }

  return <Outlet />
}

export default ProtectedAdminRoute
