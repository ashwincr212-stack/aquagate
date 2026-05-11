import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext.jsx'

function AdminLogin() {
  const { user, isAdmin, loading, loginWithEmail, loginWithGoogle, logout, getAuthErrorMessage, accessReasonMessage } =
    useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const redirectTo = location.state?.from?.pathname || '/admin/dashboard'
  const isDevMode = import.meta.env.DEV === true
  const signedInUid = user?.uid || ''

  useEffect(() => {
    if (!loading && isAdmin) {
      navigate(redirectTo, { replace: true })
    }
  }, [isAdmin, loading, navigate, redirectTo])

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setIsSubmitting(true)
      setError('')
      await loginWithEmail(email.trim(), password)
    } catch (signInError) {
      setError(getAuthErrorMessage(signInError))
      setIsSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setIsSubmitting(true)
      setError('')
      await loginWithGoogle()
    } catch (signInError) {
      setError(getAuthErrorMessage(signInError))
      setIsSubmitting(false)
    }
  }

  const handleResetUnauthorizedUser = async () => {
    try {
      await logout()
    } catch {
      // Keep the screen stable even if sign-out fails.
    }
  }

  if (!loading && user && !isAdmin) {
    return (
      <div className="auth-shell">
        <div className="panel auth-card panel--glow">
          <p className="eyebrow">Secure access</p>
          <h1>Access not authorized</h1>
          <p className="hero-copy">You are signed in, but this account does not have admin access.</p>
          <p className="muted">Add `admins/{signedInUid}` in Firestore with `role: "admin"` and `active: true` to enable this account.</p>
          {isDevMode && accessReasonMessage ? <p className="muted">{accessReasonMessage}</p> : null}
          <div className="button-row">
            <button type="button" className="button button--ghost" onClick={handleResetUnauthorizedUser}>
              Sign Out
            </button>
          </div>
          {isDevMode ? (
            <article className="info-card">
              <p>DEV helper</p>
              <strong>After first Google or email login, copy your Firebase Auth UID.</strong>
              <span>Create Firestore document `admins/{signedInUid}` with `role: "admin"` and `active: true`.</span>
            </article>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <form className="panel auth-card panel--glow" onSubmit={handleSubmit}>
        <p className="eyebrow">Secure access</p>
        <h1>Admin Login</h1>
        <p className="hero-copy">Sign in with a Firebase Auth account that also has an active admin profile in Firestore.</p>

        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting || loading} />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting || loading}
          />
        </label>

        {error ? <p className="error-copy">{error}</p> : null}

        <div className="button-row button-row--stack">
          <button type="submit" className="button" disabled={isSubmitting || loading}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
          <button type="button" className="button button--ghost" onClick={handleGoogleLogin} disabled={isSubmitting || loading}>
            Continue with Google
          </button>
        </div>

        {isDevMode ? (
          <article className="info-card">
            <p>DEV helper</p>
            <strong>After first Google or email login, copy your Firebase Auth UID.</strong>
            <span>
              Create Firestore document `admins/{user?.uid || 'your-auth-uid'}` with `role: "admin"` and `active: true`.
            </span>
          </article>
        ) : null}
      </form>
    </div>
  )
}

export default AdminLogin
