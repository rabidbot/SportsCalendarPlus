import type { CalendarEvent, ScoreContext, ScoreResult } from '../types'
import { findRivalry } from './rivalries'
import { isClassicCircuit } from './classicCircuits'

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function parseWinPct(side?: { winPct?: number; record?: string }): number | null {
  if (side?.winPct != null && !Number.isNaN(side.winPct)) return side.winPct
  if (!side?.record) return null
  const parts = side.record.split('-').map((p) => Number(p))
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null
  const [w, l, t = 0] = parts
  const total = w + l + t
  if (total <= 0) return null
  return (w + t * 0.5) / total
}

function scoreRivalry(
  event: CalendarEvent,
  max: number,
): { points: number; tier: 0 | 1 | 2; reason?: string } {
  const rivalry = findRivalry(event.sport, event.home?.name, event.away?.name)
  if (!rivalry) return { points: 0, tier: 0 }
  const points = rivalry.tier === 1 ? max : max * 0.5
  return { points, tier: rivalry.tier, reason: rivalry.label }
}

function scoreStakes(
  event: CalendarEvent,
  ctx: ScoreContext,
  max: number,
): { points: number; reasons: string[] } {
  const reasons: string[] = []
  let points = 0

  if (event.meta?.seasonPhase === 'finals') {
    points = max
    reasons.push('Championship / finals')
    return { points, reasons }
  }
  if (event.meta?.seasonPhase === 'playoffs') {
    points = max * 0.85
    reasons.push('Playoffs')
    return { points, reasons }
  }

  if (event.sport === 'f1') {
    const progress = ctx.seasonProgress
    const late = progress >= 0.7
    if (late) {
      points = max * (0.5 + progress * 0.5)
      reasons.push('Late-season title implications')
    } else if (progress >= 0.4) {
      points = max * 0.35
      reasons.push('Mid-season championship fight')
    } else {
      points = max * 0.15
    }
    return { points: clamp(points, 0, max), reasons }
  }

  if (!ctx.standings) {
    reasons.push('Standings unavailable')
    return { points: max * 0.25, reasons }
  }

  const homeId = event.home?.entitySourceId
  const awayId = event.away?.entitySourceId
  const home = homeId ? ctx.standings[homeId] : undefined
  const away = awayId ? ctx.standings[awayId] : undefined

  if (!home || !away) {
    const rankHome = event.home?.rank
    const rankAway = event.away?.rank
    if (rankHome != null && rankAway != null) {
      const gap = Math.abs(rankHome - rankAway)
      const top = Math.min(rankHome, rankAway) <= 4
      if (gap <= 1 && top) {
        points = max * 0.9
        reasons.push(`${rankHome}st/nd vs ${rankAway}`)
      } else if (gap <= 3 && top) {
        points = max * 0.65
        reasons.push('Top-table clash')
      } else if (top) {
        points = max * 0.4
        reasons.push('Top team involved')
      } else {
        points = max * 0.2
      }
      points *= 0.6 + ctx.seasonProgress * 0.4
      return { points: clamp(points, 0, max), reasons }
    }
    reasons.push('Standings unavailable')
    return { points: max * 0.25, reasons }
  }

  const rankGap = Math.abs(home.rank - away.rank)
  const topMatchup = Math.min(home.rank, away.rank) <= 3
  const bothTop = home.rank <= 6 && away.rank <= 6
  const sameDivision = home.division && home.division === away.division
  const sameConference = home.conference && home.conference === away.conference

  if (rankGap <= 1 && Math.min(home.rank, away.rank) <= 2) {
    points = max * 0.95
    reasons.push(`${ordinal(home.rank)} vs ${ordinal(away.rank)}`)
  } else if (bothTop && rankGap <= 3) {
    points = max * 0.75
    reasons.push('Top-of-table matchup')
  } else if (topMatchup) {
    points = max * 0.55
    reasons.push('Top team involved')
  } else if (rankGap <= 2) {
    points = max * 0.45
    reasons.push('Close in standings')
  } else {
    points = max * 0.2
  }

  if (sameDivision) {
    points = Math.min(max, points + max * 0.1)
    reasons.push('Division game')
  } else if (sameConference) {
    points = Math.min(max, points + max * 0.05)
  }

  const gbHome = home.gamesBack ?? 0
  const gbAway = away.gamesBack ?? 0
  if (Math.abs(gbHome - gbAway) <= 2 && Math.max(gbHome, gbAway) <= 5) {
    points = Math.min(max, points + max * 0.08)
    reasons.push('Tight games-back race')
  }

  points *= 0.55 + ctx.seasonProgress * 0.45
  return { points: clamp(points, 0, max), reasons }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function scoreQuality(
  event: CalendarEvent,
  ctx: ScoreContext,
  max: number,
): { points: number; reason?: string } {
  if (event.sport === 'f1') {
    const p = max * (0.4 + ctx.seasonProgress * 0.4)
    return { points: p, reason: 'F1 field quality' }
  }

  let homePct = parseWinPct(event.home)
  let awayPct = parseWinPct(event.away)

  if (ctx.standings) {
    const hs = event.home?.entitySourceId
      ? ctx.standings[event.home.entitySourceId]
      : undefined
    const as = event.away?.entitySourceId
      ? ctx.standings[event.away.entitySourceId]
      : undefined
    if (hs) homePct = hs.winPct
    if (as) awayPct = as.winPct
  }

  if (homePct == null || awayPct == null) {
    return { points: max * 0.35 }
  }

  const combined = (homePct + awayPct) / 2
  const balance = 1 - Math.abs(homePct - awayPct)
  const points = max * (combined * 0.7 + balance * 0.3)
  let reason: string | undefined
  if (combined >= 0.6 && balance >= 0.85) reason = 'Two strong, evenly matched sides'
  else if (combined >= 0.55) reason = 'Strong combined quality'
  return { points: clamp(points, 0, max), reason }
}

function scoreMarquee(
  event: CalendarEvent,
  max: number,
): { points: number; reason?: string } {
  let points = 0
  let reason: string | undefined
  if (event.broadcasts.length > 0) {
    points = max * 0.7
    reason = `National TV: ${event.broadcasts.slice(0, 2).join(', ')}`
  }
  if (event.meta?.prestige || event.sport === 'f1') {
    points = Math.max(points, max * 0.85)
    reason = event.sport === 'f1' ? 'F1 Grand Prix' : 'Prestige event'
  }
  if (event.meta?.seasonPhase === 'finals') {
    points = max
    reason = 'Championship event'
  }
  return { points: clamp(points, 0, max), reason }
}

function scoreScarcity(
  event: CalendarEvent,
  max: number,
): { points: number; reason?: string } {
  if (event.sport === 'f1') {
    const classic = isClassicCircuit(event.meta?.circuitId)
    if (classic) return { points: max, reason: `Classic circuit: ${classic}` }
    if (event.meta?.round === 1) return { points: max * 0.7, reason: 'Season opener' }
    return { points: max * 0.25 }
  }

  const title = event.title.toLowerCase()
  if (title.includes('opener') || title.includes('opening day')) {
    return { points: max, reason: 'Season opener' }
  }
  if (title.includes('finale') || title.includes('final')) {
    return { points: max * 0.85, reason: 'Season finale' }
  }
  if (event.meta?.seasonPhase === 'playoffs' || event.meta?.seasonPhase === 'finals') {
    return { points: max * 0.6, reason: 'Postseason scarcity' }
  }
  return { points: max * 0.15 }
}

function scoreFavorite(
  event: CalendarEvent,
  ctx: ScoreContext,
  max: number,
): { points: number; reason?: string } {
  if (ctx.mode !== 'personal') return { points: 0 }
  if (event.sport === 'f1' && ctx.favorites.has('f1')) {
    return { points: max, reason: 'Your F1 calendar' }
  }
  const homeFav = event.home && ctx.favorites.has(event.home.entitySourceId)
  const awayFav = event.away && ctx.favorites.has(event.away.entitySourceId)
  if (homeFav && awayFav) return { points: max, reason: 'Both sides are favorites' }
  if (homeFav || awayFav) return { points: max * 0.85, reason: 'Features a favorite team' }
  return { points: 0 }
}

export function score(event: CalendarEvent, ctx: ScoreContext): ScoreResult {
  const w = ctx.weights
  const reasons: string[] = []

  const rivalry = scoreRivalry(event, w.rivalry)
  if (rivalry.reason) reasons.push(rivalry.reason)

  const stakes = scoreStakes(event, ctx, w.stakes)
  reasons.push(...stakes.reasons)

  const quality = scoreQuality(event, ctx, w.quality)
  if (quality.reason) reasons.push(quality.reason)

  const marquee = scoreMarquee(event, w.marquee)
  if (marquee.reason) reasons.push(marquee.reason)

  const scarcity = scoreScarcity(event, w.scarcity)
  if (scarcity.reason) reasons.push(scarcity.reason)

  const favorite = scoreFavorite(event, ctx, w.favorite)
  if (favorite.reason) reasons.push(favorite.reason)

  let total =
    rivalry.points +
    stakes.points +
    quality.points +
    marquee.points +
    scarcity.points +
    favorite.points

  if (event.provisional) {
    total *= 0.85
    reasons.push('Provisional fixture')
  }

  const scoreValue = Math.round(clamp(total, 0, 100))
  const mustSee = rivalry.tier === 1 || scoreValue >= ctx.mustSeeThreshold

  return {
    score: scoreValue,
    reasons,
    mustSee,
    rivalryTier: rivalry.tier,
    stakesScore: stakes.points,
  }
}

export function applyScores(
  events: CalendarEvent[],
  ctx: ScoreContext,
): CalendarEvent[] {
  return events.map((e) => {
    const result = score(e, ctx)
    return {
      ...e,
      watchability: result.score,
      mustSee: result.mustSee,
      reasons: result.reasons,
      rivalryTier: result.rivalryTier,
      stakesScore: result.stakesScore,
    }
  })
}
