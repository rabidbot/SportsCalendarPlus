import type {
  CalendarEvent,
  EventSide,
  EventStatus,
  Sport,
  StandingEntry,
  StandingsMap,
  TeamOption,
  TrackedEntity,
} from '../types'
import { ESPN_LEAGUES, SOCCER_LEAGUES } from '../lib/sports'
import { toLocalDate } from '../lib/time'
import nflTeamsMock from './mock/nfl-teams.json'
import nflScheduleMock from './mock/nfl-schedule-gb.json'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

function espnBase(path: string): string {
  if (import.meta.env.DEV) {
    return `/api/espn/apis/site/v2/sports${path}`
  }
  return `https://site.api.espn.com/apis/site/v2/sports${path}`
}

function espnV2Base(path: string): string {
  if (import.meta.env.DEV) {
    return `/api/espn-v2/apis/v2/sports${path}`
  }
  return `https://site.api.espn.com/apis/v2/sports${path}`
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`ESPN request failed (${res.status}): ${url}`)
  return res.json() as Promise<T>
}

interface EspnTeamRaw {
  id: string
  displayName: string
  abbreviation?: string
  logos?: { href: string }[]
}

interface EspnTeamsResponse {
  sports?: { leagues?: { teams?: { team: EspnTeamRaw }[] }[] }[]
}

interface EspnCompetitor {
  homeAway?: string
  team?: { id?: string; displayName?: string; abbreviation?: string; name?: string }
  records?: { type?: string; summary?: string }[]
}

interface EspnEvent {
  id?: string
  date?: string
  name?: string
  shortName?: string
  competitions?: {
    competitors?: EspnCompetitor[]
    broadcasts?: { names?: string[] }[]
    venue?: { fullName?: string }
    status?: { type?: { name?: string; state?: string; completed?: boolean } }
    notes?: { headline?: string }[]
  }[]
  status?: { type?: { name?: string; state?: string; completed?: boolean } }
  season?: { slug?: string; type?: number }
}

interface EspnScheduleResponse {
  events?: EspnEvent[]
}

interface EspnStandingEntry {
  team?: { id?: string; displayName?: string }
  stats?: { name?: string; value?: number; displayValue?: string }[]
}

interface EspnStandingsResponse {
  children?: {
    name?: string
    abbreviation?: string
    children?: {
      name?: string
      abbreviation?: string
      standings?: { entries?: EspnStandingEntry[] }
    }[]
    standings?: { entries?: EspnStandingEntry[] }
  }[]
  standings?: { entries?: EspnStandingEntry[] }
}

function leaguePath(sport: Exclude<Sport, 'f1'>, soccerLeague?: string): string {
  if (sport === 'soccer') {
    const league = soccerLeague ?? 'usa.1'
    return `/soccer/${league}`
  }
  const cfg = ESPN_LEAGUES[sport]
  return `/${cfg.sportPath}/${cfg.league}`
}

function mapStatus(raw?: {
  type?: { name?: string; state?: string; completed?: boolean }
}): EventStatus {
  const name = raw?.type?.name ?? ''
  const state = raw?.type?.state ?? ''
  if (raw?.type?.completed || name.includes('FINAL') || state === 'post') return 'final'
  if (state === 'in' || name.includes('IN_PROGRESS') || name.includes('HALFTIME'))
    return 'in_progress'
  if (name.includes('POSTPONED') || name.includes('DELAYED') || name.includes('TBD'))
    return 'provisional'
  return 'scheduled'
}

function sideFromCompetitor(c: EspnCompetitor): EventSide {
  const record = c.records?.find((r) => r.type === 'total')?.summary
  return {
    entitySourceId: c.team?.id ?? 'unknown',
    name: c.team?.displayName ?? c.team?.name ?? 'TBD',
    record,
  }
}

function isTbdName(name?: string): boolean {
  if (!name) return true
  const n = name.toLowerCase()
  return n === 'tbd' || n.includes('tbd') || n === 'tba' || n.includes('to be determined')
}

export function normalizeEspnEvent(
  event: EspnEvent,
  sport: Sport,
  timezone: string,
): CalendarEvent | null {
  if (!event.date || !event.id) return null
  const comp = event.competitions?.[0]
  const competitors = comp?.competitors ?? []
  const homeRaw = competitors.find((c) => c.homeAway === 'home')
  const awayRaw = competitors.find((c) => c.homeAway === 'away')
  const home = homeRaw ? sideFromCompetitor(homeRaw) : undefined
  const away = awayRaw ? sideFromCompetitor(awayRaw) : undefined

  const broadcasts =
    comp?.broadcasts?.flatMap((b) => b.names ?? []).filter(Boolean) ?? []

  const status = mapStatus(comp?.status ?? event.status)
  const provisional =
    status === 'provisional' ||
    isTbdName(home?.name) ||
    isTbdName(away?.name) ||
    !event.date.includes('T')

  const title =
    home && away
      ? `${away.name} @ ${home.name}`
      : (event.name ?? event.shortName ?? 'TBD')

  let seasonPhase: 'regular' | 'playoffs' | 'finals' | undefined
  const seasonSlug = event.season?.slug?.toLowerCase() ?? ''
  if (seasonSlug.includes('final') || seasonSlug.includes('world-series')) {
    seasonPhase = 'finals'
  } else if (
    seasonSlug.includes('post') ||
    seasonSlug.includes('playoff') ||
    seasonSlug.includes('conference')
  ) {
    seasonPhase = 'playoffs'
  }

  return {
    id: `espn-${sport}-${event.id}`,
    sport,
    startUtc: event.date.endsWith('Z') || event.date.includes('+')
      ? new Date(event.date).toISOString()
      : new Date(event.date + 'Z').toISOString(),
    localDate: toLocalDate(
      event.date.endsWith('Z') || event.date.includes('+')
        ? new Date(event.date).toISOString()
        : new Date(event.date + 'Z').toISOString(),
      timezone,
    ),
    home,
    away,
    title,
    venue: comp?.venue?.fullName,
    broadcasts,
    status: provisional ? 'provisional' : status,
    provisional,
    meta: seasonPhase ? { seasonPhase } : undefined,
  }
}

export async function fetchEspnTeams(
  sport: Exclude<Sport, 'f1'>,
  soccerLeague?: string,
): Promise<TeamOption[]> {
  if (USE_MOCK && sport === 'nfl') {
    return parseTeamsPayload(nflTeamsMock as EspnTeamsResponse, 'nfl')
  }

  if (sport === 'soccer' && !soccerLeague) {
    const all: TeamOption[] = []
    for (const league of SOCCER_LEAGUES) {
      try {
        const teams = await fetchEspnTeams('soccer', league.slug)
        all.push(...teams)
      } catch {
        // skip failed league
      }
    }
    return all
  }

  const path = leaguePath(sport, soccerLeague)
  const data = await fetchJson<EspnTeamsResponse>(`${espnBase(path)}/teams?limit=400`)
  return parseTeamsPayload(data, sport, soccerLeague)
}

function parseTeamsPayload(
  data: EspnTeamsResponse,
  sport: Sport,
  soccerLeague?: string,
): TeamOption[] {
  const teams = data.sports?.[0]?.leagues?.[0]?.teams ?? []
  return teams
    .map(({ team }) => ({
      sourceId: team.id,
      sport,
      soccerLeague,
      displayName: team.displayName,
      abbreviation: team.abbreviation,
      logoUrl: team.logos?.[0]?.href,
    }))
    .filter((t) => t.sourceId && t.displayName)
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}

function normalizeList(
  events: EspnEvent[],
  sport: Sport,
  timezone: string,
): CalendarEvent[] {
  return events
    .map((e) => normalizeEspnEvent(e, sport, timezone))
    .filter((e): e is CalendarEvent => e != null)
}

function dedupeById(events: CalendarEvent[]): CalendarEvent[] {
  const map = new Map<string, CalendarEvent>()
  for (const e of events) map.set(e.id, e)
  return [...map.values()]
}

/**
 * Soccer seasons span calendar years. ESPN's default schedule often points at
 * the next empty season. `fixture=true` returns the upcoming slate; season=
 * pulls completed matchdays. Scoreboard is a last-resort fill for near dates.
 */
async function fetchSoccerSchedule(
  entity: TrackedEntity,
  timezone: string,
): Promise<CalendarEvent[]> {
  const league = entity.soccerLeague ?? 'usa.1'
  const path = leaguePath('soccer', league)
  const base = `${espnBase(path)}/teams/${entity.sourceId}/schedule`
  const year = new Date().getUTCFullYear()
  const collected: CalendarEvent[] = []

  const tryUrls = [
    `${base}?fixture=true`,
    `${base}?season=${year}`,
    `${base}?season=${year - 1}`,
    base,
  ]

  for (const url of tryUrls) {
    try {
      const data = await fetchJson<EspnScheduleResponse>(url)
      collected.push(...normalizeList(data.events ?? [], 'soccer', timezone))
    } catch {
      // try next
    }
  }

  // If still thin on upcoming games, pull league scoreboard windows and filter.
  const upcoming = collected.filter(
    (e) => new Date(e.startUtc).getTime() >= Date.now() - 86400000,
  )
  if (upcoming.length < 3) {
    try {
      const board = await fetchSoccerScoreboardForTeam(
        league,
        entity.sourceId,
        timezone,
      )
      collected.push(...board)
    } catch {
      // ignore
    }
  }

  return dedupeById(collected)
}

function yyyymmdd(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

async function fetchSoccerScoreboardForTeam(
  league: string,
  teamSourceId: string,
  timezone: string,
): Promise<CalendarEvent[]> {
  const path = leaguePath('soccer', league)
  const now = new Date()
  const windows: string[] = []
  // ESPN accepts YYYYMMDD or YYYYMMDD-YYYYMMDD; chunk by ~45 days.
  for (let i = -15; i <= 120; i += 40) {
    const start = new Date(now)
    start.setUTCDate(start.getUTCDate() + i)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 39)
    windows.push(`${yyyymmdd(start)}-${yyyymmdd(end)}`)
  }

  const out: CalendarEvent[] = []
  for (const range of windows) {
    try {
      const url = `${espnBase(path)}/scoreboard?dates=${range}&limit=200`
      const data = await fetchJson<EspnScheduleResponse>(url)
      for (const event of data.events ?? []) {
        const comps = event.competitions?.[0]?.competitors ?? []
        const involves = comps.some((c) => c.team?.id === teamSourceId)
        if (!involves) continue
        const normalized = normalizeEspnEvent(event, 'soccer', timezone)
        if (normalized) out.push(normalized)
      }
    } catch {
      // skip window
    }
  }
  return out
}

export async function fetchEspnSchedule(
  entity: TrackedEntity,
  timezone: string,
): Promise<CalendarEvent[]> {
  if (entity.sport === 'f1') return []

  if (USE_MOCK && entity.sport === 'nfl' && entity.sourceId === '9') {
    const events = (nflScheduleMock as EspnScheduleResponse).events ?? []
    return normalizeList(events, 'nfl', timezone)
  }

  if (entity.sport === 'soccer') {
    return fetchSoccerSchedule(entity, timezone)
  }

  const path = leaguePath(entity.sport, entity.soccerLeague)
  const url = `${espnBase(path)}/teams/${entity.sourceId}/schedule`
  const data = await fetchJson<EspnScheduleResponse>(url)
  return normalizeList(data.events ?? [], entity.sport, timezone)
}

function extractEntries(
  data: EspnStandingsResponse,
): { entry: EspnStandingEntry; conference?: string; division?: string }[] {
  const result: { entry: EspnStandingEntry; conference?: string; division?: string }[] = []

  const walk = (
    nodes: EspnStandingsResponse['children'],
    conference?: string,
    division?: string,
  ) => {
    if (!nodes) return
    for (const node of nodes) {
      const conf = conference ?? node.name
      const div = node.children ? division : (node.name ?? division)
      const entries = node.standings?.entries
      if (entries) {
        for (const entry of entries) {
          result.push({ entry, conference: conf, division: div })
        }
      }
      if (node.children) walk(node.children, conf, node.name)
    }
  }

  if (data.standings?.entries) {
    for (const entry of data.standings.entries) {
      result.push({ entry })
    }
  }
  walk(data.children)
  return result
}

function statValue(
  stats: { name?: string; value?: number; displayValue?: string }[] | undefined,
  name: string,
): number | undefined {
  const s = stats?.find((x) => x.name === name)
  if (!s) return undefined
  if (typeof s.value === 'number') return s.value
  if (s.displayValue != null) {
    const n = Number(s.displayValue)
    return Number.isNaN(n) ? undefined : n
  }
  return undefined
}

export async function fetchEspnStandings(
  sport: Exclude<Sport, 'f1'>,
  soccerLeague?: string,
): Promise<StandingsMap> {
  if (USE_MOCK) return {}

  const path = leaguePath(sport, soccerLeague)
  let data: EspnStandingsResponse

  try {
    if (sport === 'nhl') {
      data = await fetchJson<EspnStandingsResponse>(
        `${espnV2Base('/hockey/nhl/standings')}`,
      )
    } else {
      data = await fetchJson<EspnStandingsResponse>(`${espnBase(path)}/standings`)
    }
  } catch {
    return {}
  }

  const map: StandingsMap = {}
  const extracted = extractEntries(data)
  let rankCounter = 0
  for (const { entry, conference, division } of extracted) {
    const id = entry.team?.id
    if (!id) continue
    rankCounter += 1
    const wins = statValue(entry.stats, 'wins') ?? 0
    const losses = statValue(entry.stats, 'losses') ?? 0
    const ties = statValue(entry.stats, 'ties') ?? statValue(entry.stats, 'otLosses') ?? 0
    let winPct = statValue(entry.stats, 'winPercent') ?? statValue(entry.stats, 'avgPoints')
    if (winPct == null) {
      const total = wins + losses + ties
      winPct = total > 0 ? (wins + ties * 0.5) / total : 0
    }
    if (winPct > 1) winPct = winPct / 100

    const rank =
      statValue(entry.stats, 'playoffSeed') ??
      statValue(entry.stats, 'rank') ??
      rankCounter

    const se: StandingEntry = {
      sourceId: id,
      name: entry.team?.displayName ?? id,
      rank,
      wins,
      losses,
      ties,
      winPct,
      gamesBack: statValue(entry.stats, 'gamesBehind') ?? statValue(entry.stats, 'gamesBehind'),
      conference,
      division,
      points: statValue(entry.stats, 'points'),
    }
    map[id] = se
  }
  return map
}
