import type { AppSettings, ScoringWeights } from '../types'
import { DEFAULT_WEIGHTS } from '../scoring/weights'

interface Props {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
  onWeightChange: (patch: Partial<ScoringWeights>) => void
  onResetWeights: () => void
  onRefresh: () => void
  isRefreshing: boolean
  lastRefreshed: number
  onClose: () => void
}

const TIMEZONES = [
  'America/Chicago',
  'America/New_York',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'UTC',
  'Europe/London',
  'Europe/Madrid',
  'Australia/Sydney',
]

const WEIGHT_KEYS: (keyof ScoringWeights)[] = [
  'rivalry',
  'stakes',
  'quality',
  'marquee',
  'scarcity',
  'favorite',
]

export function SettingsPanel({
  settings,
  onChange,
  onWeightChange,
  onResetWeights,
  onRefresh,
  isRefreshing,
  lastRefreshed,
  onClose,
}: Props) {
  return (
    <div className="drawer">
      <div className="drawer-header">
        <h2>Settings</h2>
        <button type="button" className="btn ghost" onClick={onClose}>
          Close
        </button>
      </div>

      <label className="field">
        <span>Display timezone</span>
        <select
          className="select"
          value={settings.timezone}
          onChange={(e) => onChange({ timezone: e.target.value })}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Scoring mode</span>
        <div className="segmented">
          <button
            type="button"
            className={settings.mode === 'personal' ? 'active' : ''}
            onClick={() => onChange({ mode: 'personal' })}
          >
            Personal
          </button>
          <button
            type="button"
            className={settings.mode === 'neutral' ? 'active' : ''}
            onClick={() => onChange({ mode: 'neutral' })}
          >
            Neutral
          </button>
        </div>
        <span className="muted tiny">
          Personal boosts your favorite teams. Neutral ranks objectively.
        </span>
      </label>

      <label className="field">
        <span>Crowded-day threshold: {settings.crowdedDayThreshold}</span>
        <input
          type="range"
          min={2}
          max={8}
          value={settings.crowdedDayThreshold}
          onChange={(e) =>
            onChange({ crowdedDayThreshold: Number(e.target.value) })
          }
        />
      </label>

      <label className="field">
        <span>Must-see score threshold: {settings.mustSeeThreshold}</span>
        <input
          type="range"
          min={50}
          max={95}
          value={settings.mustSeeThreshold}
          onChange={(e) => onChange({ mustSeeThreshold: Number(e.target.value) })}
        />
      </label>

      <div className="field">
        <div className="field-row">
          <span>Scoring weights</span>
          <button type="button" className="btn ghost tiny-btn" onClick={onResetWeights}>
            Reset
          </button>
        </div>
        {WEIGHT_KEYS.map((key) => (
          <label key={key} className="weight-row">
            <span>
              {key} ({settings.weights[key]})
              <span className="muted tiny"> default {DEFAULT_WEIGHTS[key]}</span>
            </span>
            <input
              type="range"
              min={0}
              max={40}
              value={settings.weights[key]}
              onChange={(e) => onWeightChange({ [key]: Number(e.target.value) })}
            />
          </label>
        ))}
      </div>

      <div className="field">
        <button
          type="button"
          className="btn primary"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Refreshing…' : 'Refresh data'}
        </button>
        <p className="muted tiny">
          Last refreshed:{' '}
          {lastRefreshed
            ? new Date(lastRefreshed).toLocaleString()
            : 'not yet'}
        </p>
        <p className="muted tiny">
          Data from ESPN (unofficial) and Jolpica-F1. Schedules cache ~3h;
          standings ~1 day; F1 calendar is stable within a season.
        </p>
      </div>
    </div>
  )
}
