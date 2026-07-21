import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppSettings, ScoringWeights, TrackedEntity } from '../types'
import { MAX_TRACKED } from '../lib/sports'
import { startOfWeekSunday, todayLocalDate } from '../lib/time'
import {
  DEFAULT_SETTINGS,
  loadEntities,
  loadSettings,
  saveEntities,
  saveSettings,
} from './storage'

export function useAppState() {
  const [entities, setEntities] = useState<TrackedEntity[]>(() => loadEntities())
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1)
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeekSunday(todayLocalDate(loadSettings().timezone)),
  )
  const [panel, setPanel] = useState<'none' | 'picker' | 'settings'>('none')
  const [filterEntityId, setFilterEntityId] = useState<string | null>(null)

  useEffect(() => {
    saveEntities(entities)
  }, [entities])

  useEffect(() => {
    if (filterEntityId && !entities.some((e) => e.id === filterEntityId)) {
      setFilterEntityId(null)
    }
  }, [entities, filterEntityId])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const addEntity = useCallback((entity: TrackedEntity) => {
    setEntities((prev) => {
      if (prev.length >= MAX_TRACKED) return prev
      if (prev.some((e) => e.id === entity.id)) return prev
      return [...prev, entity]
    })
  }, [])

  const removeEntity = useCallback((id: string) => {
    setEntities((prev) => prev.filter((e) => e.id !== id))
    setFilterEntityId((prev) => (prev === id ? null : prev))
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    setEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isFavorite: !e.isFavorite } : e)),
    )
  }, [])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const updateWeights = useCallback((patch: Partial<ScoringWeights>) => {
    setSettings((prev) => ({
      ...prev,
      weights: { ...prev.weights, ...patch },
    }))
  }, [])

  const resetWeights = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      weights: { ...DEFAULT_SETTINGS.weights },
    }))
  }, [])

  const favorites = useMemo(() => {
    const set = new Set<string>()
    for (const e of entities) {
      if (e.isFavorite) {
        set.add(e.sourceId)
        if (e.sport === 'f1') set.add('f1')
      }
    }
    return set
  }, [entities])

  return {
    entities,
    settings,
    selectedDate,
    setSelectedDate,
    viewYear,
    viewMonth,
    setViewYear,
    setViewMonth,
    weekStart,
    setWeekStart,
    panel,
    setPanel,
    filterEntityId,
    setFilterEntityId,
    addEntity,
    removeEntity,
    toggleFavorite,
    updateSettings,
    updateWeights,
    resetWeights,
    favorites,
  }
}
