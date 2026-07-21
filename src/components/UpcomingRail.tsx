import type { CalendarEvent, DayBundle } from '../types'
import { SPORT_COLORS, SPORT_LABELS } from '../lib/sports'
import { formatLocalTime, formatShortDate, todayLocalDate } from '../lib/time'

interface Props {
  events: CalendarEvent[]
  dayMap: Map<string, DayBundle>
  timezone: string
  onSelectDate: (date: string) => void
}

export function UpcomingRail({ events, dayMap, timezone, onSelectDate }: Props) {
  const today = todayLocalDate(timezone)
  const now = Date.now()

  const upcoming = [...events]
    .filter((e) => new Date(e.startUtc).getTime() >= now - 30 * 60 * 1000)
    .sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime())
    .slice(0, 12)

  if (upcoming.length === 0) return null

  return (
    <section className="upcoming-rail" aria-label="Coming up">
      <div className="upcoming-head">
        <span className="focus-kicker">Coming up</span>
        <span className="muted tiny">Next fixtures on your slate</span>
      </div>
      <div className="upcoming-scroll">
        {upcoming.map((e) => {
          const isPick = dayMap.get(e.localDate)?.pickOfDay?.id === e.id
          const isToday = e.localDate === today
          return (
            <button
              key={e.id}
              type="button"
              className={`upcoming-card ${isPick ? 'is-pick' : ''}`}
              style={{ borderTopColor: SPORT_COLORS[e.sport] }}
              onClick={() => onSelectDate(e.localDate)}
            >
              <div className="upcoming-meta">
                <span className="sport-badge" style={{ background: SPORT_COLORS[e.sport] }}>
                  {SPORT_LABELS[e.sport]}
                </span>
                {e.mustSee && <span className="must-see-badge">Must-see</span>}
                {isPick && <span className="pick-mini">♛</span>}
                <span className="score-badge mono">{e.watchability ?? '—'}</span>
              </div>
              <div className="upcoming-title">{e.title}</div>
              <div className="muted tiny">
                {isToday ? 'Today' : formatShortDate(e.localDate, timezone)} ·{' '}
                {formatLocalTime(e.startUtc, timezone)}
              </div>
              {e.headline && <div className="upcoming-headline">{e.headline}</div>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
