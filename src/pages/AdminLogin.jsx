import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@aquagate.ai')
  const [password, setPassword] = useState('password')

  const handleSubmit = (event) => {
    event.preventDefault()
    navigate('/admin/dashboard')
  }

  return (
    <div className="auth-shell">
      <form className="panel auth-card panel--glow" onSubmit={handleSubmit}>
        <p className="eyebrow">Secure access</p>
        <h1>Admin Login</h1>
        <p className="hero-copy">Mock-only sign-in screen for the AquaGate operations portal.</p>

        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>

        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>

        <button type="submit" className="button">
          Continue to Dashboard
        </button>
      </form>
    </div>
  )
}

export default AdminLogin
