import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProgram } from '../hooks/useProgram.js'
import { useProgramQuestions } from '../hooks/useProgramQuestions.js'

function Assessment() {
  const { programSlug } = useParams()
  const navigate = useNavigate()
  const { loading: programLoading, program, error: programError, fallbackMessage: programFallbackMessage } = useProgram(programSlug)
  const {
    loading: questionsLoading,
    questions,
    error: questionsError,
    fallbackMessage: questionsFallbackMessage,
  } = useProgramQuestions(programSlug)
  const [answers, setAnswers] = useState({})
  const [draftSaved, setDraftSaved] = useState(false)

  useEffect(() => {
    if (!questions.length) {
      setAnswers({})
      return
    }

    setAnswers((current) => {
      const next = {}

      questions.forEach((question) => {
        next[question.id] = current[question.id] ?? ''
      })

      return next
    })
  }, [questions])

  const answeredCount = Object.values(answers).filter((value) => value.trim()).length
  const progress = Math.round((answeredCount / (questions.length || 1)) * 100)
  const loading = programLoading || questionsLoading
  const error = programError || questionsError
  const fallbackMessage = [programFallbackMessage, questionsFallbackMessage].filter(Boolean).join(' ')

  const handleAnswerChange = (questionId, value) => {
    setAnswers((current) => ({ ...current, [questionId]: value }))
    setDraftSaved(false)
  }

  const handleSaveDraft = () => {
    setDraftSaved(true)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    navigate('/result/mock-submission')
  }

  if (loading) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Assessment</p>
        <h1>Loading assessment...</h1>
        <p className="hero-copy">Fetching the latest program details and question set from AquaGate.</p>
      </section>
    )
  }

  if (error || !program || questions.length === 0) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Assessment</p>
        <h1>Assessment unavailable</h1>
        <p className="hero-copy">{error || 'This assessment is not ready yet for the selected program.'}</p>
      </section>
    )
  }

  return (
    <form className="stack-lg" onSubmit={handleSubmit}>
      <section className="panel panel--glow">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Assessment</p>
            <h1>{program.title}</h1>
          </div>
          <span className="status-pill">{progress}% complete</span>
        </div>

        <div className="progress-bar" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="muted">
          {questions.length} Firestore-backed questions loaded. Answers stay in local state only for this step.
        </p>
        {fallbackMessage ? <p className="muted">{fallbackMessage}</p> : null}
      </section>

      <div className="stack-md">
        {questions.map((question) => (
          <article key={question.id} className="panel question-answer-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Question {question.order}</p>
                <h3>{question.questionText}</h3>
              </div>
              <span className="status-pill status-pill--soft">{question.maxScore} marks</span>
            </div>
            <textarea
              rows="5"
              placeholder="Write your answer here..."
              value={answers[question.id] ?? ''}
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
