import type {
  CalendarEvent,
  ScoreBreakdown,
  ScoreContext,
  ScoreResult,
  ScoringWeights,
} from '../types'
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
  const tag = rivalry.tier === 1 ? 'Blood rivalry' : 'Regional rivalry'
  return { points, tier: rivalry.tier, reason: `${tag}: ${rivalry.label}` }
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
    reasons.push('Championship / finals — maximum stakes')
    return { points, reasons }
  }
  if (event.meta?.seasonPhase === 'playoffs') {
    points = max * 0.85
    reasons.push('Playoff game — every possession matters')
    return { points, reasons }
  }

  if (event.sport === 'f1') {
    const progress = ctx.seasonProgress
    if (progress >= 0.7) {
      points = max * (0.5 + progress * 0.5)
      reasons.push('Late-season title math is live')
    } else if (progress >= 0.4) {
      points = max * 0.35
      reasons.push('Championship order still fluid')
    } else {
      points = max * 0.15
      reasons.push('Early-season; stakes still building')
    }
    return { points: clamp(points, 0, max), reasons }
  }

  if (!ctx.standings) {
    reasons.push('Standings unavailable — stakes scored neutrally')
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
        reasons.push(`Table clash: ${ordinal(rankHome)} vs ${ordinal(rankAway)}`)
      } else if (gap <= 3 && top) {
        points = max * 0.65
        reasons.push('Top-table sides meeting')
      } else if (top) {
        points = max * 0.4
        reasons.push('A top team is involved')
      } else {
        points = max * 0.2
        reasons.push('Mid/lower table — lower league impact')
      }
      points *= 0.6 + ctx.seasonProgress * 0.4
      return { points: clamp(points, 0, max), reasons }
    }
    reasons.push('Standings unavailable — stakes scored neutrally')
    return { points: max * 0.25, reasons }
  }

  const rankGap = Math.abs(home.rank - away.rank)
  const topMatchup = Math.min(home.rank, away.rank) <= 3
  const bothTop = home.rank <= 6 && away.rank <= 6
  const sameDivision = home.division && home.division === away.division
  const sameConference = home.conference && home.conference === away.conference

  if (rankGap <= 1 && Math.min(home.rank, away.rank) <= 2) {
    points = max * 0.95
    reasons.push(
      `Direct title/seed fight: ${ordinal(home.rank)} vs ${ordinal(away.rank)}`,
    )
  } else if (bothTop && rankGap <= 3) {
    points = max * 0.75
    reasons.push(
      `Top-six collision (${ordinal(home.rank)} vs ${ordinal(away.rank)})`,
    )
  } else if (topMatchup) {
    points = max * 0.55
    reasons.push(`Includes a top-3 side (${ordinal(Math.min(home.rank, away.rank))})`)
  } else if (rankGap <= 2) {
    points = max * 0.45
    reasons.push('Neighbors in the standings — seeding implications')
  } else {
    points = max * 0.2
    reasons.push('Wide standings gap — less table drama')
  }

  if (sameDivision) {
    points = Math.min(max, points + max * 0.1)
    reasons.push('Division game (extra standings weight)')
  } else if (sameConference) {
    points = Math.min(max, points + max * 0.05)
    reasons.push('Same conference')
  }

  const gbHome = home.gamesBack ?? 0
  const gbAway = away.gamesBack ?? 0
  if (Math.abs(gbHome - gbAway) <= 2 && Math.max(gbHome, gbAway) <= 5) {
    points = Math.min(max, points + max * 0.08)
    reasons.push('Tight games-back race')
  }

  if (ctx.seasonProgress >= 0.75) {
    reasons.push('Late season amplifies every result')
  } else if (ctx.seasonProgress <= 0.25) {
    reasons.push('Early season — stakes scaled down')
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
    return { points: p, reason: 'Open F1 field — quality scales with title fight' }
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
    return { points: max * 0.35, reason: 'Team strength unknown — baseline quality' }
  }

  const combined = (homePct + awayPct) / 2
  const balance = 1 - Math.abs(homePct - awayPct)
  const points = max * (combined * 0.7 + balance * 0.3)
  let reason: string
  if (combined >= 0.6 && balance >= 0.85) {
    reason = 'Two strong, evenly matched sides (best product)'
  } else if (combined >= 0.55 && balance < 0.7) {
    reason = 'Talent on the floor, but a likely mismatch'
  } else if (combined >= 0.55) {
    reason = 'Above-average combined strength'
  } else if (balance >= 0.85) {
    reason = 'Competitive, but neither side is elite'
  } else {
    reason = 'Lower combined quality / lopsided form'
  }
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
    reason = `National window: ${event.broadcasts.slice(0, 2).join(', ')}`
  }
  if (event.meta?.prestige || event.sport === 'f1') {
    points = Math.max(points, max * 0.85)
    reason = event.sport === 'f1' ? 'Grand Prix prestige card' : 'Prestige showcase event'
  }
  if (event.meta?.seasonPhase === 'finals') {
    points = max
    reason = 'Championship stage — built-in marquee'
  }
  if (!reason) reason = 'No national TV / prestige flag'
  return { points: clamp(points, 0, max), reason: points > 0 ? reason : undefined }
}

function scoreScarcity(
  event: CalendarEvent,
  max: number,
): { points: number; reason?: string } {
  if (event.sport === 'f1') {
    const classic = isClassicCircuit(event.meta?.circuitId)
    if (classic) return { points: max, reason: `Classic circuit: ${classic}` }
    if (event.meta?.round === 1) return { points: max * 0.7, reason: 'Season opener' }
    return { points: max * 0.25, reason: 'Regular race weekend' }
  }

  const title = event.title.toLowerCase()
  if (title.includes('opener') || title.includes('opening day')) {
    return { points: max, reason: 'Season opener — once a year' }
  }
  if (title.includes('finale')) {
    return { points: max * 0.85, reason: 'Season finale' }
  }
  if (event.meta?.seasonPhase === 'playoffs' || event.meta?.seasonPhase === 'finals') {
    return { points: max * 0.6, reason: 'Postseason — scarce chances left' }
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
    return { points: max, reason: 'On your F1 calendar' }
  }
  const homeFav = event.home && ctx.favorites.has(event.home.entitySourceId)
  const awayFav = event.away && ctx.favorites.has(event.away.entitySourceId)
  if (homeFav && awayFav) return { points: max, reason: 'Both clubs are your teams' }
  if (homeFav || awayFav) {
    const name = homeFav ? event.home?.name : event.away?.name
    return { points: max * 0.85, reason: `Features your team${name ? `: ${name}` : ''}` }
  }
  return { points: 0 }
}

function buildHeadline(
  breakdown: ScoreBreakdown,
  rivalryTier: 0 | 1 | 2,
  reasons: string[],
): string {
  const parts = (Object.entries(breakdown) as [keyof ScoreBreakdown, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])

  if (rivalryTier === 1) {
    const label = reasons.find((r) => r.toLowerCase().includes('rivalry'))
    return label
      ? `${label.split(': ').slice(1).join(': ') || label} leads the slate`
      : 'Tier-1 rivalry leads the slate'
  }

  const top = parts[0]
  if (!top) return 'Baseline card — nothing special on paper'
  const [key, pts] = top
  const second = parts[1]

  const labels: Record<keyof ScoreBreakdown, string> = {
    rivalry: 'rivalry heat',
    stakes: 'standings stakes',
    quality: 'on-paper quality',
    marquee: 'marquee billing',
    scarcity: 'scarcity',
    favorite: 'your teams',
  }

  if (second && pts - second[1] < 2) {
    return `Wins on ${labels[key]} and ${labels[second[0]]}`
  }
  return `Primarily wins on ${labels[key]} (+${Math.round(pts)})`
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

  const breakdown: ScoreBreakdown = {
    rivalry: round1(rivalry.points),
    stakes: round1(stakes.points),
    quality: round1(quality.points),
    marquee: round1(marquee.points),
    scarcity: round1(scarcity.points),
    favorite: round1(favorite.points),
  }

  let total =
    breakdown.rivalry +
    breakdown.stakes +
    breakdown.quality +
    breakdown.marquee +
    breakdown.scarcity +
    breakdown.favorite

  if (event.provisional) {
    total *= 0.85
    reasons.push('Provisional fixture — docked vs confirmed games')
  }

  const scoreValue = Math.round(clamp(total, 0, 100))
  const mustSee = rivalry.tier === 1 || scoreValue >= ctx.mustSeeThreshold
  const headline = buildHeadline(breakdown, rivalry.tier, reasons)

  return {
    score: scoreValue,
    reasons,
    headline,
    breakdown,
    mustSee,
    rivalryTier: rivalry.tier,
    stakesScore: stakes.points,
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

const BREAKDOWN_LABELS: Record<keyof ScoreBreakdown, string> = {
  rivalry: 'Rivalry',
  stakes: 'Stakes',
  quality: 'Quality',
  marquee: 'Marquee',
  scarcity: 'Scarcity',
  favorite: 'Favorite',
}

/** Explain why winner outranks runner-up using component deltas. */
export function explainPick(
  winner: CalendarEvent,
  runnerUp?: CalendarEvent,
  weights?: ScoringWeights,
): string[] {
  const lines: string[] = []
  if (!winner.breakdown) {
    if (winner.headline) lines.push(winner.headline)
    return lines
  }

  lines.push(
    winner.headline ??
      `Score ${winner.watchability ?? 0}/100 on the watchability rubric`,
  )

  if (!runnerUp?.breakdown) {
    if (winner.mustSee) lines.push('Marked must-see (tier-1 rivalry or high total).')
    return lines
  }

  const w = winner.breakdown
  const r = runnerUp.breakdown
  const deltas = (Object.keys(w) as (keyof ScoreBreakdown)[])
    .map((key) => ({
      key,
      delta: w[key] - r[key],
      winnerPts: w[key],
      runnerPts: r[key],
    }))
    .filter((d) => Math.abs(d.delta) >= 0.5)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  const scoreGap = (winner.watchability ?? 0) - (runnerUp.watchability ?? 0)
  lines.push(
    `Beats “${shortTitle(runnerUp.title)}” by ${scoreGap} pts (${winner.watchability} vs ${runnerUp.watchability}).`,
  )

  for (const d of deltas.slice(0, 3)) {
    if (d.delta > 0) {
      lines.push(
        `+${fmt(d.delta)} ${BREAKDOWN_LABELS[d.key].toLowerCase()} (${fmt(d.winnerPts)} vs ${fmt(d.runnerPts)})`,
      )
    } else {
      lines.push(
        `${fmt(d.delta)} ${BREAKDOWN_LABELS[d.key].toLowerCase()} — runner-up was stronger here`,
      )
    }
  }

  if (winner.rivalryTier === 1 && runnerUp.rivalryTier !== 1) {
    lines.push('Tier-1 rivalry also wins ties when totals are close.')
  }
  if (!winner.provisional && runnerUp.provisional) {
    lines.push('Confirmed fixture preferred over a provisional one.')
  }
  if (weights && winner.breakdown.favorite > 0) {
    lines.push('Personal mode is boosting games with your teams.')
  }

  return lines
}

function shortTitle(title: string): string {
  return title.length > 36 ? `${title.slice(0, 34)}…` : title
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
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
      headline: result.headline,
      breakdown: result.breakdown,
      rivalryTier: result.rivalryTier,
      stakesScore: result.stakesScore,
    }
  })
}

export { BREAKDOWN_LABELS }
