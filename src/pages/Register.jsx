import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProgram } from '../hooks/useProgram.js'
import { createCandidate } from '../services/firestoreService.js'

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  city: '',
  qualification: '',
  experience: '',
}

function validateForm(form) {
  const errors = {}
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneDigits = form.phone.replace(/\D/g, '')

  if (!form.fullName.trim()) {
    errors.fullName = 'Full name is required.'
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!emailPattern.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (!form.phone.trim()) {
    errors.phone = 'Phone is required.'
  } else if (phoneDigits.length < 10) {
    errors.phone = 'Phone must contain at least 10 digits.'
  }

  if (!form.city.trim()) {
    errors.city = 'City is required.'
  }

  if (!form.qualification.trim()) {
    errors.qualification = 'Qualification is required.'
  }

  if (!form.experience.trim()) {
    errors.experience = 'Experience is required.'
  }

  return errors
}

function Register() {
  const { programSlug } = useParams()
  const navigate = useNavigate()
  const { loading, program, error, fallbackMessage } = useProgram(programSlug)
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const seatsAvailable = Number(program?.seatsAvailable)
  const isProgramClosed = Boolean(program) && (program.isActive === false || (!Number.isNaN(seatsAvailable) && seatsAvailable <= 0))

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
    setSaveError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSaving) {
      return
    }

    const nextErrors = validateForm(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    if (isProgramClosed) {
      setSaveError(
        program?.isActive === false
          ? 'This registration is not active right now.'
          : 'This program is currently closed because seats are no longer available.',
      )
      return
    }

    try {
      setIsSaving(true)
      setSaveError('')

      const candidateId = await createCandidate({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        qualification: form.qualification.trim(),
        experience: form.experience.trim(),
        programId: program.id,
        programSlug: program.slug,
        programTitle: program.title,
        status: 'registered',
        phoneVerified: false,
        emailVerified: false,
      })

      sessionStorage.setItem('aquagate_candidate_id', candidateId)
      sessionStorage.setItem('aquagate_program_slug', program.slug)
      navigate(`/assessment/${programSlug}`)
    } catch (firestoreError) {
      setSaveError(`Unable to save your registration right now. ${firestoreError.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="form-layout">
        <article className="panel panel--glow">
          <div className="step-banner">
            <span className="status-pill status-pill--soft">Step 1 of 2</span>
            <span className="eyebrow">Registration</span>
          </div>
          <h1>Loading program...</h1>
          <p className="hero-copy">Fetching the latest enrollment details from AquaGate.</p>
        </article>
      </section>
    )
  }

  if (error || !program) {
    return (
      <section className="form-layout">
        <article className="panel panel--glow">
          <div className="step-banner">
            <span className="status-pill status-pill--soft">Step 1 of 2</span>
            <span className="eyebrow">Registration</span>
          </div>
          <h1>Program unavailable</h1>
          <p className="hero-copy">{error || 'We could not find this enrollment program.'}</p>
          <p className="muted">Please return to the Programs page and choose an active intake.</p>
        </article>
      </section>
    )
  }

  return (
    <section className="form-layout">
      <article className="panel panel--glow">
        <div className="step-banner">
          <span className="status-pill status-pill--soft">Step 1 of 2</span>
          <span className="eyebrow">Registration</span>
        </div>
        <h1>{program.title}</h1>
        <p className="hero-copy">{program.description || 'Complete registration to continue to the assessment step.'}</p>
        <div className="form-intro-grid">
          <div className="info-card">
            <p>Current step</p>
            <strong>Registration</strong>
          </div>
          <div className="info-card">
            <p>What happens next</p>
            <strong>After registration, you&apos;ll answer the assessment questions.</strong>
          </div>
          {program.cohortLabel ? (
            <div className="info-card">
              <p>Cohort</p>
              <strong>{program.cohortLabel}</strong>
            </div>
          ) : null}
        </div>
        {fallbackMessage ? <p className="muted">{fallbackMessage}</p> : null}
        {program.isActive === false ? <p className="error-copy">This program is inactive and not accepting registrations.</p> : null}
        {program.isActive !== false && !Number.isNaN(seatsAvailable) && seatsAvailable <= 0 ? (
          <p className="error-copy">This program is currently closed because all seats have been filled.</p>
        ) : null}
      </article>

      <form className="panel form-card" onSubmit={handleSubmit}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Candidate details</p>
            <h2>Complete your registration</h2>
            <p className="muted">Use the same contact details you want AquaGate to use for updates.</p>
          </div>
          <span className="status-pill">{isSaving ? 'Saving to Firestore' : isProgramClosed ? 'Closed' : 'Candidate registration'}</span>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Full name</span>
            <input
              required
              value={form.fullName}
              onChange={(event) => handleChange('fullName', event.target.value)}
            />
            {errors.fullName ? <p className="error-copy">{errors.fullName}</p> : null}
          </label>
          <label className="field">
            <span>Email</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => handleChange('email', event.target.value)}
            />
            {errors.email ? <p className="error-copy">{errors.email}</p> : null}
          </label>
          <label className="field">
            <span>Phone</span>
            <input required value={form.phone} onChange={(event) => handleChange('phone', event.target.value)} />
            {errors.phone ? <p className="error-copy">{errors.phone}</p> : null}
          </label>
          <label className="field">
            <span>City</span>
            <input required value={form.city} onChange={(event) => handleChange('city', event.target.value)} />
            {errors.city ? <p className="error-copy">{errors.city}</p> : null}
          </label>
          <label className="field">
            <span>Qualification</span>
            <input
              required
              value={form.qualification}
              onChange={(event) => handleChange('qualification', event.target.value)}
            />
            {errors.qualification ? <p className="error-copy">{errors.qualification}</p> : null}
          </label>
          <label className="field">
            <span>Experience</span>
            <input required value={form.experience} onChange={(event) => handleChange('experience', event.target.value)} />
            {errors.experience ? <p className="error-copy">{errors.experience}</p> : null}
          </label>
          <label className="field field--full">
            <span>Program applying for</span>
            <input value={program.title} readOnly />
          </label>
        </div>

        {saveError ? <p className="error-copy">{saveError}</p> : null}

        <div className="button-row">
          <button type="submit" className="button" disabled={isSaving || isProgramClosed}>
            {isSaving ? 'Saving and continuing...' : 'Save and Continue'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default Register
