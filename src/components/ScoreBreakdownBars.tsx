import type { ScoreBreakdown, ScoringWeights } from '../types'
import { BREAKDOWN_LABELS } from '../scoring/score'
import { DEFAULT_WEIGHTS } from '../scoring/weights'

interface Props {
  breakdown: ScoreBreakdown
  weights?: ScoringWeights
  compact?: boolean
}

const ORDER: (keyof ScoreBreakdown)[] = [
  'rivalry',
  'stakes',
  'quality',
  'marquee',
  'scarcity',
  'favorite',
]

export function ScoreBreakdownBars({
  breakdown,
  weights = DEFAULT_WEIGHTS,
  compact = false,
}: Props) {
  return (
    <div className={`score-bars ${compact ? 'compact' : ''}`}>
      {ORDER.map((key) => {
        const max = Math.max(weights[key], 1)
        const value = breakdown[key]
        const pct = Math.min(100, (value / max) * 100)
        if (compact && value <= 0) return null
        return (
          <div key={key} className="score-bar-row" title={`${BREAKDOWN_LABELS[key]}: ${value}/${max}`}>
            <span className="score-bar-label">{BREAKDOWN_LABELS[key]}</span>
            <div className="score-bar-track">
              <div className="score-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="score-bar-val">{formatPts(value)}</span>
          </div>
        )
      })}
    </div>
  )
}

function formatPts(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}
