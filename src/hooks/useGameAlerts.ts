import { useEffect, useRef } from 'react'
import type { AppSettings, CalendarEvent, DayBundle } from '../types'
import { formatLocalTime } from '../lib/time'
import { SPORT_LABELS } from '../lib/sports'

const FIRED_KEY = 'watchlist.alerts.fired'

function loadFired(): Set<string> {
  try {
    const raw = localStorage.getItem(FIRED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function saveFired(set: Set<string>) {
  const arr = [...set].slice(-200)
  localStorage.setItem(FIRED_KEY, JSON.stringify(arr))
}

function shouldAlert(
  event: CalendarEvent,
  settings: AppSettings,
  dayMap: Map<string, DayBundle>,
): boolean {
  const n = settings.notifications
  if (!n.enabled) return false
  if (event.status === 'final') return false
  if (n.mustSee && event.mustSee) return true
  if (n.favorites && (event.breakdown?.favorite ?? 0) > 0) return true
  if (n.pickOfDay && dayMap.get(event.localDate)?.pickOfDay?.id === event.id) return true
  return false
}

async function ensurePermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

function fireNotification(event: CalendarEvent, timezone: string, minutesBefore: number) {
  const title = event.mustSee ? `Must-see · ${event.title}` : event.title
  const body = [
    `Starts in ~${minutesBefore} min (${formatLocalTime(event.startUtc, timezone)} ${timezone.split('/').pop()})`,
    event.headline,
    `${SPORT_LABELS[event.sport]} · score ${event.watchability ?? '—'}`,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    new Notification(title, {
      body,
      tag: event.id,
      silent: false,
    })
  } catch {
    // ignore
  }
}

/**
 * Schedules browser notifications for upcoming games while the app is open.
 * True background push would need a service worker + push server; this covers
 * the local-first case with the Notification API.
 */
export function useGameAlerts(
  events: CalendarEvent[],
  dayMap: Map<string, DayBundle>,
  settings: AppSettings,
) {
  const timers = useRef<number[]>([])

  useEffect(() => {
    for (const t of timers.current) window.clearTimeout(t)
    timers.current = []

    const n = settings.notifications
    if (!n.enabled || typeof Notification === 'undefined') return

    let cancelled = false
    const fired = loadFired()
    const leadMs = Math.max(1, n.minutesBefore) * 60 * 1000
    const now = Date.now()

    void (async () => {
      const ok = await ensurePermission()
      if (!ok || cancelled) return

      for (const event of events) {
        if (!shouldAlert(event, settings, dayMap)) continue
        const start = new Date(event.startUtc).getTime()
        const fireAt = start - leadMs
        const key = `${event.id}@${n.minutesBefore}`
        if (fired.has(key)) continue
        if (start < now) continue

        // If we're already inside the alert window, fire soon.
        const delay = Math.max(fireAt - now, fireAt <= now && start > now ? 1500 : fireAt - now)
        if (delay > 1000 * 60 * 60 * 36) continue // only schedule next 36h
        if (delay < 0) continue

        const handle = window.setTimeout(() => {
          const latest = loadFired()
          if (latest.has(key)) return
          fireNotification(event, settings.timezone, n.minutesBefore)
          latest.add(key)
          saveFired(latest)
        }, delay)
        timers.current.push(handle)
      }
    })()

    return () => {
      cancelled = true
      for (const t of timers.current) window.clearTimeout(t)
      timers.current = []
    }
  }, [events, dayMap, settings])
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}
