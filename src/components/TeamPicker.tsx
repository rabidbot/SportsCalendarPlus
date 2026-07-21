import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Sport, TeamOption, TrackedEntity } from '../types'
import { getTeamsForSport } from '../adapters'
import {
  F1_ENTITY_ID,
  MAX_TRACKED,
  SOCCER_LEAGUES,
  SPORT_LABELS,
  SPORTS,
} from '../lib/sports'

interface Props {
  entities: TrackedEntity[]
  onAdd: (entity: TrackedEntity) => void
  onRemove: (id: string) => void
  onToggleFavorite: (id: string) => void
  onClose: () => void
}

export function TeamPicker({
  entities,
  onAdd,
  onRemove,
  onToggleFavorite,
  onClose,
}: Props) {
  const [sport, setSport] = useState<Sport>('nfl')
  const [soccerLeague, setSoccerLeague] = useState(SOCCER_LEAGUES[0].slug)
  const [query, setQuery] = useState('')

  const teamsQuery = useQuery({
    queryKey: ['teams', sport, sport === 'soccer' ? soccerLeague : ''],
    queryFn: () =>
      getTeamsForSport(sport, sport === 'soccer' ? soccerLeague : undefined),
    staleTime: 1000 * 60 * 60 * 24,
  })

  const filtered = useMemo(() => {
    const list = teamsQuery.data ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (t) =>
        t.displayName.toLowerCase().includes(q) ||
        t.abbreviation?.toLowerCase().includes(q),
    )
  }, [teamsQuery.data, query])

  const trackedIds = useMemo(() => new Set(entities.map((e) => e.id)), [entities])
  const atCap = entities.length >= MAX_TRACKED

  function entityIdFor(team: TeamOption): string {
    if (team.sport === 'f1') return F1_ENTITY_ID
    if (team.sport === 'soccer') return `soccer-${team.soccerLeague}-${team.sourceId}`
    return `${team.sport}-${team.sourceId}`
  }

  function handleAdd(team: TeamOption) {
    if (atCap) return
    const id = entityIdFor(team)
    if (trackedIds.has(id)) return
    onAdd({
      id,
      sport: team.sport,
      sourceId: team.sourceId,
      soccerLeague: team.soccerLeague,
      displayName: team.displayName,
      abbreviation: team.abbreviation,
      logoUrl: team.logoUrl,
      isFavorite: true,
    })
  }

  return (
    <div className="drawer">
      <div className="drawer-header">
        <div>
          <h2>Your watchlist</h2>
          <p className="muted">
            {entities.length}/{MAX_TRACKED} slots
          </p>
        </div>
        <button type="button" className="btn ghost" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="tracked-list">
        {entities.length === 0 && (
          <p className="empty-inline">No teams yet — pick up to {MAX_TRACKED} below.</p>
        )}
        {entities.map((e) => (
          <div key={e.id} className="tracked-row">
            <div className="tracked-main">
              {e.logoUrl ? (
                <img src={e.logoUrl} alt="" className="team-logo" />
              ) : (
                <span className={`sport-dot sport-${e.sport}`} />
              )}
              <div>
                <div className="tracked-name">{e.displayName}</div>
                <div className="muted tiny">
                  {SPORT_LABELS[e.sport]}
                  {e.soccerLeague ? ` · ${e.soccerLeague}` : ''}
                </div>
              </div>
            </div>
            <div className="tracked-actions">
              <button
                type="button"
                className={`btn icon ${e.isFavorite ? 'active' : ''}`}
                title="Toggle favorite"
                onClick={() => onToggleFavorite(e.id)}
              >
                ★
              </button>
              <button
                type="button"
                className="btn icon danger"
                title="Remove"
                onClick={() => onRemove(e.id)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="picker-controls">
        <div className="sport-tabs">
          {SPORTS.map((s) => (
            <button
              key={s}
              type="button"
              className={`chip ${sport === s ? 'active' : ''}`}
              onClick={() => setSport(s)}
            >
              {SPORT_LABELS[s]}
            </button>
          ))}
        </div>

        {sport === 'soccer' && (
          <select
            className="select"
            value={soccerLeague}
            onChange={(e) => setSoccerLeague(e.target.value)}
          >
            {SOCCER_LEAGUES.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.label}
              </option>
            ))}
          </select>
        )}

        <input
          className="input"
          placeholder="Search teams…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="team-results">
        {teamsQuery.isLoading && <p className="muted">Loading teams…</p>}
        {teamsQuery.error && (
          <p className="error-text">Could not load teams. Try again later.</p>
        )}
        {filtered.map((team) => {
          const id = entityIdFor(team)
          const tracked = trackedIds.has(id)
          return (
            <button
              key={id}
              type="button"
              className="team-option"
              disabled={tracked || atCap}
              onClick={() => handleAdd(team)}
            >
              {team.logoUrl ? (
                <img src={team.logoUrl} alt="" className="team-logo" />
              ) : (
                <span className={`sport-dot sport-${team.sport}`} />
              )}
              <span className="team-option-name">{team.displayName}</span>
              <span className="muted tiny">
                {tracked ? 'Added' : atCap ? 'Full' : 'Add'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
