function StatCard({ label, value, delta }) {
  return (
    <article className="stat-card panel">
      <p className="stat-card__label">{label}</p>
      <h3>{value}</h3>
      <p className="stat-card__delta">{delta}</p>
    </article>
  )
}

export default StatCard
