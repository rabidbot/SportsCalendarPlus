# Watchlist

Local-first multi-sport calendar for NFL, NBA, MLB, NHL, soccer, and Formula 1.

Pick up to **10 teams/entities**, merge their known fixtures into one month calendar, score every game for watchability, and get a **pick of the day** plus ranked watch order on crowded days.

## Stack

- Vite + React + TypeScript
- TanStack Query
- date-fns / date-fns-tz
- Plain CSS (custom month grid)

No backend, no login. Selections and scoring weights persist in `localStorage`.

## Quick start

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
```

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

Production builds call the hosts directly. If a browser blocks CORS in production, serve the app behind the same proxy pattern or a tiny static host rewrite.

Optional mock mode (NFL sample only):

```bash
VITE_USE_MOCK=true npm run dev
```

## Features

- Team picker grouped by sport (soccer league selector; F1 as one slot)
- Month grid color-coded by sport, must-see badges, pick-of-day crown
- Day panel: ranked list, score reasons, broadcasts, conflict blocks
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

Unit tests live in `src/scoring/score.test.ts`.

## Project layout

```
src/
  adapters/     ESPN + Jolpica normalize → CalendarEvent
  scoring/      pure watchability engine
  calendar/     day grouping, conflicts, pick-of-day
  state/        localStorage-backed settings + entities
  components/   Picker, MonthGrid, DayPanel, Settings
  lib/          time + sport constants
```

## Notes

- ESPN payloads are undocumented and vary by sport; parsing is isolated in `adapters/espn.ts`.
- NHL standings use the `apis/v2` path.
- Jolpica is volunteer-run — F1 calendar is cached aggressively via TanStack Query.
- “Currently known” schedules may be incomplete mid-season; playoff opponents are often TBD.
