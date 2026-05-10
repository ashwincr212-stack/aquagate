import { useState } from 'react'
import ProgramCard from '../components/ProgramCard.jsx'
import { programs as seedPrograms } from '../data/mockData.js'

function AdminPrograms() {
  const [items, setItems] = useState(seedPrograms)

  const handleToggle = (id) => {
    setItems((current) =>
      current.map((program) => (program.id === id ? { ...program, active: !program.active } : program)),
    )
  }

  const handleFieldChange = (id, field, value) => {
    setItems((current) => current.map((program) => (program.id === id ? { ...program, [field]: value } : program)))
  }

  const handleCreate = () => {
    const nextId = `prog-${String(items.length + 1).padStart(3, '0')}`
    setItems((current) => [
      {
        id: nextId,
        name: 'New Private Program',
        slug: `new-private-program-${current.length + 1}`,
        category: 'Private Program',
        active: false,
        mode: 'Remote',
        duration: 'TBD',
        intake: 'Upcoming',
        applicationsOpenUntil: 'TBD',
        eligibility: ['Configure in future admin flow'],
        highlights: ['Add fit notes, questions, and selection rules from portal'],
        timeline: ['Draft program', 'Publish route', 'Collect applications'],
        accessUrl: 'https://partner.example.com/new-program',
        seats: 0,
      },
      ...current,
    ])
  }

  return (
    <div className="stack-lg">
      <section className="panel panel--glow">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Program management</p>
            <h2>Control destination gateways visually</h2>
          </div>
          <button type="button" className="button" onClick={handleCreate}>
            Create Program
          </button>
        </div>
        <p className="muted">Slug and access URL fields are mocked today, but the structure is ready for portal-managed programs later.</p>
      </section>

      <div className="program-grid">
        {items.map((program) => (
          <ProgramCard
            key={program.id}
            admin
            program={program}
            onToggle={handleToggle}
            onFieldChange={handleFieldChange}
          />
        ))}
      </div>
    </div>
  )
}

export default AdminPrograms
