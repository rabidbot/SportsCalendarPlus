export type Sport = 'nfl' | 'nba' | 'mlb' | 'nhl' | 'soccer' | 'f1'

export type EventStatus = 'scheduled' | 'provisional' | 'in_progress' | 'final'

export type ScoringMode = 'personal' | 'neutral'

export type CalendarViewMode = 'month' | 'week'

export interface TrackedEntity {
  id: string
  sport: Sport
  sourceId: string
  soccerLeague?: string
  displayName: string
  abbreviation?: string
  logoUrl?: string
  isFavorite: boolean
}

export interface EventSide {
  entitySourceId: string
  name: string
  record?: string
  rank?: number
  winPct?: number
}

export interface CalendarEvent {
  id: string
  sport: Sport
  startUtc: string
  localDate: string
  home?: EventSide
  away?: EventSide
  title: string
  venue?: string
  broadcasts: string[]
  status: EventStatus
  provisional: boolean
  meta?: {
    circuitId?: string
    round?: number
    sessionTimes?: Record<string, string>
    seasonPhase?: 'regular' | 'playoffs' | 'finals'
    prestige?: boolean
  }
  watchability?: number
  mustSee?: boolean
  reasons?: string[]
  headline?: string
  breakdown?: ScoreBreakdown
  rivalryTier?: 0 | 1 | 2
  stakesScore?: number
}

export interface ScoreBreakdown {
  rivalry: number
  stakes: number
  quality: number
  marquee: number
  scarcity: number
  favorite: number
}

export interface ScoringWeights {
  rivalry: number
  stakes: number
  quality: number
  marquee: number
  scarcity: number
  favorite: number
}

export interface NotificationSettings {
  enabled: boolean
  mustSee: boolean
  favorites: boolean
  pickOfDay: boolean
  minutesBefore: number
}

export interface AppSettings {
  timezone: string
  weights: ScoringWeights
  mode: ScoringMode
  crowdedDayThreshold: number
  mustSeeThreshold: number
  viewMode: CalendarViewMode
  notifications: NotificationSettings
}

export interface StandingEntry {
  sourceId: string
  name: string
  rank: number
  wins: number
  losses: number
  ties?: number
  winPct: number
  gamesBack?: number
  conference?: string
  division?: string
  points?: number
}

export interface StandingsMap {
  [sourceId: string]: StandingEntry
}

export interface TeamOption {
  sourceId: string
  sport: Sport
  soccerLeague?: string
  displayName: string
  abbreviation?: string
  logoUrl?: string
}

export interface DayBundle {
  date: string
  events: CalendarEvent[]
  pickOfDay?: CalendarEvent
  runnerUp?: CalendarEvent
  pickRationale?: string[]
  isCrowded: boolean
  conflictBlocks: ConflictBlock[]
  ranked: CalendarEvent[]
}

export interface ConflictBlock {
  startUtc: string
  endUtc: string
  events: CalendarEvent[]
  recommended: CalendarEvent
}

export interface ScoreResult {
  score: number
  reasons: string[]
  headline: string
  breakdown: ScoreBreakdown
  mustSee: boolean
  rivalryTier: 0 | 1 | 2
  stakesScore: number
}

export interface ScoreContext {
  standings: StandingsMap | null
  favorites: Set<string>
  weights: ScoringWeights
  mode: ScoringMode
  mustSeeThreshold: number
  seasonProgress: number
  totalRounds?: number
  currentRound?: number
}
