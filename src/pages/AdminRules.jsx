import { useEffect, useMemo, useState } from 'react'
import { createRulesVersion, deactivateOldRules, getActiveRules, getPrograms, getRules } from '../services/firestoreService.js'

const initialRules = {
  minShortlistScore: 80,
  minWaitlistScore: 60,
  borderlineMinScore: 75,
  minEachQuestionScore: 5,
  aiStrictnessLevel: 'balanced',
  autoShortlist: true,
  manualReviewEnabled: true,
  autoEmailEnabled: false,
}

function normalizeProgram(program) {
  return {
    id: program.id,
    slug: program.slug ?? program.programSlug ?? program.id,
    title: program.title ?? program.name ?? 'Untitled Program',
  }
}

function normalizeRule(rule) {
  return {
    id: rule.id,
    programId: rule.programId ?? '',
    programSlug: rule.programSlug ?? '',
    minShortlistScore: Number(rule.minShortlistScore ?? rule.shortlistCutoff ?? 0),
    minWaitlistScore: Number(rule.minWaitlistScore ?? rule.waitlistCutoff ?? 0),
    borderlineMinScore: Number(rule.borderlineMinScore ?? rule.borderlineRange?.min ?? 0),
    minEachQuestionScore: Number(rule.minEachQuestionScore ?? rule.minimumScorePerQuestion ?? 0),
    aiStrictnessLevel: String(rule.aiStrictnessLevel ?? 'balanced').toLowerCase(),
    autoShortlist: Boolean(rule.autoShortlist),
    manualReviewEnabled: Boolean(rule.manualReviewEnabled ?? rule.manualReview),
    autoEmailEnabled: Boolean(rule.autoEmailEnabled ?? rule.autoEmail),
    isActive: rule.isActive ?? rule.active ?? false,
    criteriaVersion: Number(rule.criteriaVersion ?? rule.version ?? 1),
    createdAt: rule.createdAt ?? null,
  }
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

function validateRules(rules) {
  const shortlist = Number(rules.minShortlistScore)
  const waitlist = Number(rules.minWaitlistScore)
  const borderline = Number(rules.borderlineMinScore)
  const minEach = Number(rules.minEachQuestionScore)

  if ([shortlist, waitlist, borderline, minEach].some((value) => !Number.isFinite(value))) {
    return 'All score fields must be valid numbers.'
  }

  if (shortlist <= waitlist) {
    return 'Shortlist score must be greater than waitlist score.'
  }

  if (borderline < waitlist || borderline > shortlist) {
    return 'Borderline score should be between waitlist and shortlist scores.'
  }

  if (minEach < 0 || minEach > 10) {
    return 'Minimum per-question score must be between 0 and 10.'
  }

  return ''
}

function AdminRules() {
  const [programs, setPrograms] = useState([])
  const [selectedProgramSlug, setSelectedProgramSlug] = useState('')
  const [rules, setRules] = useState(initialRules)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [rulesLoading, setRulesLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState({ tone: '', text: '' })
  const [saving, setSaving] = useState(false)

  const selectedProgram = useMemo(
    () => programs.find((program) => program.slug === selectedProgramSlug) ?? null,
    [programs, selectedProgramSlug],
  )

  useEffect(() => {
    let cancelled = false

    async function loadProgramsList() {
      try {
        setLoading(true)
        setError('')
        const nextPrograms = (await getPrograms()).map(normalizeProgram)

        if (!cancelled) {
          setPrograms(nextPrograms)
          const defaultProgram = nextPrograms.find((program) => program.slug === 'demo-course') ?? nextPrograms[0] ?? null
          setSelectedProgramSlug(defaultProgram?.slug ?? '')
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

  useEffect(() => {
    if (!selectedProgram) {
      setHistory([])
      setRules(initialRules)
      return
    }

    let cancelled = false

    async function loadProgramRules() {
      try {
        setRulesLoading(true)
        setError('')
        setMessage({ tone: '', text: '' })
        const [activeRule, allRules] = await Promise.all([
          getActiveRules({ programId: selectedProgram.id, programSlug: selectedProgram.slug }),
          getRules({ programId: selectedProgram.id, programSlug: selectedProgram.slug }),
        ])

        if (!cancelled) {
          const normalizedHistory = allRules.map(normalizeRule)
          setHistory(normalizedHistory)
          setRules(activeRule ? normalizeRule(activeRule) : initialRules)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(`Unable to load rules from Firestore. ${loadError.message}`)
          setHistory([])
          setRules(initialRules)
        }
      } finally {
        if (!cancelled) {
          setRulesLoading(false)
        }
      }
    }

    loadProgramRules()

    return () => {
      cancelled = true
    }
  }, [selectedProgram])

  const updateRule = (field, value) => {
    setRules((current) => ({ ...current, [field]: value }))
    setMessage({ tone: '', text: '' })
  }

  const handleSave = async () => {
    if (!selectedProgram) {
      return
    }

    const validationError = validateRules(rules)
    if (validationError) {
      setMessage({ tone: 'error', text: validationError })
      return
    }

    try {
      setSaving(true)
      setMessage({ tone: 'info', text: 'Saving...' })

      await deactivateOldRules({ programId: selectedProgram.id, programSlug: selectedProgram.slug })
      const newRuleId = await createRulesVersion(selectedProgram.id, {
        programSlug: selectedProgram.slug,
        minShortlistScore: Number(rules.minShortlistScore),
        minWaitlistScore: Number(rules.minWaitlistScore),
        borderlineMinScore: Number(rules.borderlineMinScore),
        minEachQuestionScore: Number(rules.minEachQuestionScore),
        aiStrictnessLevel: rules.aiStrictnessLevel,
        autoShortlist: Boolean(rules.autoShortlist),
        manualReviewEnabled: Boolean(rules.manualReviewEnabled),
        autoEmailEnabled: Boolean(rules.autoEmailEnabled),
        isActive: true,
        active: true,
      })

      const [activeRule, allRules] = await Promise.all([
        getActiveRules({ programId: selectedProgram.id, programSlug: selectedProgram.slug }),
        getRules({ programId: selectedProgram.id, programSlug: selectedProgram.slug }),
      ])

      setHistory(allRules.map(normalizeRule))
      if (activeRule) {
        const normalized = normalizeRule(activeRule)
        setRules(normalized)
        setMessage({
          tone: 'success',
          text: `Rules saved as criteria version ${normalized.criteriaVersion}.`,
        })
      } else {
        setMessage({
          tone: 'success',
          text: `Rules saved successfully. New rule id: ${newRuleId}`,
        })
      }
    } catch (saveError) {
      setMessage({ tone: 'error', text: `Unable to save rules. ${saveError.message}` })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Selection rules</p>
        <h2>Loading real programs...</h2>
        <p className="muted">Fetching program and rule configuration data from Firestore.</p>
      </section>
    )
  }

  if (error && !selectedProgram) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Selection rules</p>
        <h2>Unable to load rules manager</h2>
        <p className="error-copy">{error}</p>
      </section>
    )
  }

  return (
    <div className="stack-lg">
      <section className="panel panel--glow">
        <p className="eyebrow">Selection rules</p>
        <h2>Control AI selection criteria from the portal</h2>
        <p className="muted">
          Rule changes apply to future submissions. Old submissions keep the criteria version used at evaluation time.
        </p>
        <label className="field">
          <span>Select program</span>
          <select value={selectedProgramSlug} onChange={(event) => setSelectedProgramSlug(event.target.value)}>
            {programs.map((program) => (
              <option key={program.id} value={program.slug}>
                {program.title}
              </option>
            ))}
          </select>
        </label>
        {message.text ? (
          <p className={message.tone === 'error' ? 'error-copy' : message.tone === 'success' ? 'success-copy' : 'muted'}>
            {message.text}
          </p>
        ) : null}
        {error && selectedProgram ? <p className="error-copy">{error}</p> : null}
      </section>

      {rulesLoading ? (
        <section className="panel">
          <p className="muted">Loading active Firestore rules for the selected program...</p>
        </section>
      ) : (
        <>
          <section className="panel">
            <div className="form-grid">
              <label className="field">
                <span>Shortlist score</span>
                <input
                  type="number"
                  value={rules.minShortlistScore}
                  onChange={(event) => updateRule('minShortlistScore', Number(event.target.value))}
                />
                <p className="muted">Total score required for auto shortlist</p>
              </label>
              <label className="field">
                <span>Waitlist score</span>
                <input
                  type="number"
                  value={rules.minWaitlistScore}
                  onChange={(event) => updateRule('minWaitlistScore', Number(event.target.value))}
                />
                <p className="muted">Minimum score for waitlist</p>
              </label>
              <label className="field">
                <span>Borderline score</span>
                <input
                  type="number"
                  value={rules.borderlineMinScore}
                  onChange={(event) => updateRule('borderlineMinScore', Number(event.target.value))}
                />
                <p className="muted">Scores from this value need manual review</p>
              </label>
              <label className="field">
                <span>Minimum per-question score</span>
                <input
                  type="number"
                  value={rules.minEachQuestionScore}
                  onChange={(event) => updateRule('minEachQuestionScore', Number(event.target.value))}
                />
                <p className="muted">Prevents weak answers passing only by total score</p>
              </label>
              <label className="field">
                <span>AI strictness</span>
                <select value={rules.aiStrictnessLevel} onChange={(event) => updateRule('aiStrictnessLevel', event.target.value)}>
                  <option value="lenient">Lenient</option>
                  <option value="balanced">Balanced</option>
                  <option value="strict">Strict</option>
                </select>
                <p className="muted">Controls future AI scoring strictness</p>
              </label>
            </div>
          </section>

          <section className="toggle-grid">
            <label className="toggle-card panel">
              <span>Auto shortlist</span>
              <input
                type="checkbox"
                checked={rules.autoShortlist}
                onChange={(event) => updateRule('autoShortlist', event.target.checked)}
              />
            </label>
            <label className="toggle-card panel">
              <span>Manual review</span>
              <input
                type="checkbox"
                checked={rules.manualReviewEnabled}
                onChange={(event) => updateRule('manualReviewEnabled', event.target.checked)}
              />
            </label>
            <label className="toggle-card panel">
              <span>Auto email</span>
              <input
                type="checkbox"
                checked={rules.autoEmailEnabled}
                onChange={(event) => updateRule('autoEmailEnabled', event.target.checked)}
              />
            </label>
          </section>

          <section className="panel">
            <div className="button-row">
              <button type="button" className="button" onClick={handleSave} disabled={saving || !selectedProgram}>
                {saving ? 'Saving...' : 'Save as New Version'}
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Version history</p>
                <h3>Previous criteria versions</h3>
              </div>
            </div>
            <div className="detail-stack">
              {history.length ? (
                history.map((rule) => (
                  <div key={rule.id} className="info-card">
                    <p>Criteria version {rule.criteriaVersion}</p>
                    <strong>{rule.isActive ? 'Active' : 'Inactive'}</strong>
                    <span>Shortlist: {rule.minShortlistScore}</span>
                    <span>Waitlist: {rule.minWaitlistScore}</span>
                    <span>Borderline: {rule.borderlineMinScore}</span>
                    <span>AI strictness: {rule.aiStrictnessLevel}</span>
                    <span>Created: {formatTimestamp(rule.createdAt)}</span>
                  </div>
                ))
              ) : (
                <div className="info-card">
                  <p>No rules found</p>
                  <span>Save the first criteria version for this program to start version history.</span>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default AdminRules
