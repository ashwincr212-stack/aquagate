import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProgramBySlug } from '../data/mockData.js'

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  city: '',
  qualification: '',
  experience: '',
}

function Register() {
  const { programSlug } = useParams()
  const navigate = useNavigate()
  const program = useMemo(() => getProgramBySlug(programSlug), [programSlug])
  const [form, setForm] = useState(initialForm)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setSubmitted(true)
    window.setTimeout(() => {
      navigate(`/assessment/${program.slug}`)
    }, 900)
  }

  return (
    <section className="form-layout">
      <article className="panel panel--glow">
        <p className="eyebrow">Registration</p>
        <h1>Start your application</h1>
        <p className="hero-copy">
          This step uses mock submit behavior only. In later phases, the same shape can connect cleanly to Firestore,
          OTP, and AI evaluation workflows.
        </p>
      </article>

      <form className="panel form-card" onSubmit={handleSubmit}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Candidate details</p>
            <h2>{program.name}</h2>
          </div>
          <span className="status-pill">Mock submit flow</span>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Full name</span>
            <input required value={form.fullName} onChange={(event) => handleChange('fullName', event.target.value)} />
          </label>
          <label className="field">
            <span>Email</span>
            <input required type="email" value={form.email} onChange={(event) => handleChange('email', event.target.value)} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input required value={form.phone} onChange={(event) => handleChange('phone', event.target.value)} />
          </label>
          <label className="field">
            <span>City</span>
            <input required value={form.city} onChange={(event) => handleChange('city', event.target.value)} />
          </label>
          <label className="field">
            <span>Qualification</span>
            <input required value={form.qualification} onChange={(event) => handleChange('qualification', event.target.value)} />
          </label>
          <label className="field">
            <span>Experience</span>
            <input required value={form.experience} onChange={(event) => handleChange('experience', event.target.value)} />
          </label>
          <label className="field field--full">
            <span>Program applying for</span>
            <input value={program.name} readOnly />
          </label>
        </div>

        <div className="button-row">
          <button type="submit" className="button">
            {submitted ? 'Continuing to assessment...' : 'Save and Continue'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default Register
