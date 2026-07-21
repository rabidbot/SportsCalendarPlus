import type { CSSProperties } from 'react'
import type { TrackedEntity } from '../types'
import { SPORT_COLORS, SPORT_LABELS } from '../lib/sports'

interface Props {
  entities: TrackedEntity[]
  filterId: string | null
  onChange: (id: string | null) => void
}

export function TeamFilter({ entities, filterId, onChange }: Props) {
  if (entities.length === 0) return null

  const active = filterId
    ? entities.find((e) => e.id === filterId)
    : null

  return (
    <section className="focus-bar" aria-label="Focus team filter">
      <div className="focus-bar-head">
        <div>
          <div className="focus-kicker">Focus</div>
          <div className="focus-title">
            {active ? active.displayName : 'All teams'}
          </div>
        </div>
        {active && (
          <button type="button" className="btn ghost tiny-btn" onClick={() => onChange(null)}>
            Clear
          </button>
        )}
      </div>

      <div className="focus-rail" role="listbox" aria-label="Filter by team">
        <button
          type="button"
          role="option"
          aria-selected={filterId == null}
          className={`focus-pill ${filterId == null ? 'active' : ''}`}
          onClick={() => onChange(null)}
        >
          <span className="focus-pill-orb all" />
          <span className="focus-pill-text">
            <strong>All</strong>
            <small>Full slate</small>
          </span>
        </button>

        {entities.map((e) => {
          const selected = filterId === e.id
          return (
            <button
              key={e.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={`focus-pill ${selected ? 'active' : ''}`}
              style={
                {
                  '--focus-accent': SPORT_COLORS[e.sport],
                } as CSSProperties
              }
              onClick={() => onChange(selected ? null : e.id)}
              title={`Show only ${e.displayName}`}
            >
              {e.logoUrl ? (
                <img src={e.logoUrl} alt="" className="focus-logo" />
              ) : (
                <span
                  className="focus-pill-orb"
                  style={{ background: SPORT_COLORS[e.sport] }}
                />
              )}
              <span className="focus-pill-text">
                <strong>{e.abbreviation || e.displayName}</strong>
                <small>{SPORT_LABELS[e.sport]}</small>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
