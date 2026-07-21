import type { AppSettings, TrackedEntity } from '../types'
import { DEFAULT_WEIGHTS, DEFAULT_MUST_SEE_THRESHOLD, DEFAULT_CROWDED_THRESHOLD } from '../scoring/weights'
import { DEFAULT_TIMEZONE } from '../lib/time'

const ENTITIES_KEY = 'watchlist.entities'
const SETTINGS_KEY = 'watchlist.settings'

export const DEFAULT_SETTINGS: AppSettings = {
  timezone: DEFAULT_TIMEZONE,
  weights: { ...DEFAULT_WEIGHTS },
  mode: 'personal',
  crowdedDayThreshold: DEFAULT_CROWDED_THRESHOLD,
  mustSeeThreshold: DEFAULT_MUST_SEE_THRESHOLD,
  viewMode: 'month',
  notifications: {
    enabled: false,
    mustSee: true,
    favorites: true,
    pickOfDay: true,
    minutesBefore: 30,
  },
}

export function loadEntities(): TrackedEntity[] {
  try {
    const raw = localStorage.getItem(ENTITIES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TrackedEntity[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveEntities(entities: TrackedEntity[]): void {
  localStorage.setItem(ENTITIES_KEY, JSON.stringify(entities))
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS, weights: { ...DEFAULT_WEIGHTS } }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      weights: { ...DEFAULT_WEIGHTS, ...parsed.weights },
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        ...parsed.notifications,
      },
    }
  } catch {
    return { ...DEFAULT_SETTINGS, weights: { ...DEFAULT_WEIGHTS } }
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
