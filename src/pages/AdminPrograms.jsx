import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createProgram, getPrograms, updateProgram } from '../services/firestoreService.js'

const initialFormState = {
  title: '',
  slug: '',
  description: '',
  isActive: true,
  category: '',
  cohortLabel: '',
  seatsAvailable: '',
  startDate: '',
  endDate: '',
}

function formatTimestamp(value) {
  if (!value) {
    return 'Pending timestamp sync'
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate().toLocaleString()
  }

  if (typeof value === 'string') {
    return value
  }

  return 'Pending timestamp sync'
}

function normalizeSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function normalizeProgram(program) {
  return {
    id: program.id,
    title: program.title ?? program.name ?? 'Untitled Program',
    slug: program.slug ?? '',
    description: program.description ?? '',
    isActive: program.isActive ?? program.active ?? false,
    category: program.category ?? program.programType ?? '',
    cohortLabel: program.cohortLabel ?? '',
    seatsAvailable:
      typeof program.seatsAvailable === 'number'
        ? program.seatsAvailable
        : typeof program.seats === 'number'
          ? program.seats
          : '',
    startDate: program.startDate ?? '',
    endDate: program.endDate ?? '',
    createdAt: program.createdAt ?? null,
    updatedAt: program.updatedAt ?? null,
  }
}

function createPayload(formState) {
  return {
    title: formState.title.trim(),
    name: formState.title.trim(),
    slug: normalizeSlug(formState.slug),
    description: formState.description.trim(),
    isActive: Boolean(formState.isActive),
    active: Boolean(formState.isActive),
    category: formState.category.trim(),
    programType: formState.category.trim(),
    cohortLabel: formState.cohortLabel.trim(),
    seatsAvailable: formState.seatsAvailable === '' ? null : Number(formState.seatsAvailable),
    seats: formState.seatsAvailable === '' ? null : Number(formState.seatsAvailable),
    startDate: formState.startDate || '',
    endDate: formState.endDate || '',
  }
}

function validateProgram(formState) {
  if (!formState.title.trim()) {
    return 'Program title is required.'
  }

  const slug = normalizeSlug(formState.slug)
  if (!slug) {
    return 'Program slug is required.'
  }

  if (slug !== formState.slug.trim().toLowerCase() || /\s/.test(formState.slug)) {
    return 'Slug must be lowercase, URL-safe, and contain no spaces.'
  }

  if (formState.seatsAvailable !== '') {
    const seats = Number(formState.seatsAvailable)
    if (!Number.isFinite(seats) || seats < 0) {
      return 'Seats available must be a number greater than or equal to 0.'
    }
  }

  return ''
}

function AdminPrograms() {
  const [programs, setPrograms] = useState([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [formState, setFormState] = useState(initialFormState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveState, setSaveState] = useState({ saving: false, tone: '', message: '' })

  useEffect(() => {
    let cancelled = false

    async function loadProgramsList() {
      try {
        setLoading(true)
        setError('')
        const nextPrograms = (await getPrograms()).map(normalizeProgram)

        if (!cancelled) {
          setPrograms(nextPrograms)
          const defaultProgram = nextPrograms[0] ?? null
          setSelectedProgramId(defaultProgram?.id ?? '')
          setFormState(defaultProgram ?? initialFormState)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(`Unable to load programs from Firestore. ${loadError.message}`)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProgramsList()

    return () => {
      cancelled = true
    }
  }, [])

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId) ?? null,
    [programs, selectedProgramId],
  )

  const handleSelectProgram = (program) => {
    setSelectedProgramId(program.id)
    setFormState(program)
    setSaveState({ saving: false, tone: '', message: '' })
  }

  const handleNewProgram = () => {
    setSelectedProgramId('')
    setFormState(initialFormState)
    setSaveState({ saving: false, tone: '', message: '' })
  }

  const handleFieldChange = (field, value) => {
    setFormState((current) => ({ ...current, [field]: value }))
    setSaveState({ saving: false, tone: '', message: '' })
  }

  const handleSave = async () => {
    const validationError = validateProgram(formState)

    if (validationError) {
      setSaveState({ saving: false, tone: 'error', message: validationError })
      return
    }

    try {
      setSaveState({ saving: true, tone: 'info', message: 'Saving program...' })
      const payload = createPayload(formState)

      if (selectedProgramId) {
        await updateProgram(selectedProgramId, payload)
      } else {
        await createProgram(payload)
      }

      const nextPrograms = (await getPrograms()).map(normalizeProgram)
      const savedProgram =
        nextPrograms.find((program) => program.slug === payload.slug) ?? nextPrograms.find((program) => program.id === selectedProgramId) ?? nextPrograms[0] ?? null

      setPrograms(nextPrograms)
      setSelectedProgramId(savedProgram?.id ?? '')
      setFormState(savedProgram ?? initialFormState)
      setSaveState({
        saving: false,
        tone: 'success',
        message: selectedProgramId ? 'Program updated successfully.' : 'Program created successfully.',
      })
    } catch (saveError) {
      setSaveState({ saving: false, tone: 'error', message: `Unable to save program. ${saveError.message}` })
    }
  }

  if (loading) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Program management</p>
        <h2>Loading real programs...</h2>
        <p className="muted">Fetching program records from Firestore.</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Program management</p>
        <h2>Unable to load programs</h2>
        <p className="error-copy">{error}</p>
      </section>
    )
  }

  return (
    <div className="stack-lg">
      <section className="panel panel--glow">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Program management</p>
            <h2>Manage real AquaGate programs from Firestore</h2>
          </div>
          <button type="button" className="button" onClick={handleNewProgram}>
            New Program
          </button>
        </div>
        <p className="muted">
          Public registration and admin preview links update from the real program slug saved in Firestore.
        </p>
        {saveState.message ? (
          <p className={saveState.tone === 'error' ? 'error-copy' : saveState.tone === 'success' ? 'success-copy' : 'muted'}>
            {saveState.message}
          </p>
        ) : null}
      </section>

      <section className="two-column">
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Programs</p>
              <h3>Available program records</h3>
            </div>
          </div>
          <div className="detail-stack">
            {programs.length ? (
              programs.map((program) => (
                <button
                  key={program.id}
                  type="button"
                  className={`info-card program-record-button ${selectedProgramId === program.id ? 'program-record-button--active' : ''}`}
                  onClick={() => handleSelectProgram(program)}
                >
                  <div className="section-heading">
                    <div>
                      <p>{program.title}</p>
                      <strong>{program.slug}</strong>
                    </div>
                    <span className={`status-pill ${program.isActive ? '' : 'status-pill--soft'}`}>
                      {program.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <span>{program.category || 'No category set'}</span>
                  <span>{program.description || 'No description added yet.'}</span>
                  <span>Created: {formatTimestamp(program.createdAt)}</span>
                  <span>Updated: {formatTimestamp(program.updatedAt)}</span>
                </button>
              ))
            ) : (
              <div className="info-card">
                <p>No programs found</p>
                <span>Create the first program to start accepting real registrations.</span>
              </div>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{selectedProgramId ? 'Edit program' : 'Create program'}</p>
              <h3>{selectedProgramId ? formState.title || 'Selected program' : 'New program draft'}</h3>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Program title</span>
              <input value={formState.title} onChange={(event) => handleFieldChange('title', event.target.value)} />
            </label>
            <label className="field">
              <span>Slug</span>
              <input value={formState.slug} onChange={(event) => handleFieldChange('slug', event.target.value)} />
            </label>
            <label className="field field--full">
              <span>Description</span>
              <textarea rows="4" value={formState.description} onChange={(event) => handleFieldChange('description', event.target.value)} />
            </label>
            <label className="field">
              <span>Program type / category</span>
              <input value={formState.category} onChange={(event) => handleFieldChange('category', event.target.value)} />
            </label>
            <label className="field">
              <span>Cohort label</span>
              <input value={formState.cohortLabel} onChange={(event) => handleFieldChange('cohortLabel', event.target.value)} />
            </label>
            <label className="field">
              <span>Seats available</span>
              <input
                type="number"
                min="0"
                value={formState.seatsAvailable}
                onChange={(event) => handleFieldChange('seatsAvailable', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={formState.isActive ? 'active' : 'inactive'}
                onChange={(event) => handleFieldChange('isActive', event.target.value === 'active')}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="field">
              <span>Start date</span>
              <input type="date" value={formState.startDate} onChange={(event) => handleFieldChange('startDate', event.target.value)} />
            </label>
            <label className="field">
              <span>End date</span>
              <input type="date" value={formState.endDate} onChange={(event) => handleFieldChange('endDate', event.target.value)} />
            </label>
          </div>

          <div className="detail-stack">
            <div className="info-card">
              <p>Public enroll link</p>
              <strong>{formState.slug ? `/register/${normalizeSlug(formState.slug)}` : 'Set a slug to generate this link'}</strong>
              {formState.slug ? (
                <Link className="button button--ghost" to={`/register/${normalizeSlug(formState.slug)}`}>
                  Open Register Link
                </Link>
              ) : null}
            </div>
            <div className="info-card">
              <p>Assessment preview link</p>
              <strong>
                {formState.slug
                  ? `/assessment/${normalizeSlug(formState.slug)}?preview=admin`
                  : 'Set a slug to generate this preview link'}
              </strong>
              {formState.slug ? (
                <Link className="button button--ghost" to={`/assessment/${normalizeSlug(formState.slug)}?preview=admin`}>
                  Open Assessment Preview
                </Link>
              ) : null}
            </div>
          </div>

          <div className="button-row">
            <button type="button" className="button" disabled={saveState.saving} onClick={handleSave}>
              {saveState.saving ? 'Saving...' : selectedProgramId ? 'Save Changes' : 'Create Program'}
            </button>
            <button type="button" className="button button--ghost" onClick={handleNewProgram}>
              Reset Form
            </button>
          </div>
        </article>
      </section>
    </div>
  )
}

export default AdminPrograms
