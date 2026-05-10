import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useProgram } from '../hooks/useProgram.js'
import { useProgramQuestions } from '../hooks/useProgramQuestions.js'
import { createSubmission, updateCandidate } from '../services/firestoreService.js'

function validateAnswers(questions, answers) {
  const nextErrors = {}

  questions.forEach((question) => {
    const answerText = answers[question.id]?.trim() ?? ''

    if (!answerText) {
      nextErrors[question.id] = 'This answer is required.'
      return
    }

    if (answerText.length < 20) {
      nextErrors[question.id] = 'Each answer must be at least 20 characters.'
    }
  })

  return nextErrors
}

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
  const [answerErrors, setAnswerErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const candidateId = sessionStorage.getItem('aquagate_candidate_id')

  useEffect(() => {
    if (!questions.length) {
      setAnswers({})
      setAnswerErrors({})
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
    setSubmitError('')
    setAnswerErrors((current) => {
      if (!current[questionId]) {
        return current
      }

      const next = { ...current }
      delete next[questionId]
      return next
    })
  }

  const handleSaveDraft = () => {
    setDraftSaved(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validateAnswers(questions, answers)
    setAnswerErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setSubmitError('Please complete all answers with at least 20 characters before submitting.')
      return
    }

    if (!candidateId) {
      setSubmitError('Please complete registration before starting the assessment.')
      return
    }

    try {
      setIsSubmitting(true)
      setSubmitError('')

      const formattedAnswers = questions.map((question) => ({
        questionId: question.id,
        questionText: question.questionText,
        answerText: answers[question.id].trim(),
        maxScore: question.maxScore,
        order: question.order,
      }))

      const submissionId = await createSubmission({
        candidateId,
        programId: program.id,
        programSlug: program.slug,
        programTitle: program.title,
        answers: formattedAnswers,
        totalQuestions: questions.length,
        status: 'pending_ai_score',
        borderline: false,
        totalScore: null,
        aiScores: [],
        criteriaVersion: program.criteriaVersion ?? 1,
        questionVersion: program.questionVersion ?? 1,
      })

      await updateCandidate(candidateId, {
        status: 'assessment_submitted',
        latestSubmissionId: submissionId,
      })

      sessionStorage.setItem('aquagate_submission_id', submissionId)
      navigate(`/result/${submissionId}`)
    } catch (firestoreError) {
      setSubmitError(`Unable to submit your assessment right now. ${firestoreError.message}`)
    } finally {
      setIsSubmitting(false)
    }
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

  if (!candidateId) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Assessment</p>
        <h1>Registration required</h1>
        <p className="hero-copy">Please complete registration before starting the assessment.</p>
        <div className="button-row">
          <Link to={`/register/${programSlug}`} className="button">
            Go to Registration
          </Link>
        </div>
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
        {submitError ? <p className="error-copy">{submitError}</p> : null}
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
            {answerErrors[question.id] ? <p className="error-copy">{answerErrors[question.id]}</p> : null}
          </article>
        ))}
      </div>

      <section className="panel">
        <div className="button-row">
          <button type="button" className="button button--ghost" onClick={handleSaveDraft}>
            Save Draft
          </button>
          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting assessment...' : 'Submit Assessment'}
          </button>
        </div>
        {draftSaved ? <p className="success-copy">Draft saved locally for this mocked frontend demo.</p> : null}
      </section>
    </form>
  )
}

export default Assessment
