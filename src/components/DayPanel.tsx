import type { AppSettings, DayBundle } from '../types'
import { SPORT_COLORS, SPORT_LABELS } from '../lib/sports'
import { formatLocalDateLabel, formatLocalTime } from '../lib/time'
import { ScoreBreakdownBars } from './ScoreBreakdownBars'

interface Props {
  bundle: DayBundle | null
  timezone: string
  settings: AppSettings
  onClose: () => void
}

export function DayPanel({ bundle, timezone, settings, onClose }: Props) {
  if (!bundle) {
    return (
      <aside className="day-panel">
        <div className="drawer-header">
          <h2>Day detail</h2>
        </div>
        <p className="empty-inline">Select a day to see ranked games and why they rank.</p>
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
            {settings.mode === 'personal' ? ' · personal mode' : ' · neutral mode'}
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
          <div className="watch-this-label">Watch this</div>
          <div className="watch-this-title">{bundle.pickOfDay.title}</div>
          <div className="muted">
            {formatLocalTime(bundle.pickOfDay.startUtc, timezone)} ·{' '}
            <span className="mono">{bundle.pickOfDay.watchability ?? '—'}</span>/100
          </div>

          {bundle.pickRationale && bundle.pickRationale.length > 0 && (
            <div className="pick-why">
              <div className="pick-why-title">Why this over the rest</div>
              <ul>
                {bundle.pickRationale.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {bundle.pickOfDay.breakdown && (
            <ScoreBreakdownBars
              breakdown={bundle.pickOfDay.breakdown}
              weights={settings.weights}
            />
          )}
        </div>
      )}

      {bundle.isCrowded && bundle.conflictBlocks.length > 0 && (
        <div className="conflict-section">
          <h3>Live conflicts</h3>
          {bundle.conflictBlocks.map((block, i) => (
            <div key={i} className="conflict-block">
              <div className="muted tiny">
                Overlapping windows · live pick:{' '}
                <strong>{block.recommended.title}</strong>
                {block.recommended.headline ? ` — ${block.recommended.headline}` : ''}
              </div>
              <ul>
                {block.events.map((e) => (
                  <li key={e.id}>
                    {e.id === block.recommended.id ? '→ ' : '· '}
                    {e.title}{' '}
                    <span className="mono">({e.watchability})</span>
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
            style={{ borderLeftColor: SPORT_COLORS[e.sport] }}
          >
            <div className="event-card-top">
              <span className="rank-badge">#{idx + 1}</span>
              <span className="sport-badge" style={{ background: SPORT_COLORS[e.sport] }}>
                {SPORT_LABELS[e.sport]}
              </span>
              {e.mustSee && <span className="must-see-badge">Must-see</span>}
              {e.provisional && <span className="prov-badge">Provisional</span>}
              <span className="score-badge mono">{e.watchability ?? '—'}</span>
            </div>
            <h4>{e.title}</h4>
            {e.headline && <p className="event-headline">{e.headline}</p>}
            <div className="muted">
              {formatLocalTime(e.startUtc, timezone)}
              {e.venue ? ` · ${e.venue}` : ''}
            </div>
            {e.broadcasts.length > 0 && (
              <div className="muted tiny">TV: {e.broadcasts.join(', ')}</div>
            )}
            {e.breakdown && (
              <ScoreBreakdownBars
                breakdown={e.breakdown}
                weights={settings.weights}
                compact
              />
            )}
            {e.reasons && e.reasons.length > 0 && (
              <details className="reasons-details">
                <summary>Full scoring notes</summary>
                <ul className="reasons">
                  {e.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </details>
            )}
          </article>
        ))}
      </div>
    </aside>
  )
}
