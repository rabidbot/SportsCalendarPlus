import { useMemo } from 'react'
import { TeamPicker } from './components/TeamPicker'
import { MonthGrid } from './components/MonthGrid'
import { DayPanel } from './components/DayPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { useAppState } from './state/useAppState'
import { useCalendarData } from './hooks/useCalendarData'
import { SPORT_COLORS, SPORT_LABELS } from './lib/sports'
import type { Sport } from './types'
import './App.css'

export default function App() {
  const state = useAppState()
  const cal = useCalendarData(state.entities, state.settings, state.favorites)

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

  const monthEventCount = useMemo(() => {
    const prefix = `${state.viewYear}-${String(state.viewMonth).padStart(2, '0')}`
    return cal.events.filter((e) => e.localDate.startsWith(prefix)).length
  }, [cal.events, state.viewYear, state.viewMonth])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">W</div>
          <div>
            <h1>Watchlist</h1>
            <p className="muted">Multi-sport calendar · pick of the day</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="btn"
            onClick={() => state.setPanel(state.panel === 'picker' ? 'none' : 'picker')}
          >
            Teams ({state.entities.length}/10)
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

      <div className="legend">
        {(Object.keys(SPORT_LABELS) as Sport[]).map((s) => (
          <span key={s} className="legend-item">
            <i style={{ background: SPORT_COLORS[s] }} />
            {SPORT_LABELS[s]}
          </span>
        ))}
        <span className="legend-item">♛ Pick of day</span>
        <span className="legend-item">★ Must-see</span>
      </div>

      <main className="layout">
        <div className="main-col">
          {state.entities.length === 0 && (
            <div className="empty-state">
              <h2>Build your watchlist</h2>
              <p>
                Add up to 10 teams across NFL, NBA, MLB, NHL, soccer, and F1. We’ll
                merge their schedules and rank every game.
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
              <p>Loading schedules…</p>
            </div>
          )}

          {state.entities.length > 0 && cal.error && (
            <div className="empty-state error-box">
              <p>Couldn’t load some schedule data. Showing whatever we have.</p>
              <p className="muted tiny">{String(cal.error)}</p>
            </div>
          )}

          {state.entities.length > 0 && !cal.isLoading && monthEventCount === 0 && (
            <div className="banner">
              No known fixtures this month for your teams — try another month or
              refresh after schedules drop.
            </div>
          )}

          {state.entities.length > 0 && (
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

          <footer className="footer muted tiny">
            Local-first · data from ESPN unofficial API + Jolpica-F1 · times in{' '}
            {state.settings.timezone}
            {cal.dataUpdatedAt
              ? ` · updated ${new Date(cal.dataUpdatedAt).toLocaleString()}`
              : ''}
          </footer>
        </div>

        <DayPanel
          bundle={selectedBundle}
          timezone={state.settings.timezone}
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
