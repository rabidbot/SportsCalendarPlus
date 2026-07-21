# Watchlist

Local-first multi-sport calendar for NFL, NBA, MLB, NHL, soccer, and Formula 1.

Pick up to **10 teams**, merge known fixtures into one calendar, score every game, and get a **pick of the day** with a plain-English explanation of why it ranked first.

**Live:** https://rabidbot.github.io/SportsCalendarPlus/

## Stack

- Vite + React + TypeScript
- TanStack Query
- date-fns / date-fns-tz
- Plain CSS (custom month + week grids)

No backend, no login. Selections, weights, and alert prefs persist in `localStorage`.

## Quick start

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
```

## Deploy (GitHub Pages)

Pushes to `master` build and deploy via GitHub Actions (`.github/workflows/deploy.yml`).

One-time setup in the repo:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. Push to `master` (or run the workflow manually)

Site URL: `https://<user>.github.io/SportsCalendarPlus/`

## Data sources

| Source | Sports | Notes |
|--------|--------|--------|
| [ESPN unofficial JSON API](https://site.api.espn.com) | NFL, NBA, MLB, NHL, soccer | Teams, schedules, standings |
| [Jolpica-F1](https://api.jolpi.ca) (Ergast-compatible) | Formula 1 | Season race calendar + standings |

### Dev-server proxy (CORS)

In development, Vite proxies:

| Browser path | Target |
|--------------|--------|
| `/api/espn/*` | `https://site.api.espn.com/*` |
| `/api/espn-v2/*` | `https://site.api.espn.com/*` (NHL standings quirk) |
| `/api/jolpica/*` | `https://api.jolpi.ca/*` |

Production builds call the hosts directly. Soccer schedules use `fixture=true` plus season fallbacks because ESPN often defaults to an empty next season.

Optional mock mode (NFL sample only):

```bash
VITE_USE_MOCK=true npm run dev
```

## Features

- Team picker (soccer league selector; F1 as one slot) + **focus filter**
- **Month** and **week** views, Today jump, upcoming rail
- Day panel: ranked list, score bars, “why this over the rest”, conflicts
- Browser **game alerts** (must-see / favorites / pick-of-day) while the tab is open
- Scoring weights, Personal/Neutral mode, timezone, crowded-day threshold
- Provisional/TBD fixtures rendered distinctly and deprioritized

## Scoring

Weighted 0–100 rubric (`src/scoring/`):

- Rivalry (curated tier table)
- Stakes (standings / late season / playoffs)
- Quality (combined strength)
- Marquee (national TV / prestige)
- Scarcity (openers, finales, classic F1 circuits)
- Favorite (personal mode only)

Each event gets a **headline**, **component breakdown**, and comparative rationale vs the runner-up.

Unit tests: `src/scoring/score.test.ts`.

## Project layout

```
src/
  adapters/     ESPN + Jolpica normalize → CalendarEvent
  scoring/      pure watchability engine
  calendar/     day grouping, conflicts, pick-of-day
  state/        localStorage-backed settings + entities
  components/   Picker, MonthGrid, WeekView, DayPanel, Settings
  hooks/        calendar data + game alerts
  lib/          time + sport constants
```

## Notes

- ESPN payloads are undocumented and vary by sport; parsing is isolated in `adapters/espn.ts`.
- NHL standings use the `apis/v2` path.
- Jolpica is volunteer-run — F1 calendar is cached aggressively via TanStack Query.
- Alerts use the browser Notification API (no push server); keep the tab open for timed reminders.
- “Currently known” schedules may be incomplete mid-season; playoff opponents are often TBD.
