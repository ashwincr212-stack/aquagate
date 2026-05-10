import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProgramBySlug, mockQuestions } from '../data/mockData.js'

function Assessment() {
  const { programSlug } = useParams()
  const navigate = useNavigate()
  const program = useMemo(() => getProgramBySlug(programSlug), [programSlug])
  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(mockQuestions.map((question) => [question.id, ''])),
  )
  const [draftSaved, setDraftSaved] = useState(false)

  const answeredCount = Object.values(answers).filter((value) => value.trim()).length
  const progress = Math.round((answeredCount / mockQuestions.length) * 100)

  const handleAnswerChange = (questionId, value) => {
    setAnswers((current) => ({ ...current, [questionId]: value }))
    setDraftSaved(false)
  }

  const handleSaveDraft = () => {
    setDraftSaved(true)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const status = answeredCount >= 8 ? 'shortlisted' : answeredCount >= 5 ? 'review' : 'waitlisted'
    navigate(`/result/sub-2048?status=${status}&program=${program.slug}`)
  }

  return (
    <form className="stack-lg" onSubmit={handleSubmit}>
      <section className="panel panel--glow">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Assessment</p>
            <h1>{program.name}</h1>
          </div>
          <span className="status-pill">{progress}% complete</span>
        </div>

        <div className="progress-bar" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="muted">10 mock questions, local state only, designed for future admin-controlled question delivery.</p>
      </section>

      <div className="stack-md">
        {mockQuestions.map((question) => (
          <article key={question.id} className="panel question-answer-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Question {question.order}</p>
                <h3>{question.prompt}</h3>
              </div>
              <span className="status-pill status-pill--soft">{question.maxScore} marks</span>
            </div>
            <textarea
              rows="5"
              placeholder="Write your answer here..."
              value={answers[question.id]}
              onChange={(event) => handleAnswerChange(question.id, event.target.value)}
            />
          </article>
        ))}
      </div>

      <section className="panel">
        <div className="button-row">
          <button type="button" className="button button--ghost" onClick={handleSaveDraft}>
            Save Draft
          </button>
          <button type="submit" className="button">
            Submit Assessment
          </button>
        </div>
        {draftSaved ? <p className="success-copy">Draft saved locally for this mocked frontend demo.</p> : null}
      </section>
    </form>
  )
}

export default Assessment
