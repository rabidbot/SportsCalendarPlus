import type { Sport } from '../types'

export const SPORTS: Sport[] = ['nfl', 'nba', 'mlb', 'nhl', 'soccer', 'f1']

export const SPORT_LABELS: Record<Sport, string> = {
  nfl: 'NFL',
  nba: 'NBA',
  mlb: 'MLB',
  nhl: 'NHL',
  soccer: 'Soccer',
  f1: 'Formula 1',
}

export const SPORT_COLORS: Record<Sport, string> = {
  nfl: '#5b8c3e',
  nba: '#c45c26',
  mlb: '#2f6fed',
  nhl: '#6b7cff',
  soccer: '#0d9488',
  f1: '#e10600',
}

export interface EspnLeagueConfig {
  sportPath: string
  league: string
  label: string
}

export const ESPN_LEAGUES: Record<Exclude<Sport, 'f1' | 'soccer'>, EspnLeagueConfig> = {
  nfl: { sportPath: 'football', league: 'nfl', label: 'NFL' },
  nba: { sportPath: 'basketball', league: 'nba', label: 'NBA' },
  mlb: { sportPath: 'baseball', league: 'mlb', label: 'MLB' },
  nhl: { sportPath: 'hockey', league: 'nhl', label: 'NHL' },
}

export const SOCCER_LEAGUES: { slug: string; label: string }[] = [
  { slug: 'usa.1', label: 'MLS' },
  { slug: 'eng.1', label: 'Premier League' },
  { slug: 'esp.1', label: 'La Liga' },
  { slug: 'ger.1', label: 'Bundesliga' },
  { slug: 'ita.1', label: 'Serie A' },
  { slug: 'fra.1', label: 'Ligue 1' },
  { slug: 'uefa.champions', label: 'Champions League' },
]

export const MAX_TRACKED = 10

export const F1_ENTITY_ID = 'f1-calendar'
