import type { CalendarEvent, ConflictBlock, DayBundle } from '../types'
import { eventWindowEnd, rangesOverlap } from '../lib/time'

function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  const aProv = a.provisional ? 1 : 0
  const bProv = b.provisional ? 1 : 0
  if (aProv !== bProv) return aProv - bProv

  const as = a.watchability ?? 0
  const bs = b.watchability ?? 0
  if (bs !== as) return bs - as

  const aTier = a.rivalryTier === 1 ? 1 : 0
  const bTier = b.rivalryTier === 1 ? 1 : 0
  if (bTier !== aTier) return bTier - aTier

  const aStakes = a.stakesScore ?? 0
  const bStakes = b.stakesScore ?? 0
  if (bStakes !== aStakes) return bStakes - aStakes

  return new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime()
}

export function pickOfDay(events: CalendarEvent[]): CalendarEvent | undefined {
  if (events.length === 0) return undefined
  const sorted = [...events].sort(compareEvents)
  return sorted[0]
}

export function detectConflicts(events: CalendarEvent[]): ConflictBlock[] {
  if (events.length < 2) return []

  const withWindows = events.map((e) => ({
    event: e,
    start: e.startUtc,
    end: eventWindowEnd(e.startUtc, e.sport),
  }))

  const used = new Set<string>()
  const blocks: ConflictBlock[] = []

  for (let i = 0; i < withWindows.length; i++) {
    const a = withWindows[i]
    if (used.has(a.event.id)) continue
    const group = [a]
    for (let j = i + 1; j < withWindows.length; j++) {
      const b = withWindows[j]
      if (used.has(b.event.id)) continue
      const overlaps = group.some((g) =>
        rangesOverlap(g.start, g.end, b.start, b.end),
      )
      if (overlaps) group.push(b)
    }
    if (group.length < 2) continue
    for (const g of group) used.add(g.event.id)
    const groupEvents = group.map((g) => g.event).sort(compareEvents)
    const starts = group.map((g) => new Date(g.start).getTime())
    const ends = group.map((g) => new Date(g.end).getTime())
    blocks.push({
      startUtc: new Date(Math.min(...starts)).toISOString(),
      endUtc: new Date(Math.max(...ends)).toISOString(),
      events: groupEvents,
      recommended: groupEvents[0],
    })
  }

  return blocks.sort(
    (a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime(),
  )
}

export function buildDayBundle(
  date: string,
  events: CalendarEvent[],
  crowdedThreshold: number,
): DayBundle {
  const ranked = [...events].sort(compareEvents)
  const conflicts = detectConflicts(events)
  const hasOverlap = conflicts.length > 0
  const isCrowded = events.length >= crowdedThreshold || hasOverlap
  return {
    date,
    events,
    pickOfDay: pickOfDay(events),
    isCrowded,
    conflictBlocks: conflicts,
    ranked,
  }
}

export function groupByLocalDate(
  events: CalendarEvent[],
  crowdedThreshold: number,
): Map<string, DayBundle> {
  const map = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    const list = map.get(e.localDate) ?? []
    list.push(e)
    map.set(e.localDate, list)
  }
  const result = new Map<string, DayBundle>()
  for (const [date, list] of map) {
    result.set(date, buildDayBundle(date, list, crowdedThreshold))
  }
  return result
}

export function dedupeEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Map<string, CalendarEvent>()
  for (const e of events) {
    const key = e.id
    if (!seen.has(key)) seen.set(key, e)
  }
  return [...seen.values()]
}
