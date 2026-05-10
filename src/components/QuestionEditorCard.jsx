function QuestionEditorCard({ question, onChange, onDelete }) {
  return (
    <article className="panel question-card">
      <div className="question-card__top">
        <h3>Question {question.order}</h3>
        <button type="button" className="button button--ghost button--danger" onClick={() => onDelete(question.id)}>
          Delete
        </button>
      </div>

      <div className="question-grid">
        <label className="field field--full">
          <span>Question prompt</span>
          <textarea
            rows="3"
            value={question.prompt}
            onChange={(event) => onChange(question.id, 'prompt', event.target.value)}
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
          <span>Rubric marks</span>
          <input
            value={question.rubricMarks}
            onChange={(event) => onChange(question.id, 'rubricMarks', event.target.value)}
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
      </div>
    </article>
  )
}

export default QuestionEditorCard
