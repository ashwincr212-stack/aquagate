import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
      nextErrors[question.id] = 'Please answer all questions with at least 20 characters.'
    }
  })

  return nextErrors
}

function Assessment() {
  const { programSlug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
  const isAdminPreview = searchParams.get('preview') === 'admin'
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

    if (isSubmitting) {
      return
    }

    const nextErrors = validateAnswers(questions, answers)
    setAnswerErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setSubmitError('Please answer all questions with at least 20 characters.')
      return
    }

    if (!candidateId && !isAdminPreview) {
      setSubmitError('Please complete registration before starting the assessment.')
      return
    }

    if (isAdminPreview) {
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
        <div className="step-banner">
          <span className="status-pill status-pill--soft">Step 2 of 2</span>
          <span className="eyebrow">Assessment</span>
        </div>
        <h1>Loading assessment...</h1>
        <p className="hero-copy">Fetching the latest program details and question set from AquaGate.</p>
      </section>
    )
  }

  if (error || !program || questions.length === 0) {
    return (
      <section className="panel panel--glow">
        <div className="step-banner">
          <span className="status-pill status-pill--soft">Step 2 of 2</span>
          <span className="eyebrow">Assessment</span>
        </div>
        <h1>Assessment unavailable</h1>
        <p className="hero-copy">{error || 'This assessment is not ready yet for the selected program.'}</p>
      </section>
    )
  }

  if (!candidateId && !isAdminPreview) {
    return (
      <section className="panel panel--glow">
        <div className="step-banner">
          <span className="status-pill status-pill--soft">Step 2 of 2</span>
          <span className="eyebrow">Assessment</span>
        </div>
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
            <div className="step-banner">
              <span className="status-pill status-pill--soft">Step 2 of 2</span>
              <span className="eyebrow">Assessment</span>
            </div>
            <h1>{program.title}</h1>
            <p className="muted">Answer every question carefully. The admin team will review your assessment after submission.</p>
          </div>
          <span className="status-pill">{answeredCount} / {questions.length} answered</span>
        </div>

        <div className="progress-bar" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="muted">{questions.length} questions loaded for this program. Each answer should be at least 20 characters.</p>
        {fallbackMessage ? <p className="muted">{fallbackMessage}</p> : null}
        {isAdminPreview ? <p className="status-pill">Admin preview mode - answers will not be submitted.</p> : null}
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
            <div className="question-meta-row">
              <p className="muted">Answer clearly and keep examples specific when possible.</p>
              <span className="character-count">{(answers[question.id] ?? '').trim().length} characters</span>
            </div>
            <textarea
              rows="4"
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
          <button type="button" className="button button--ghost" onClick={handleSaveDraft} disabled={isSubmitting}>
            Save Draft
          </button>
          {isAdminPreview ? (
            <button type="button" className="button" onClick={() => navigate('/admin/questions')}>
              Preview only - return to Admin Questions
            </button>
          ) : (
            <button type="submit" className="button" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting your assessment...' : 'Submit Assessment'}
            </button>
          )}
        </div>
        {draftSaved ? <p className="success-copy">Draft saved locally for this mocked frontend demo.</p> : null}
      </section>
    </form>
  )
}

export default Assessment
