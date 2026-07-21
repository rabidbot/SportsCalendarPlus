import type { DayBundle } from '../types'
import { SPORT_COLORS, SPORT_LABELS } from '../lib/sports'
import { formatLocalDateLabel, formatLocalTime } from '../lib/time'

interface Props {
  bundle: DayBundle | null
  timezone: string
  onClose: () => void
}

export function DayPanel({ bundle, timezone, onClose }: Props) {
  if (!bundle) {
    return (
      <aside className="day-panel">
        <div className="drawer-header">
          <h2>Day detail</h2>
        </div>
        <p className="empty-inline">Select a day to see ranked games and watch order.</p>
      </aside>
    )
  }

  return (
    <aside className="day-panel">
      <div className="drawer-header">
        <div>
          <h2>{formatLocalDateLabel(bundle.date, timezone)}</h2>
          <p className="muted">
            {bundle.events.length} event{bundle.events.length === 1 ? '' : 's'}
            {bundle.isCrowded ? ' · crowded day' : ''}
          </p>
        </div>
        <button type="button" className="btn ghost" onClick={onClose}>
          Close
        </button>
      </div>

      {bundle.events.length === 0 && (
        <p className="empty-inline">No tracked fixtures on this day.</p>
      )}

      {bundle.pickOfDay && (
        <div className="watch-this">
          <div className="watch-this-label">♛ Watch this</div>
          <div className="watch-this-title">{bundle.pickOfDay.title}</div>
          <div className="muted">
            {formatLocalTime(bundle.pickOfDay.startUtc, timezone)} · score{' '}
            {bundle.pickOfDay.watchability ?? '—'}
          </div>
        </div>
      )}

      {bundle.isCrowded && bundle.conflictBlocks.length > 0 && (
        <div className="conflict-section">
          <h3>Conflicts</h3>
          {bundle.conflictBlocks.map((block, i) => (
            <div key={i} className="conflict-block">
              <div className="muted tiny">
                Overlap · prioritize {block.recommended.title}
              </div>
              <ul>
                {block.events.map((e) => (
                  <li key={e.id}>
                    {e.id === block.recommended.id ? '▶ ' : '○ '}
                    {e.title} ({e.watchability})
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="ranked-list">
        <h3>Ranked watch order</h3>
        {bundle.ranked.map((e, idx) => (
          <article
            key={e.id}
            className={`event-card ${e.provisional ? 'provisional' : ''} ${e.id === bundle.pickOfDay?.id ? 'pick' : ''}`}
            style={{ borderTopColor: SPORT_COLORS[e.sport] }}
          >
            <div className="event-card-top">
              <span className="rank-badge">#{idx + 1}</span>
              <span className="sport-badge" style={{ background: SPORT_COLORS[e.sport] }}>
                {SPORT_LABELS[e.sport]}
              </span>
              {e.mustSee && <span className="must-see-badge">Must-see</span>}
              {e.provisional && <span className="prov-badge">Provisional</span>}
              <span className="score-badge">{e.watchability ?? '—'}</span>
            </div>
            <h4>{e.title}</h4>
            <div className="muted">
              {formatLocalTime(e.startUtc, timezone)}
              {e.venue ? ` · ${e.venue}` : ''}
            </div>
            {e.broadcasts.length > 0 && (
              <div className="muted tiny">TV: {e.broadcasts.join(', ')}</div>
            )}
            {e.reasons && e.reasons.length > 0 && (
              <ul className="reasons">
                {e.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </aside>
  )
}
