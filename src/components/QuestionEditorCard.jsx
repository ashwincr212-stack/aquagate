function QuestionEditorCard({ question, onChange, onSave, onDeactivate, saving }) {
  const rubric = question.rubric ?? {}
  const rubricTotal =
    Number(rubric.correctness ?? 0) +
    Number(rubric.clarity ?? 0) +
    Number(rubric.depth ?? 0) +
    Number(rubric.examples ?? 0)

  return (
    <article className="panel question-card">
      <div className="question-card__top">
        <h3>Question {question.order}</h3>
        <div className="button-row">
          <span className={`status-pill ${question.isActive === false ? 'status-pill--soft' : ''}`}>
            {question.isActive === false ? 'Inactive' : 'Active'}
          </span>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => onSave(question.id)}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            className="button button--ghost button--danger"
            onClick={() => onDeactivate(question.id)}
            disabled={saving || question.isActive === false}
          >
            Deactivate
          </button>
        </div>
      </div>

      <div className="question-grid">
        <label className="field field--full">
          <span>Question text</span>
          <textarea
            rows="3"
            value={question.questionText}
            onChange={(event) => onChange(question.id, 'questionText', event.target.value)}
          />
        </label>

        <label className="field field--full">
          <span>Model answer</span>
          <textarea
            rows="3"
            value={question.modelAnswer}
            onChange={(event) => onChange(question.id, 'modelAnswer', event.target.value)}
          />
        </label>

        <label className="field">
          <span>Max score</span>
          <input
            type="number"
            value={question.maxScore}
            onChange={(event) => onChange(question.id, 'maxScore', Number(event.target.value))}
          />
        </label>

        <label className="field">
          <span>Order</span>
          <input
            type="number"
            value={question.order}
            onChange={(event) => onChange(question.id, 'order', Number(event.target.value))}
          />
        </label>

        <label className="field">
          <span>Active</span>
          <select
            value={question.isActive ? 'true' : 'false'}
            onChange={(event) => onChange(question.id, 'isActive', event.target.value === 'true')}
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>

        <label className="field">
          <span>Rubric: Correctness</span>
          <input
            type="number"
            value={rubric.correctness ?? 0}
            onChange={(event) => onChange(question.id, 'rubric.correctness', Number(event.target.value))}
          />
        </label>

        <label className="field">
          <span>Rubric: Clarity</span>
          <input
            type="number"
            value={rubric.clarity ?? 0}
            onChange={(event) => onChange(question.id, 'rubric.clarity', Number(event.target.value))}
          />
        </label>

        <label className="field">
          <span>Rubric: Depth</span>
          <input
            type="number"
            value={rubric.depth ?? 0}
            onChange={(event) => onChange(question.id, 'rubric.depth', Number(event.target.value))}
          />
        </label>

        <label className="field">
          <span>Rubric: Examples</span>
          <input
            type="number"
            value={rubric.examples ?? 0}
            onChange={(event) => onChange(question.id, 'rubric.examples', Number(event.target.value))}
          />
        </label>
      </div>

      <p className={rubricTotal === Number(question.maxScore ?? 0) ? 'muted' : 'error-copy'}>
        Rubric total: {rubricTotal} / Max score: {question.maxScore}
      </p>
    </article>
  )
}

export default QuestionEditorCard
