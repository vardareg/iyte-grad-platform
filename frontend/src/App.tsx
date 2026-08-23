import { useEffect, useState } from 'react'

import './app.css'

type BackendState = 'checking' | 'online' | 'offline'

type SystemStatus = {
  service: string
  status: string
  phase: string
}

const architectureParts = [
  {
    label: 'Web',
    value: 'React + TypeScript',
    detail: 'Operator-facing application shell',
  },
  {
    label: 'Platform',
    value: 'Java 21 + Spring Boot',
    detail: 'One modular backend deployment',
  },
  {
    label: 'Data',
    value: 'PostgreSQL + PostGIS',
    detail: 'Authoritative metadata foundation',
  },
]

function App() {
  const [backendState, setBackendState] = useState<BackendState>('checking')

  useEffect(() => {
    const controller = new AbortController()

    async function checkBackend() {
      try {
        const response = await fetch('/api/system/status', {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Backend returned ${response.status}`)
        }

        const status = (await response.json()) as SystemStatus
        setBackendState(status.status === 'UP' ? 'online' : 'offline')
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        setBackendState('offline')
      }
    }

    void checkBackend()
    return () => controller.abort()
  }, [])

  const statusText = {
    checking: 'Checking backend',
    online: 'Backend connected',
    offline: 'Backend unavailable',
  }[backendState]

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <div className="hero__content">
          <p className="eyebrow">İYTE graduation project</p>
          <h1 id="page-title">Remote-sensing workflows, built around explicit boundaries.</h1>
          <p className="hero__summary">
            A small platform for composing, validating, executing, and inspecting
            typed raster workflows. This first milestone proves only the runtime
            foundation.
          </p>

          <div className={`status status--${backendState}`} role="status">
            <span className="status__dot" aria-hidden="true" />
            <span>{statusText}</span>
          </div>
        </div>

        <div className="milestone-card">
          <span className="milestone-card__index">M0</span>
          <div>
            <p className="milestone-card__label">Foundation milestone</p>
            <h2>M0 walking skeleton</h2>
            <p>Application, database, migration, and test foundations only.</p>
          </div>
        </div>
      </section>

      <section className="architecture" aria-labelledby="architecture-title">
        <div className="section-heading">
          <p className="eyebrow">Approved runtime</p>
          <h2 id="architecture-title">One visible path through the stack</h2>
        </div>

        <div className="architecture__grid">
          {architectureParts.map((part, index) => (
            <article className="architecture-card" key={part.label}>
              <span className="architecture-card__number">0{index + 1}</span>
              <p className="architecture-card__label">{part.label}</p>
              <h3>{part.value}</h3>
              <p>{part.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <aside className="scope-note">
        <span>Scope guard</span>
        <p>
          Domain features begin in M1. No plugin, DAG, processing, or artifact
          capability is represented as implemented yet.
        </p>
      </aside>
    </main>
  )
}

export default App
