import type { DayBundle } from '../types'
import { SPORT_COLORS } from '../lib/sports'
import { formatMonthYear, getMonthGrid, shiftMonth } from '../lib/time'

interface Props {
  year: number
  month: number
  timezone: string
  dayMap: Map<string, DayBundle>
  selectedDate: string | null
  onSelectDate: (date: string) => void
  onChangeMonth: (year: number, month: number) => void
}

export function MonthGrid({
  year,
  month,
  timezone,
  dayMap,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}: Props) {
  const cells = getMonthGrid(year, month)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  function nav(delta: number) {
    const next = shiftMonth(year, month, delta)
    onChangeMonth(next.year, next.month)
  }

  return (
    <section className="month-grid-wrap">
      <div className="month-nav">
        <button type="button" className="btn ghost" onClick={() => nav(-1)}>
          ‹
        </button>
        <h2>{formatMonthYear(year, month, timezone)}</h2>
        <button type="button" className="btn ghost" onClick={() => nav(1)}>
          ›
        </button>
      </div>

      <div className="dow-row">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="dow">
            {d}
          </div>
        ))}
      </div>

      <div className="month-grid">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className="day-cell empty" />
          const bundle = dayMap.get(date)
          const events = bundle?.ranked.slice(0, 3) ?? []
          const extra = (bundle?.events.length ?? 0) - events.length
          const isToday = date === todayStr
          const isSelected = date === selectedDate
          const pickId = bundle?.pickOfDay?.id

          return (
            <button
              key={date}
              type="button"
              className={`day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${bundle?.isCrowded ? 'crowded' : ''}`}
              onClick={() => onSelectDate(date)}
            >
              <div className="day-num">
                <span>{Number(date.slice(-2))}</span>
                {bundle?.pickOfDay && <span className="crown" title="Pick of the day">♛</span>}
              </div>
              <div className="day-chips">
                {events.map((e) => (
                  <div
                    key={e.id}
                    className={`event-chip ${e.provisional ? 'provisional' : ''}`}
                    style={{ borderLeftColor: SPORT_COLORS[e.sport] }}
                    title={e.title}
                  >
                    <span className="chip-title">
                      {e.id === pickId ? '♛ ' : ''}
                      {e.mustSee ? '★ ' : ''}
                      {shortTitle(e.title)}
                    </span>
                  </div>
                ))}
                {extra > 0 && <div className="more-chip">+{extra} more</div>}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function shortTitle(title: string): string {
  if (title.length <= 22) return title
  return title.slice(0, 20) + '…'
}
