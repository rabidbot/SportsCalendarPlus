import { useMemo } from 'react'
import { TeamPicker } from './components/TeamPicker'
import { MonthGrid } from './components/MonthGrid'
import { WeekView } from './components/WeekView'
import { DayPanel } from './components/DayPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { TeamFilter } from './components/TeamFilter'
import { UpcomingRail } from './components/UpcomingRail'
import { BrandMark } from './components/BrandMark'
import { useAppState } from './state/useAppState'
import { useCalendarData } from './hooks/useCalendarData'
import { useGameAlerts } from './hooks/useGameAlerts'
import { SPORT_COLORS, SPORT_LABELS } from './lib/sports'
import {
  addDaysToLocalDate,
  startOfWeekSunday,
  todayLocalDate,
} from './lib/time'
import type { Sport } from './types'
import './App.css'

export default function App() {
  const state = useAppState()
  const cal = useCalendarData(
    state.entities,
    state.settings,
    state.favorites,
    state.filterEntityId,
  )

  useGameAlerts(cal.events, cal.dayMap, state.settings)

  const selectedBundle = useMemo(() => {
    if (!state.selectedDate) return null
    return (
      cal.dayMap.get(state.selectedDate) ?? {
        date: state.selectedDate,
        events: [],
        isCrowded: false,
        conflictBlocks: [],
        ranked: [],
      }
    )
  }, [state.selectedDate, cal.dayMap])

  const visibleEventCount = useMemo(() => {
    if (state.settings.viewMode === 'week') {
      const days = Array.from({ length: 7 }, (_, i) =>
        addDaysToLocalDate(state.weekStart, i),
      )
      return cal.events.filter((e) => days.includes(e.localDate)).length
    }
    const prefix = `${state.viewYear}-${String(state.viewMonth).padStart(2, '0')}`
    return cal.events.filter((e) => e.localDate.startsWith(prefix)).length
  }, [
    cal.events,
    state.viewYear,
    state.viewMonth,
    state.weekStart,
    state.settings.viewMode,
  ])

  const focusEntity = state.filterEntityId
    ? state.entities.find((e) => e.id === state.filterEntityId)
    : null

  function goToday() {
    const today = todayLocalDate(state.settings.timezone)
    state.setSelectedDate(today)
    state.setWeekStart(startOfWeekSunday(today))
    const [y, m] = today.split('-').map(Number)
    state.setViewYear(y)
    state.setViewMonth(m)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <BrandMark size={44} className="brand-mark" />
          <div>
            <h1>Watchlist</h1>
            <p className="muted brand-sub">
              Multi-sport calendar · ranked picks
              {focusEntity
                ? ` · focus: ${focusEntity.abbreviation || focusEntity.displayName}`
                : ''}
              {state.settings.notifications.enabled ? ' · alerts on' : ''}
            </p>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="view-toggle" role="group" aria-label="Calendar view">
            <button
              type="button"
              className={state.settings.viewMode === 'month' ? 'active' : ''}
              onClick={() => state.updateSettings({ viewMode: 'month' })}
            >
              Month
            </button>
            <button
              type="button"
              className={state.settings.viewMode === 'week' ? 'active' : ''}
              onClick={() => state.updateSettings({ viewMode: 'week' })}
            >
              Week
            </button>
          </div>
          <button type="button" className="btn" onClick={goToday}>
            Today
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => state.setPanel(state.panel === 'picker' ? 'none' : 'picker')}
          >
            Teams
            <span className="btn-count">{state.entities.length}/10</span>
          </button>
          <button
            type="button"
            className="btn"
            onClick={() =>
              state.setPanel(state.panel === 'settings' ? 'none' : 'settings')
            }
          >
            Settings
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => void cal.refetch()}
            disabled={cal.isFetching}
          >
            {cal.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      <TeamFilter
        entities={state.entities}
        filterId={state.filterEntityId}
        onChange={state.setFilterEntityId}
      />

      {state.entities.length > 0 && !cal.isLoading && (
        <UpcomingRail
          events={cal.events}
          dayMap={cal.dayMap}
          timezone={state.settings.timezone}
          onSelectDate={state.setSelectedDate}
        />
      )}

      <div className="legend">
        {(Object.keys(SPORT_LABELS) as Sport[]).map((s) => (
          <span key={s} className="legend-item">
            <i style={{ background: SPORT_COLORS[s] }} />
            {SPORT_LABELS[s]}
          </span>
        ))}
        <span className="legend-item legend-meta">♛ Pick of day</span>
        <span className="legend-item legend-meta">★ Must-see</span>
      </div>

      <main className="layout">
        <div className="main-col">
          {state.entities.length === 0 && (
            <div className="empty-state">
              <BrandMark size={64} className="empty-mark" />
              <h2>Build your watchlist</h2>
              <p>
                Add up to 10 teams across NFL, NBA, MLB, NHL, soccer, and F1. We’ll
                merge their schedules, rank every game, and surface what to watch.
              </p>
              <button
                type="button"
                className="btn primary"
                onClick={() => state.setPanel('picker')}
              >
                Add teams
              </button>
            </div>
          )}

          {state.entities.length > 0 && cal.isLoading && (
            <div className="empty-state">
              <div className="loader" />
              <p>Loading schedules…</p>
            </div>
          )}

          {state.entities.length > 0 && cal.error && (
            <div className="empty-state error-box">
              <p>Couldn’t load some schedule data. Showing whatever we have.</p>
              <p className="muted tiny">{String(cal.error)}</p>
            </div>
          )}

          {state.entities.length > 0 && !cal.isLoading && visibleEventCount === 0 && (
            <div className="banner">
              {focusEntity
                ? `No known fixtures in this ${state.settings.viewMode} for ${focusEntity.displayName}. Try another range or clear focus.`
                : `No known fixtures in this ${state.settings.viewMode} — try another range or refresh after schedules drop.`}
            </div>
          )}

          {state.entities.length > 0 && state.settings.viewMode === 'month' && (
            <MonthGrid
              year={state.viewYear}
              month={state.viewMonth}
              timezone={state.settings.timezone}
              dayMap={cal.dayMap}
              selectedDate={state.selectedDate}
              onSelectDate={state.setSelectedDate}
              onChangeMonth={(y, m) => {
                state.setViewYear(y)
                state.setViewMonth(m)
              }}
            />
          )}

          {state.entities.length > 0 && state.settings.viewMode === 'week' && (
            <WeekView
              weekStart={state.weekStart}
              timezone={state.settings.timezone}
              dayMap={cal.dayMap}
              selectedDate={state.selectedDate}
              onSelectDate={state.setSelectedDate}
              onChangeWeek={state.setWeekStart}
            />
          )}

          <footer className="footer muted tiny">
            Local-first · ESPN + Jolpica-F1 · {state.settings.timezone}
            {cal.dataUpdatedAt
              ? ` · updated ${new Date(cal.dataUpdatedAt).toLocaleString()}`
              : ''}
          </footer>
        </div>

        <DayPanel
          bundle={selectedBundle}
          timezone={state.settings.timezone}
          settings={state.settings}
          onClose={() => state.setSelectedDate(null)}
        />
      </main>

      {state.panel === 'picker' && (
        <div className="overlay" onClick={() => state.setPanel('none')}>
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <TeamPicker
              entities={state.entities}
              onAdd={state.addEntity}
              onRemove={state.removeEntity}
              onToggleFavorite={state.toggleFavorite}
              onClose={() => state.setPanel('none')}
            />
          </div>
        </div>
      )}

      {state.panel === 'settings' && (
        <div className="overlay" onClick={() => state.setPanel('none')}>
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <SettingsPanel
              settings={state.settings}
              onChange={state.updateSettings}
              onWeightChange={state.updateWeights}
              onResetWeights={state.resetWeights}
              onRefresh={() => void cal.refetch()}
              isRefreshing={cal.isFetching}
              lastRefreshed={cal.dataUpdatedAt}
              onClose={() => state.setPanel('none')}
            />
          </div>
        </div>
      )}
    </div>
  )
}
