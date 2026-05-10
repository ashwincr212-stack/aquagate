import { useState } from 'react'
import { mockQuestions, selectionRules as seedRules } from '../data/mockData.js'

function AdminRules() {
  const [rules, setRules] = useState(seedRules)

  const updateRule = (field, value) => {
    setRules((current) => ({ ...current, [field]: value }))
  }

  const updateWeight = (questionId, value) => {
    setRules((current) => ({
      ...current,
      questionWeightage: {
        ...current.questionWeightage,
        [questionId]: value,
      },
    }))
  }

  return (
    <div className="stack-lg">
      <section className="panel panel--glow">
        <p className="eyebrow">Selection rules</p>
        <h2>Control AI selection criteria from the portal</h2>
        <p className="muted">
          Rule changes apply to future submissions. Old submissions keep the criteria version used at evaluation time.
        </p>
      </section>

      <section className="panel">
        <div className="form-grid">
          <label className="field">
            <span>Shortlist cutoff score</span>
            <input type="number" value={rules.shortlistCutoff} onChange={(event) => updateRule('shortlistCutoff', Number(event.target.value))} />
          </label>
          <label className="field">
            <span>Waitlist cutoff score</span>
            <input type="number" value={rules.waitlistCutoff} onChange={(event) => updateRule('waitlistCutoff', Number(event.target.value))} />
          </label>
          <label className="field">
            <span>Borderline score range</span>
            <input value={rules.borderlineRange} onChange={(event) => updateRule('borderlineRange', event.target.value)} />
          </label>
          <label className="field">
            <span>Minimum score per question</span>
            <input type="number" value={rules.minimumScorePerQuestion} onChange={(event) => updateRule('minimumScorePerQuestion', Number(event.target.value))} />
          </label>
          <label className="field">
            <span>AI strictness level</span>
            <select value={rules.aiStrictnessLevel} onChange={(event) => updateRule('aiStrictnessLevel', event.target.value)}>
              <option>Lenient</option>
              <option>Balanced</option>
              <option>Strict</option>
            </select>
          </label>
          <label className="field field--full">
            <span>Required keywords / points</span>
            <textarea rows="3" value={rules.requiredKeywords} onChange={(event) => updateRule('requiredKeywords', event.target.value)} />
          </label>
          <label className="field field--full">
            <span>Negative flags</span>
            <textarea rows="3" value={rules.negativeFlags} onChange={(event) => updateRule('negativeFlags', event.target.value)} />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Question weightage</p>
            <h3>Per-question scoring control</h3>
          </div>
        </div>
        <div className="weight-grid">
          {mockQuestions.map((question) => (
            <label key={question.id} className="field">
              <span>Q{question.order} weightage</span>
              <input
                type="number"
                step="0.1"
                value={rules.questionWeightage[question.id]}
                onChange={(event) => updateWeight(question.id, Number(event.target.value))}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="toggle-grid">
        <label className="toggle-card panel">
          <span>Auto shortlist</span>
          <input type="checkbox" checked={rules.autoShortlist} onChange={(event) => updateRule('autoShortlist', event.target.checked)} />
        </label>
        <label className="toggle-card panel">
          <span>Manual review</span>
          <input type="checkbox" checked={rules.manualReview} onChange={(event) => updateRule('manualReview', event.target.checked)} />
        </label>
        <label className="toggle-card panel">
          <span>Auto email</span>
          <input type="checkbox" checked={rules.autoEmail} onChange={(event) => updateRule('autoEmail', event.target.checked)} />
        </label>
      </section>
    </div>
  )
}

export default AdminRules
