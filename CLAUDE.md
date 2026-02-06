# Bootroom — Project Context

## What This Is
Stats-focused football match intelligence app. Surfaces statistical insights for upcoming fixtures across major leagues. Neutral language throughout — no betting terms in UI. Odds are used internally only (model calibration, EV badges, insight ranking).

## Tech Stack
- **Framework**: Next.js 15 / React 19 / TypeScript 5 (App Router, Server Components)
- **Styling**: Tailwind CSS 3.4 + custom CSS variables (dark/light theme)
- **Data**: API-Football (api-sports.io) with mock fallback when no key is set
- **Fonts**: Inter (sans), JetBrains Mono (mono)
- **No test framework** — manual validation only (see `docs/testing-guide.md`)

## Dev Setup
```bash
npm install
cp .env.example .env   # add API_FOOTBALL_KEY for real data
npm run dev             # localhost:3000
```

## Key Pages
| Route | Purpose |
|-------|---------|
| `/` | Match feed — date scrubber, league filter, match cards with 3 insights each |
| `/match/[id]` | Match detail — tabs (Goals, Corners, Player Props), conditions row, trend charts |
| `/match/[id]/export` | Shareable screenshot mode (minimal chrome) |
| `/match/[id]/sim` | Monte Carlo simulation (WIP) |

## Architecture
```
app/              → Pages + components (29+ TSX files)
lib/
  providers/      → API-Football client + mock fallback (FootballProvider interface)
  insights/       → 50+ insight types, catalog, selection, templates, trend data
  normalization/  → Ingest pipeline: raw API → normalized schema
  modeling/       → Monte Carlo engine, calibration, features, odds blending
  feed.ts         → Core types (FeedMatch, FeedInsight, FeedMarketRow)
  build-feed.ts   → Orchestrates fixture → insights → FeedMatch
  leagues.ts      → League config (EPL=39, UCL=2, La Liga=140, etc.)
data/             → Ingested fixtures, odds, backtests, model outputs (gitignored)
scripts/          → Ingest scripts (bash + node ESM + python)
docs/             → 35+ design/spec/decision docs
```

## Code Conventions
- Async Server Components by default; `"use client"` only for interactivity
- Import alias `@/*` → project root
- camelCase functions, PascalCase components
- CSS variables for spacing (`--space-xs` through `--space-2xl`)
- Utility-first Tailwind + inline styles for custom values
- Mobile-first, 480px max-width constraint

## Product Constraints
- UI language must be **neutral** (no "bet", "odds", "stake")
- Feed shows **match markets only** (BTTS, O2.5, Corners, etc.)
- Player props appear **only in match detail**
- Insights are objective/stat-based
- Sticky header; only match list scrolls

## Key Docs (load as needed)
- `docs/project-handbook.md` — Single source of truth, onboarding
- `docs/spec.md` — Full product spec
- `docs/betting-decision-engine.md` — v1 signals implementation
- `docs/insight-market-map.md` — Market-to-insight mapping
- `docs/workstreams.md` — Parallel work streams
- `docs/monte-carlo.md` / `docs/mc-upgrade.md` — MC simulation plans
- `docs/testing-guide.md` — Manual test playbook
- `docs/decision-log.md` — Architecture decisions

## Active Features (v1 complete)
- Market-focused feed with ranked insights and EV badges
- Match detail with conditions row (venue/sample/time filters)
- "What Stands Out" rule-based bullet points
- Trend charts and deep stats tables
- H2H analysis and team form tracking
- Multi-league support (EPL, UCL, La Liga, Serie A, Bundesliga, Ligue 1, more)
- Export/screenshot mode

## Known WIP / Next TODOs
- Monte Carlo simulation page (`/match/[id]/sim`) — scaffolded, not wired
- League baseline comparisons on charts (v2)
- Time period splitting (1H/2H stats)
- Advanced odds tracking & line movement
- Formal test suite (no Jest/Vitest/Playwright yet)

## Session Workflow
- **End of session**: run `/compact`, append summary to `docs/progress.md`, save to `session_summary.md`
- **Start of session**: load `@CLAUDE.md`, `@docs/progress.md`, optionally `@session_summary.md`
- **Every ~40 messages**: run `/compact`, save to `session_summary.md`
