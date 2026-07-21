import type { CalendarEvent, StandingsMap, TrackedEntity } from '../types'
import { toLocalDate } from '../lib/time'

function jolpicaUrl(path: string): string {
  if (import.meta.env.DEV) {
    return `/api/jolpica/ergast/f1${path}`
  }
  return `https://api.jolpi.ca/ergast/f1${path}`
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Jolpica request failed (${res.status}): ${url}`)
  return res.json() as Promise<T>
}

interface JolpicaRace {
  season: string
  round: string
  raceName: string
  date: string
  time?: string
  Circuit: {
    circuitId: string
    circuitName: string
    Location?: { locality?: string; country?: string }
  }
  FirstPractice?: { date: string; time?: string }
  SecondPractice?: { date: string; time?: string }
  ThirdPractice?: { date: string; time?: string }
  Qualifying?: { date: string; time?: string }
  Sprint?: { date: string; time?: string }
  SprintQualifying?: { date: string; time?: string }
}

interface JolpicaRacesResponse {
  MRData: {
    RaceTable: {
      Races: JolpicaRace[]
    }
  }
}

interface JolpicaStandingsResponse {
  MRData: {
    StandingsTable: {
      StandingsLists: {
        DriverStandings?: {
          position: string
          points: string
          Driver: { driverId: string; givenName: string; familyName: string }
        }[]
        ConstructorStandings?: {
          position: string
          points: string
          Constructor: { constructorId: string; name: string }
        }[]
      }[]
    }
  }
}

function toIso(date: string, time?: string): string {
  if (time) {
    const t = time.endsWith('Z') ? time : `${time}Z`
    return new Date(`${date}T${t}`).toISOString()
  }
  return new Date(`${date}T14:00:00Z`).toISOString()
}

export function normalizeF1Race(race: JolpicaRace, timezone: string): CalendarEvent {
  const startUtc = toIso(race.date, race.time)
  const sessionTimes: Record<string, string> = {}
  if (race.FirstPractice)
    sessionTimes.fp1 = toIso(race.FirstPractice.date, race.FirstPractice.time)
  if (race.SecondPractice)
    sessionTimes.fp2 = toIso(race.SecondPractice.date, race.SecondPractice.time)
  if (race.ThirdPractice)
    sessionTimes.fp3 = toIso(race.ThirdPractice.date, race.ThirdPractice.time)
  if (race.Qualifying)
    sessionTimes.qualifying = toIso(race.Qualifying.date, race.Qualifying.time)
  if (race.Sprint) sessionTimes.sprint = toIso(race.Sprint.date, race.Sprint.time)
  if (race.SprintQualifying)
    sessionTimes.sprintQualifying = toIso(
      race.SprintQualifying.date,
      race.SprintQualifying.time,
    )

  const venue = [
    race.Circuit.circuitName,
    race.Circuit.Location?.locality,
    race.Circuit.Location?.country,
  ]
    .filter(Boolean)
    .join(', ')

  return {
    id: `f1-${race.season}-r${race.round}`,
    sport: 'f1',
    startUtc,
    localDate: toLocalDate(startUtc, timezone),
    title: race.raceName,
    venue,
    broadcasts: [],
    status: 'scheduled',
    provisional: !race.time,
    meta: {
      circuitId: race.Circuit.circuitId,
      round: Number(race.round),
      sessionTimes,
      prestige: true,
    },
  }
}

export async function fetchF1Calendar(
  year: number,
  timezone: string,
): Promise<CalendarEvent[]> {
  const data = await fetchJson<JolpicaRacesResponse>(
    jolpicaUrl(`/${year}/races/?format=json`),
  )
  const races = data.MRData?.RaceTable?.Races ?? []
  return races.map((r) => normalizeF1Race(r, timezone))
}

export async function fetchF1Schedule(
  _entity: TrackedEntity,
  timezone: string,
): Promise<CalendarEvent[]> {
  const year = new Date().getUTCFullYear()
  try {
    const current = await fetchF1Calendar(year, timezone)
    if (current.length > 0) return current
  } catch {
    // fall through to previous year
  }
  try {
    return await fetchF1Calendar(year - 1, timezone)
  } catch {
    return []
  }
}

export async function fetchF1DriverStandings(year?: number): Promise<StandingsMap> {
  const y = year ?? new Date().getUTCFullYear()
  try {
    const data = await fetchJson<JolpicaStandingsResponse>(
      jolpicaUrl(`/${y}/driverStandings/?format=json`),
    )
    const list =
      data.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? []
    const map: StandingsMap = {}
    for (const d of list) {
      const id = d.Driver.driverId
      map[id] = {
        sourceId: id,
        name: `${d.Driver.givenName} ${d.Driver.familyName}`,
        rank: Number(d.position),
        wins: 0,
        losses: 0,
        winPct: 0,
        points: Number(d.points),
      }
    }
    return map
  } catch {
    return {}
  }
}

export function f1SeasonProgress(events: CalendarEvent[]): number {
  if (events.length === 0) return 0.5
  const now = Date.now()
  const completed = events.filter((e) => new Date(e.startUtc).getTime() < now).length
  return completed / events.length
}
