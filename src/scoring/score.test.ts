import { describe, expect, it } from 'vitest'
import { score } from './score'
import { DEFAULT_WEIGHTS, DEFAULT_MUST_SEE_THRESHOLD } from './weights'
import type { CalendarEvent, ScoreContext, StandingsMap } from '../types'

function baseEvent(over: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'e1',
    sport: 'soccer',
    startUtc: '2026-03-15T19:00:00Z',
    localDate: '2026-03-15',
    home: { entitySourceId: '83', name: 'Barcelona' },
    away: { entitySourceId: '86', name: 'Real Madrid' },
    title: 'Barcelona vs Real Madrid',
    broadcasts: ['ESPN'],
    status: 'scheduled',
    provisional: false,
    ...over,
  }
}

function ctx(over: Partial<ScoreContext> = {}): ScoreContext {
  return {
    standings: null,
    favorites: new Set(),
    weights: { ...DEFAULT_WEIGHTS },
    mode: 'neutral',
    mustSeeThreshold: DEFAULT_MUST_SEE_THRESHOLD,
    seasonProgress: 0.5,
    ...over,
  }
}

describe('score engine', () => {
  it('scores El Clásico higher than a random mid-table game', () => {
    const clasico = baseEvent()
    const midTable = baseEvent({
      id: 'e2',
      home: { entitySourceId: '1', name: 'Burnley' },
      away: { entitySourceId: '2', name: 'Brentford' },
      title: 'Burnley vs Brentford',
      broadcasts: [],
    })

    const c = ctx({ seasonProgress: 0.6 })
    const a = score(clasico, c)
    const b = score(midTable, c)

    expect(a.score).toBeGreaterThan(b.score)
    expect(a.mustSee).toBe(true)
    expect(a.reasons.some((r) => r.toLowerCase().includes('clásico') || r.toLowerCase().includes('clasico'))).toBe(
      true,
    )
  })

  it('scores 1st vs 2nd late-season higher than 1st vs last', () => {
    const standings: StandingsMap = {
      '1': {
        sourceId: '1',
        name: 'First',
        rank: 1,
        wins: 50,
        losses: 20,
        winPct: 0.714,
        gamesBack: 0,
        conference: 'East',
        division: 'A',
      },
      '2': {
        sourceId: '2',
        name: 'Second',
        rank: 2,
        wins: 48,
        losses: 22,
        winPct: 0.686,
        gamesBack: 2,
        conference: 'East',
        division: 'A',
      },
      '30': {
        sourceId: '30',
        name: 'Last',
        rank: 15,
        wins: 20,
        losses: 50,
        winPct: 0.286,
        gamesBack: 30,
        conference: 'East',
        division: 'B',
      },
    }

    const topClash = baseEvent({
      sport: 'nba',
      home: { entitySourceId: '1', name: 'First', rank: 1, winPct: 0.714 },
      away: { entitySourceId: '2', name: 'Second', rank: 2, winPct: 0.686 },
      title: 'First vs Second',
      broadcasts: ['TNT'],
    })
    const mismatch = baseEvent({
      id: 'e3',
      sport: 'nba',
      home: { entitySourceId: '1', name: 'First', rank: 1, winPct: 0.714 },
      away: { entitySourceId: '30', name: 'Last', rank: 15, winPct: 0.286 },
      title: 'First vs Last',
      broadcasts: [],
    })

    const c = ctx({ standings, seasonProgress: 0.9 })
    const a = score(topClash, c)
    const b = score(mismatch, c)
    expect(a.score).toBeGreaterThan(b.score)
  })

  it('applies favorite boost only in personal mode', () => {
    const event = baseEvent({
      sport: 'nfl',
      home: { entitySourceId: '9', name: 'Green Bay Packers' },
      away: { entitySourceId: '3', name: 'Chicago Bears' },
      title: 'Packers vs Bears',
    })
    const favorites = new Set(['9'])
    const personal = score(event, ctx({ mode: 'personal', favorites }))
    const neutral = score(event, ctx({ mode: 'neutral', favorites }))
    expect(personal.score).toBeGreaterThan(neutral.score)
  })

  it('flags tier-1 rivalry as must-see even below threshold', () => {
    const event = baseEvent({
      sport: 'nfl',
      home: { entitySourceId: '9', name: 'Green Bay Packers' },
      away: { entitySourceId: '3', name: 'Chicago Bears' },
      title: 'Packers vs Bears',
      broadcasts: [],
    })
    const result = score(
      event,
      ctx({
        mustSeeThreshold: 99,
        weights: {
          rivalry: 30,
          stakes: 0,
          quality: 0,
          marquee: 0,
          scarcity: 0,
          favorite: 0,
        },
      }),
    )
    expect(result.rivalryTier).toBe(1)
    expect(result.mustSee).toBe(true)
  })

  it('penalizes provisional fixtures', () => {
    const confirmed = baseEvent({ provisional: false })
    const provisional = baseEvent({ id: 'p', provisional: true, status: 'provisional' })
    const c = ctx()
    expect(score(confirmed, c).score).toBeGreaterThan(score(provisional, c).score)
  })

  it('gives classic F1 circuits a scarcity boost', () => {
    const monaco = baseEvent({
      sport: 'f1',
      home: undefined,
      away: undefined,
      title: 'Monaco Grand Prix',
      meta: { circuitId: 'monaco', round: 8 },
      broadcasts: [],
    })
    const generic = baseEvent({
      id: 'f2',
      sport: 'f1',
      home: undefined,
      away: undefined,
      title: 'Bahrain Grand Prix',
      meta: { circuitId: 'bahrain', round: 1 },
      broadcasts: [],
    })
    const c = ctx({ seasonProgress: 0.4 })
    expect(score(monaco, c).score).toBeGreaterThan(score(generic, c).score)
  })
})
