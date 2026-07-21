import type {
  CalendarEvent,
  Sport,
  StandingsMap,
  TeamOption,
  TrackedEntity,
} from '../types'
import { fetchEspnSchedule, fetchEspnStandings, fetchEspnTeams } from './espn'
import { fetchF1DriverStandings, fetchF1Schedule, f1SeasonProgress } from './jolpica'
import { F1_ENTITY_ID } from '../lib/sports'

export async function getTeamsForSport(
  sport: Sport,
  soccerLeague?: string,
): Promise<TeamOption[]> {
  if (sport === 'f1') {
    return [
      {
        sourceId: 'f1',
        sport: 'f1',
        displayName: 'Formula 1 — race weekends',
        abbreviation: 'F1',
      },
    ]
  }
  return fetchEspnTeams(sport, soccerLeague)
}

export async function getScheduleFor(
  entity: TrackedEntity,
  timezone: string,
): Promise<CalendarEvent[]> {
  if (entity.sport === 'f1' || entity.sourceId === 'f1') {
    return fetchF1Schedule(entity, timezone)
  }
  return fetchEspnSchedule(entity, timezone)
}

export async function getStandings(
  sport: Sport,
  soccerLeague?: string,
): Promise<StandingsMap> {
  if (sport === 'f1') return fetchF1DriverStandings()
  return fetchEspnStandings(sport, soccerLeague)
}

export async function getAllSchedules(
  entities: TrackedEntity[],
  timezone: string,
): Promise<CalendarEvent[]> {
  const results = await Promise.allSettled(
    entities.map((e) => getScheduleFor(e, timezone)),
  )
  const events: CalendarEvent[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') events.push(...r.value)
  }
  return events
}

export async function getStandingsForEntities(
  entities: TrackedEntity[],
): Promise<Map<Sport, StandingsMap>> {
  const sports = new Map<string, { sport: Sport; soccerLeague?: string }>()
  for (const e of entities) {
    const key = e.sport === 'soccer' ? `soccer:${e.soccerLeague ?? 'usa.1'}` : e.sport
    if (!sports.has(key)) {
      sports.set(key, { sport: e.sport, soccerLeague: e.soccerLeague })
    }
  }

  const map = new Map<Sport, StandingsMap>()
  await Promise.all(
    [...sports.values()].map(async ({ sport, soccerLeague }) => {
      try {
        const standings = await getStandings(sport, soccerLeague)
        if (sport === 'soccer') {
          const existing = map.get('soccer') ?? {}
          map.set('soccer', { ...existing, ...standings })
        } else {
          map.set(sport, standings)
        }
      } catch {
        map.set(sport, {})
      }
    }),
  )
  return map
}

export { f1SeasonProgress, F1_ENTITY_ID }
