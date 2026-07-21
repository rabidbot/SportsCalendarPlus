import type { DayBundle } from '../types'
import { SPORT_COLORS } from '../lib/sports'
import {
  addDaysToLocalDate,
  formatLocalTime,
  formatShortDate,
  formatWeekRange,
  getWeekDates,
  todayLocalDate,
} from '../lib/time'

interface Props {
  weekStart: string
  timezone: string
  dayMap: Map<string, DayBundle>
  selectedDate: string | null
  onSelectDate: (date: string) => void
  onChangeWeek: (weekStart: string) => void
}

export function WeekView({
  weekStart,
  timezone,
  dayMap,
  selectedDate,
  onSelectDate,
  onChangeWeek,
}: Props) {
  const days = getWeekDates(weekStart)
  const today = todayLocalDate(timezone)

  return (
    <section className="week-view-wrap">
      <div className="month-nav">
        <button
          type="button"
          className="btn ghost"
          onClick={() => onChangeWeek(addDaysToLocalDate(weekStart, -7))}
        >
          ‹
        </button>
        <h2>{formatWeekRange(weekStart, timezone)}</h2>
        <button
          type="button"
          className="btn ghost"
          onClick={() => onChangeWeek(addDaysToLocalDate(weekStart, 7))}
        >
          ›
        </button>
      </div>

      <div className="week-grid">
        {days.map((date) => {
          const bundle = dayMap.get(date)
          const ranked = bundle?.ranked ?? []
          const isToday = date === today
          const isSelected = date === selectedDate
          const pickId = bundle?.pickOfDay?.id

          return (
            <button
              key={date}
              type="button"
              className={`week-col ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${bundle?.isCrowded ? 'crowded' : ''}`}
              onClick={() => onSelectDate(date)}
            >
              <div className="week-col-head">
                <span>{formatShortDate(date, timezone)}</span>
                {bundle?.pickOfDay && <span className="crown" title="Pick of day">♛</span>}
              </div>
              <div className="week-col-body">
                {ranked.length === 0 && (
                  <div className="week-empty muted tiny">No games</div>
                )}
                {ranked.map((e) => (
                  <div
                    key={e.id}
                    className={`week-event ${e.provisional ? 'provisional' : ''} ${e.id === pickId ? 'is-pick' : ''}`}
                    style={{ borderLeftColor: SPORT_COLORS[e.sport] }}
                  >
                    <div className="week-event-time mono">
                      {formatLocalTime(e.startUtc, timezone)}
                      {e.mustSee ? ' ★' : ''}
                      {e.id === pickId ? ' ♛' : ''}
                    </div>
                    <div className="week-event-title">{e.title}</div>
                    <div className="week-event-score mono">{e.watchability ?? '—'}</div>
                  </div>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
