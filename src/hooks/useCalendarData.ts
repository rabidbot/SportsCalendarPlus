import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AppSettings, CalendarEvent, TrackedEntity } from '../types'
import {
  f1SeasonProgress,
  getAllSchedules,
  getStandingsForEntities,
} from '../adapters'
import { applyScores } from '../scoring/score'
import { dedupeEvents, groupByLocalDate } from '../calendar/grouping'

function eventMatchesEntity(event: CalendarEvent, entity: TrackedEntity): boolean {
  if (entity.sport === 'f1' || entity.sourceId === 'f1') {
    return event.sport === 'f1'
  }
  if (event.sport !== entity.sport) return false
  const sid = entity.sourceId
  return (
    event.home?.entitySourceId === sid ||
    event.away?.entitySourceId === sid
  )
}

export function useCalendarData(
  entities: TrackedEntity[],
  settings: AppSettings,
  favorites: Set<string>,
  filterEntityId: string | null = null,
) {
  const entityKey = entities.map((e) => e.id).sort().join(',')

  const schedulesQuery = useQuery({
    queryKey: ['schedules', entityKey, settings.timezone],
    queryFn: () => getAllSchedules(entities, settings.timezone),
    enabled: entities.length > 0,
    staleTime: 1000 * 60 * 60 * 3,
    gcTime: 1000 * 60 * 60 * 12,
  })

  const standingsQuery = useQuery({
    queryKey: ['standings', entityKey],
    queryFn: () => getStandingsForEntities(entities),
    enabled: entities.length > 0,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 48,
  })

  const scoredEvents = useMemo(() => {
    const raw = dedupeEvents(schedulesQuery.data ?? [])
    const standingsBySport = standingsQuery.data
    const f1Events = raw.filter((e) => e.sport === 'f1')
    const seasonProgressF1 = f1SeasonProgress(f1Events)

    return applyScores(raw, {
      standings: null,
      favorites,
      weights: settings.weights,
      mode: settings.mode,
      mustSeeThreshold: settings.mustSeeThreshold,
      seasonProgress: 0.55,
    }).map((event) => {
      const sportStandings = standingsBySport?.get(event.sport) ?? null
      const progress =
        event.sport === 'f1'
          ? seasonProgressF1
          : estimateSeasonProgress(event, raw)

      const [rescored] = applyScores([event], {
        standings: sportStandings,
        favorites,
        weights: settings.weights,
        mode: settings.mode,
        mustSeeThreshold: settings.mustSeeThreshold,
        seasonProgress: progress,
      })
      return rescored
    })
  }, [
    schedulesQuery.data,
    standingsQuery.data,
    favorites,
    settings.weights,
    settings.mode,
    settings.mustSeeThreshold,
  ])

  const filteredEvents = useMemo(() => {
    if (!filterEntityId) return scoredEvents
    const entity = entities.find((e) => e.id === filterEntityId)
    if (!entity) return scoredEvents
    return scoredEvents.filter((e) => eventMatchesEntity(e, entity))
  }, [scoredEvents, filterEntityId, entities])

  const dayMap = useMemo(
    () => groupByLocalDate(filteredEvents, settings.crowdedDayThreshold),
    [filteredEvents, settings.crowdedDayThreshold],
  )

  return {
    events: filteredEvents,
    allEvents: scoredEvents,
    dayMap,
    isLoading: schedulesQuery.isLoading || standingsQuery.isLoading,
    isFetching: schedulesQuery.isFetching || standingsQuery.isFetching,
    error: schedulesQuery.error ?? standingsQuery.error,
    dataUpdatedAt: Math.max(
      schedulesQuery.dataUpdatedAt,
      standingsQuery.dataUpdatedAt,
    ),
    refetch: async () => {
      await Promise.all([schedulesQuery.refetch(), standingsQuery.refetch()])
    },
  }
}

function estimateSeasonProgress(
  event: CalendarEvent,
  all: CalendarEvent[],
): number {
  const sportEvents = all.filter((e) => e.sport === event.sport)
  if (sportEvents.length === 0) return 0.5
  const times = sportEvents.map((e) => new Date(e.startUtc).getTime()).sort((a, b) => a - b)
  const start = times[0]
  const end = times[times.length - 1]
  if (end <= start) return 0.5
  const t = new Date(event.startUtc).getTime()
  return Math.min(1, Math.max(0, (t - start) / (end - start)))
}
