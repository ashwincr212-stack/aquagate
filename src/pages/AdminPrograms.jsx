import { useState } from 'react'
import ProgramCard from '../components/ProgramCard.jsx'
import { demoProgram } from '../data/demoSeedData.js'
import { programs as seedPrograms } from '../data/mockData.js'
import { seedDemoProgram } from '../services/seedService.js'

function createDemoCard() {
  return {
    id: 'prog-demo-seeded',
    name: demoProgram.title,
    slug: demoProgram.slug,
    category: 'Course',
    active: demoProgram.isActive,
    mode: 'Online',
    duration: 'Flexible',
    intake: 'Demo',
    applicationsOpenUntil: 'Development only',
    eligibility: ['Seeded into Firestore for initial admin setup'],
    highlights: ['10 realistic screening questions', 'Model answers and rubrics', 'Default active selection rules'],
    timeline: ['Seed from admin portal', 'Review in Firestore', 'Use for future real flows'],
    accessUrl: demoProgram.courseAccessUrl,
    seats: 0,
  }
}

function AdminPrograms() {
  const [items, setItems] = useState(seedPrograms)
  const [seedState, setSeedState] = useState({ tone: '', message: '' })
  const [isSeeding, setIsSeeding] = useState(false)

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

  const handleSeedDemoProgram = async () => {
    try {
      setIsSeeding(true)
      setSeedState({ tone: '', message: '' })

      const result = await seedDemoProgram()

      setItems((current) => {
        const alreadyVisible = current.some((program) => program.slug === demoProgram.slug)

        if (alreadyVisible) {
          return current
        }

        return [createDemoCard(), ...current]
      })

      setSeedState({
        tone: result.created ? 'success' : 'info',
        message: result.message,
      })
    } catch (error) {
      setSeedState({
        tone: 'error',
        message: error.message || 'Unable to seed demo program.',
      })
    } finally {
      setIsSeeding(false)
    }
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
        {import.meta.env.DEV ? (
          <div className="stack-md">
            <p className="muted">
              This is a development-only seed action. It creates the first demo program, questions, and rules in
              Firestore.
            </p>
            <div className="button-row">
              <button type="button" className="button button--ghost" onClick={handleSeedDemoProgram} disabled={isSeeding}>
                {isSeeding ? 'Seeding Demo Program...' : 'Seed Demo Program'}
              </button>
            </div>
            {seedState.message ? (
              <p className={seedState.tone === 'error' ? 'error-copy' : seedState.tone === 'success' ? 'success-copy' : 'muted'}>
                {seedState.message}
              </p>
            ) : null}
          </div>
        ) : null}
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
