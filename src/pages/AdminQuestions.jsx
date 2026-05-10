import { useState } from 'react'
import QuestionEditorCard from '../components/QuestionEditorCard.jsx'
import { mockQuestions } from '../data/mockData.js'

function AdminQuestions() {
  const [questions, setQuestions] = useState(mockQuestions)
  const [importText, setImportText] = useState('')

  const handleChange = (id, field, value) => {
    setQuestions((current) => current.map((question) => (question.id === id ? { ...question, [field]: value } : question)))
  }

  const handleDelete = (id) => {
    setQuestions((current) => current.filter((question) => question.id !== id))
  }

  const handleAdd = () => {
    setQuestions((current) => [
      ...current,
      {
        id: `q${current.length + 1}`,
        order: current.length + 1,
        prompt: 'New question prompt',
        modelAnswer: 'Expected answer guidance',
        rubricMarks: 'Rubric criteria',
        maxScore: 10,
      },
    ])
  }

  return (
    <div className="stack-lg">
      <section className="panel panel--glow">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Assessment builder</p>
            <h2>No-code question management</h2>
          </div>
          <div className="button-row">
            <button type="button" className="button button--ghost">
              Preview Assessment
            </button>
            <button type="button" className="button" onClick={handleAdd}>
              Add Question
            </button>
          </div>
        </div>
        <p className="muted">Admins can later control questions, model answers, order, and scoring without touching code.</p>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Bulk upload</p>
            <h3>CSV / JSON import area</h3>
          </div>
        </div>
        <label className="field">
          <span>Paste CSV or JSON payload</span>
          <textarea
            rows="5"
            placeholder='[{"prompt":"Question text","maxScore":10}]'
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
          />
        </label>
      </section>

      <div className="stack-md">
        {questions.map((question) => (
          <QuestionEditorCard key={question.id} question={question} onChange={handleChange} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  )
}

export default AdminQuestions
