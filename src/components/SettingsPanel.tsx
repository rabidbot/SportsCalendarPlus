import { useState } from 'react'
import type { AppSettings, NotificationSettings, ScoringWeights } from '../types'
import { DEFAULT_WEIGHTS } from '../scoring/weights'
import { requestNotificationPermission } from '../hooks/useGameAlerts'

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
  const [permNote, setPermNote] = useState('')

  function patchNotifications(patch: Partial<NotificationSettings>) {
    onChange({
      notifications: { ...settings.notifications, ...patch },
    })
  }

  async function enableAlerts() {
    const perm = await requestNotificationPermission()
    if (perm === 'unsupported') {
      setPermNote('Notifications are not supported in this browser.')
      return
    }
    if (perm === 'denied') {
      setPermNote('Permission blocked — enable notifications in browser settings.')
      patchNotifications({ enabled: false })
      return
    }
    patchNotifications({ enabled: true })
    setPermNote('Alerts on — keep this tab open for timed reminders.')
  }

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
        <span>Calendar view</span>
        <div className="segmented">
          <button
            type="button"
            className={settings.viewMode === 'month' ? 'active' : ''}
            onClick={() => onChange({ viewMode: 'month' })}
          >
            Month
          </button>
          <button
            type="button"
            className={settings.viewMode === 'week' ? 'active' : ''}
            onClick={() => onChange({ viewMode: 'week' })}
          >
            Week
          </button>
        </div>
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

      <div className="field">
        <span>Game alerts</span>
        <div className="segmented">
          <button
            type="button"
            className={settings.notifications.enabled ? 'active' : ''}
            onClick={() => void enableAlerts()}
          >
            On
          </button>
          <button
            type="button"
            className={!settings.notifications.enabled ? 'active' : ''}
            onClick={() => {
              patchNotifications({ enabled: false })
              setPermNote('')
            }}
          >
            Off
          </button>
        </div>
        <label className="check-row">
          <input
            type="checkbox"
            checked={settings.notifications.mustSee}
            onChange={(e) => patchNotifications({ mustSee: e.target.checked })}
          />
          Must-see games
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={settings.notifications.favorites}
            onChange={(e) => patchNotifications({ favorites: e.target.checked })}
          />
          Favorite-team games
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={settings.notifications.pickOfDay}
            onChange={(e) => patchNotifications({ pickOfDay: e.target.checked })}
          />
          Pick of the day
        </label>
        <label className="weight-row">
          <span>Minutes before kickoff: {settings.notifications.minutesBefore}</span>
          <input
            type="range"
            min={5}
            max={120}
            step={5}
            value={settings.notifications.minutesBefore}
            onChange={(e) =>
              patchNotifications({ minutesBefore: Number(e.target.value) })
            }
          />
        </label>
        {permNote && <p className="muted tiny">{permNote}</p>}
        <p className="muted tiny">
          Local browser alerts while Watchlist is open — no account or push server.
        </p>
      </div>

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
          {lastRefreshed ? new Date(lastRefreshed).toLocaleString() : 'not yet'}
        </p>
        <p className="muted tiny">
          Data from ESPN (unofficial) and Jolpica-F1. Schedules cache ~3h;
          standings ~1 day; F1 calendar is stable within a season.
        </p>
      </div>
    </div>
  )
}
