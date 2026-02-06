# Progress Log

Running session history. Append summaries at end of each session.

---

## 2026-02-06 — Initial Setup

- Created `CLAUDE.md` with project context (tech stack, architecture, conventions, constraints, TODOs)
- Created `docs/progress.md` (this file) for session history
- Created `session_summary.md` for latest session state
- No product code changes — documentation/workflow files only

---

## 2026-02-06 — Brutalist Design System Overhaul

Implemented a comprehensive visual redesign across 21 files in 5 phases, transforming the UI from a rounded/colorful "startup dashboard" to a sharp, monospace-only, information-dense Bloomberg-terminal aesthetic.

### Phase 1: Design Tokens (`globals.css`)
- Dropped Inter font; JetBrains Mono only (400–700)
- New 8px spacing grid (8/16/24/32/48/64)
- All border-radius → 0
- Dark theme: #0A0A0A bg, #E5E5E5 text, #141414 surface, #262626 borders
- Light theme: #FAFAFA bg, #1A1A1A text, #F0F0F0 surface, #E5E5E5 borders
- Signal colors: blue accent (#3B82F6), muted bars (#525252), removed all bright greens
- New typography scale: headline (20px/700), section-header (13px/600/uppercase), primary-data (18px/600), secondary-data (14px/400), tertiary-data (12px/400/0.6 opacity)

### Phase 2: Shared Components (9 files)
- EVBadge: text-only `++EV`/`+EV`, no colored pill
- FormDisplay: monochrome opacity dots (W=1.0, D=0.5, L=0.2), 8px
- StatTrendChart: flat container, top-3 bar highlight in blue, rest muted
- ScorelineBarChart: top-3 highlight pattern, no rounded bars
- DateScrubber, LeagueFilter, DetailTabs, ThemeToggle, MatchActions: removed all rounded corners, neutralized colors

### Phase 3: Section Components (7 files)
- TotalGoalsSection, CornersCard, TeamTotalsSection, PlayerPropsCard, MarketSnapshot, MoreStatsReveal, DeepStats
- Removed all card backgrounds (bg-surface) and rounded wrappers
- Flat sections with 1px border dividers
- Deleted getCombinedScoreColor — all scores use var(--text-main)
- Headers: 13px/600/uppercase/0.08em tracking

### Phase 4: Pages (4 files)
- Feed (`page.tsx`): title 20px (was 32px), 32px card gaps
- MatchCard: major restructure — dense single-line stats (`O2.5 8/10 · BTTS 5/10 · AVG 2.8 · CORNERS 9.4`), team names 20px (was 28px), blue left border for EV matches
- Match detail: TeamTotals and Corners wrapped in `<details>` collapse
- Sim page: edge-first sorted list layout (`++EV HOME 1X2 +7.6% edge`), removed redundant 1X2 section

### Phase 5: Cleanup
- Removed deprecated color aliases from globals.css
- `npm run build` passes cleanly (0 errors)
