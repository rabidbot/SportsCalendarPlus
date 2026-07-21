import { formatInTimeZone, toZonedTime } from 'date-fns-tz'
import { addHours, parseISO } from 'date-fns'

export const DEFAULT_TIMEZONE = 'America/Chicago'

export function toLocalDate(isoUtc: string, timezone: string): string {
  return formatInTimeZone(parseISO(isoUtc), timezone, 'yyyy-MM-dd')
}

export function formatLocalTime(isoUtc: string, timezone: string): string {
  return formatInTimeZone(parseISO(isoUtc), timezone, 'h:mm a')
}

export function formatLocalDateLabel(isoDate: string, timezone: string): string {
  const d = parseISO(`${isoDate}T12:00:00Z`)
  return formatInTimeZone(d, timezone, 'EEEE, MMM d')
}

export function formatMonthYear(year: number, month: number, timezone: string): string {
  const d = new Date(Date.UTC(year, month - 1, 15, 12, 0, 0))
  return formatInTimeZone(d, timezone, 'MMMM yyyy')
}

export function eventWindowEnd(startUtc: string, sport: string): string {
  const hours =
    sport === 'mlb' ? 3.5 : sport === 'f1' ? 2.5 : sport === 'soccer' ? 2.25 : 3
  return addHours(parseISO(startUtc), hours).toISOString()
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const as = parseISO(aStart).getTime()
  const ae = parseISO(aEnd).getTime()
  const bs = parseISO(bStart).getTime()
  const be = parseISO(bEnd).getTime()
  return as < be && bs < ae
}

export function nowInTz(timezone: string): Date {
  return toZonedTime(new Date(), timezone)
}

export function getMonthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1))
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const startPad = first.getUTCDay()
  const cells: (string | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    cells.push(`${year}-${mm}-${dd}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }
}

/** Local calendar date YYYY-MM-DD in the given timezone. */
export function todayLocalDate(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd')
}

/** Sunday-start week containing the given local date. */
export function startOfWeekSunday(localDate: string): string {
  const [y, m, d] = localDate.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const dow = utc.getUTCDay()
  utc.setUTCDate(utc.getUTCDate() - dow)
  const yy = utc.getUTCFullYear()
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(utc.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function addDaysToLocalDate(localDate: string, days: number): string {
  const [y, m, d] = localDate.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  utc.setUTCDate(utc.getUTCDate() + days)
  const yy = utc.getUTCFullYear()
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(utc.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysToLocalDate(weekStart, i))
}

export function formatWeekRange(weekStart: string, timezone: string): string {
  const end = addDaysToLocalDate(weekStart, 6)
  const a = formatInTimeZone(parseISO(`${weekStart}T12:00:00Z`), timezone, 'MMM d')
  const b = formatInTimeZone(parseISO(`${end}T12:00:00Z`), timezone, 'MMM d, yyyy')
  return `${a} – ${b}`
}

export function formatShortDate(localDate: string, timezone: string): string {
  return formatInTimeZone(parseISO(`${localDate}T12:00:00Z`), timezone, 'EEE M/d')
}
