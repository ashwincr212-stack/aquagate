import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QuestionEditorCard from '../components/QuestionEditorCard.jsx'
import { createQuestion, deactivateQuestion, getPrograms, getQuestions, updateQuestion } from '../services/firestoreService.js'

function normalizeProgram(program) {
  return {
    id: program.id,
    slug: program.slug ?? program.programSlug ?? program.id,
    title: program.title ?? program.name ?? 'Untitled Program',
  }
}

function normalizeQuestion(question) {
  return {
    id: question.id,
    programId: question.programId ?? '',
    programSlug: question.programSlug ?? '',
    questionText: question.questionText ?? question.prompt ?? '',
    modelAnswer: question.modelAnswer ?? '',
    maxScore: Number(question.maxScore ?? 10),
    order: Number(question.order ?? 1),
    isActive: question.isActive ?? question.active ?? true,
    rubric: {
      correctness: Number(question.rubric?.correctness ?? 0),
      clarity: Number(question.rubric?.clarity ?? 0),
      depth: Number(question.rubric?.depth ?? 0),
      examples: Number(question.rubric?.examples ?? 0),
    },
    isDraft: false,
  }
}

function createEmptyQuestion(program, order) {
  return {
    id: `draft-${Date.now()}-${order}`,
    programId: program.id,
    programSlug: program.slug,
    questionText: 'New question prompt',
    modelAnswer: 'Expected answer guidance',
    maxScore: 10,
    order,
    isActive: true,
    rubric: {
      correctness: 4,
      clarity: 2,
      depth: 2,
      examples: 2,
    },
    isDraft: true,
  }
}

function getRubricTotal(rubric = {}) {
  return Number(rubric.correctness ?? 0) + Number(rubric.clarity ?? 0) + Number(rubric.depth ?? 0) + Number(rubric.examples ?? 0)
}

function validateQuestion(question) {
  if (!question.questionText?.trim()) {
    return 'Question text is required.'
  }

  if (!question.modelAnswer?.trim()) {
    return 'Model answer is required.'
  }

  if (!Number.isFinite(Number(question.maxScore)) || Number(question.maxScore) <= 0) {
    return 'Max score must be a positive number.'
  }

  if (!Number.isFinite(Number(question.order)) || Number(question.order) <= 0) {
    return 'Order must be a positive number.'
  }

  if (getRubricTotal(question.rubric) !== Number(question.maxScore)) {
    return 'Rubric total must equal max score.'
  }

  return ''
}

function AdminQuestions() {
  const navigate = useNavigate()
  const [programs, setPrograms] = useState([])
  const [selectedProgramSlug, setSelectedProgramSlug] = useState('')
  const [questions, setQuestions] = useState([])
  const [importText, setImportText] = useState('')
  const [loading, setLoading] = useState(true)
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState({ tone: '', text: '' })
  const [savingMap, setSavingMap] = useState({})

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
      setQuestions([])
      return
    }

    let cancelled = false

    async function loadProgramQuestions() {
      try {
        setQuestionsLoading(true)
        setError('')
        const nextQuestions = await getQuestions({ programSlug: selectedProgram.slug, programId: selectedProgram.id })

        if (!cancelled) {
          setQuestions(nextQuestions.map(normalizeQuestion))
        }
      } catch (loadError) {
        if (!cancelled) {
          setQuestions([])
          setError(`Unable to load questions from Firestore. ${loadError.message}`)
        }
      } finally {
        if (!cancelled) {
          setQuestionsLoading(false)
        }
      }
    }

    loadProgramQuestions()

    return () => {
      cancelled = true
    }
  }, [selectedProgram])

  const handleChange = (id, field, value) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.id !== id) {
          return question
        }

        if (field.startsWith('rubric.')) {
          const rubricField = field.split('.')[1]
          return {
            ...question,
            rubric: {
              ...question.rubric,
              [rubricField]: value,
            },
          }
        }

        return { ...question, [field]: value }
      }),
    )
    setMessage({ tone: '', text: '' })
  }

  const setSaving = (id, saving) => {
    setSavingMap((current) => ({ ...current, [id]: saving }))
  }

  const handleSave = async (id) => {
    const question = questions.find((item) => item.id === id)
    if (!question || !selectedProgram) {
      return
    }

    const validationError = validateQuestion(question)
    if (validationError) {
      setMessage({ tone: 'error', text: validationError })
      return
    }

    const payload = {
      programSlug: selectedProgram.slug,
      questionText: question.questionText.trim(),
      modelAnswer: question.modelAnswer.trim(),
      maxScore: Number(question.maxScore),
      order: Number(question.order),
      isActive: Boolean(question.isActive),
      active: Boolean(question.isActive),
      rubric: question.rubric,
    }

    try {
      setSaving(id, true)

      if (question.isDraft) {
        const questionId = await createQuestion(selectedProgram.id, payload)
        setQuestions((current) =>
          current
            .map((item) =>
              item.id === id
                ? normalizeQuestion({
                    ...payload,
                    id: questionId,
                    programId: selectedProgram.id,
                  })
                : item,
            )
            .sort((left, right) => left.order - right.order),
        )
        setMessage({ tone: 'success', text: 'Question added successfully.' })
      } else {
        await updateQuestion(selectedProgram.id, id, payload)
        setQuestions((current) =>
          current
            .map((item) => (item.id === id ? { ...item, ...payload, isDraft: false } : item))
            .sort((left, right) => left.order - right.order),
        )
        setMessage({ tone: 'success', text: 'Question saved successfully.' })
      }
    } catch (saveError) {
      setMessage({ tone: 'error', text: `Unable to save question. ${saveError.message}` })
    } finally {
      setSaving(id, false)
    }
  }

  const handleDeactivate = async (id) => {
    const question = questions.find((item) => item.id === id)
    if (!question || !selectedProgram) {
      return
    }

    if (question.isDraft) {
      setQuestions((current) => current.filter((item) => item.id !== id))
      return
    }

    try {
      setSaving(id, true)
      await deactivateQuestion(selectedProgram.id, id)
      setQuestions((current) =>
        current.map((item) => (item.id === id ? { ...item, isActive: false } : item)).sort((left, right) => left.order - right.order),
      )
      setMessage({ tone: 'success', text: 'Question deactivated successfully.' })
    } catch (saveError) {
      setMessage({ tone: 'error', text: `Unable to deactivate question. ${saveError.message}` })
    } finally {
      setSaving(id, false)
    }
  }

  const handleAdd = () => {
    if (!selectedProgram) {
      return
    }

    const nextOrder = questions.length ? Math.max(...questions.map((question) => Number(question.order ?? 0))) + 1 : 1
    setQuestions((current) => [...current, createEmptyQuestion(selectedProgram, nextOrder)])
    setMessage({ tone: '', text: '' })
  }

  const handleImport = async () => {
    if (!selectedProgram) {
      setMessage({ tone: 'error', text: 'Select a program before uploading questions.' })
      return
    }

    let parsed
    try {
      parsed = JSON.parse(importText)
    } catch {
      setMessage({ tone: 'error', text: 'Enter valid JSON before uploading.' })
      return
    }

    if (!Array.isArray(parsed)) {
      setMessage({ tone: 'error', text: 'JSON upload must be an array of question objects.' })
      return
    }

    const normalizedPayload = parsed.map((item, index) =>
      normalizeQuestion({
        ...item,
        id: `upload-${index + 1}`,
        programId: selectedProgram.id,
        programSlug: selectedProgram.slug,
        isActive: item.isActive ?? true,
      }),
    )

    for (const question of normalizedPayload) {
      const validationError = validateQuestion(question)
      if (validationError) {
        setMessage({ tone: 'error', text: `Upload failed for question order ${question.order}. ${validationError}` })
        return
      }
    }

    try {
      setQuestionsLoading(true)
      for (const question of normalizedPayload) {
        await createQuestion(selectedProgram.id, {
          programSlug: selectedProgram.slug,
          questionText: question.questionText.trim(),
          modelAnswer: question.modelAnswer.trim(),
          maxScore: Number(question.maxScore),
          order: Number(question.order),
          isActive: Boolean(question.isActive),
          active: Boolean(question.isActive),
          rubric: question.rubric,
        })
      }

      const refreshedQuestions = await getQuestions({ programSlug: selectedProgram.slug, programId: selectedProgram.id })
      setQuestions(refreshedQuestions.map(normalizeQuestion))
      setImportText('')
      setMessage({ tone: 'success', text: `Uploaded ${normalizedPayload.length} questions successfully.` })
    } catch (uploadError) {
      setMessage({ tone: 'error', text: `Unable to upload questions. ${uploadError.message}` })
    } finally {
      setQuestionsLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Assessment builder</p>
        <h2>Loading real programs...</h2>
        <p className="muted">Fetching program and question management data from Firestore.</p>
      </section>
    )
  }

  if (error && !selectedProgram) {
    return (
      <section className="panel panel--glow">
        <p className="eyebrow">Assessment builder</p>
        <h2>Unable to load question manager</h2>
        <p className="error-copy">{error}</p>
      </section>
    )
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
            <button
              type="button"
              className="button button--ghost"
              onClick={() => selectedProgram && navigate(`/assessment/${selectedProgram.slug}?preview=admin`)}
              disabled={!selectedProgram}
            >
              Preview Assessment
            </button>
            <button type="button" className="button" onClick={handleAdd} disabled={!selectedProgram}>
              Add Question
            </button>
          </div>
        </div>
        <p className="muted">Admins can now manage real Firestore questions, model answers, rubric scoring, and active assessment content.</p>
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

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Bulk upload</p>
            <h3>JSON import area</h3>
          </div>
          <button
            type="button"
            className="button button--ghost"
            onClick={handleImport}
            disabled={!selectedProgram || questionsLoading}
          >
            {questionsLoading ? 'Uploading...' : 'Upload JSON'}
          </button>
        </div>
        <label className="field">
          <span>Paste JSON payload</span>
          <textarea
            rows="8"
            placeholder={'[\n  {\n    "questionText": "...",\n    "modelAnswer": "...",\n    "maxScore": 10,\n    "order": 1,\n    "rubric": {\n      "correctness": 4,\n      "clarity": 2,\n      "depth": 2,\n      "examples": 2\n    }\n  }\n]'}
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
          />
        </label>
      </section>

      {questionsLoading ? (
        <section className="panel">
          <p className="muted">Loading real Firestore questions for the selected program...</p>
        </section>
      ) : questions.length === 0 ? (
        <section className="panel">
          <p className="muted">No questions found for this program yet. Add one or upload a JSON array to begin.</p>
        </section>
      ) : (
        <div className="stack-md">
          {questions.map((question) => (
            <QuestionEditorCard
              key={question.id}
              question={question}
              onChange={handleChange}
              onSave={handleSave}
              onDeactivate={handleDeactivate}
              saving={Boolean(savingMap[question.id])}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminQuestions
