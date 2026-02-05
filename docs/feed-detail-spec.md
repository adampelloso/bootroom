# Feed + Detail spec (v1)

Summary of the “Dev ready spec: Match Feed + Match Detail” implementation. Same brutalist UI; content, order, and chart set are fixed.

## Match Feed

- **Card layout**: Date row, league selector, match rows with crests/abbrevs/time, “DETAILS →”, form squares. Body: teams header + **Market Rows** only (max 3 per match).
- **Market rows**: BTTS, O2.5, Corners (priority order). Each row: label | Home (x/5) Away (x/5) | Combined (x/10) [Avg for O2.5/Corners]. Venue context: home team last 5 home, away team last 5 away; combined = those 10.
- **Sorting**: Matches ordered by deterministic score (BTTS + O2.5 hit rates + corners combined avg). Score not shown in UI.
- **Data**: `lib/insights/feed-market-stats.ts` — `getFeedMarketRows()`, `feedMatchScore()`. Feed types in `lib/feed.ts` (`FeedMarketRow`, `marketRows` on `FeedMatch`). Build in `lib/build-feed.ts` (market rows only, no angle/highlights in card body).

## Match Detail

- **Header**: Back, teams, venue, form squares unchanged.
- **Tabs**: ALL | GOALS | CORNERS | SHOTS | PLAYER PROPS (disabled). ALL = Snapshot; GOALS/CORNERS scroll to chart; SHOTS scrolls to Deep Stats and opens via hash.
- **Market Snapshot**: First block below header. Three mini cards: BTTS (x/5, x/5, x/10; optional Avg goals), O2.5 (same + Avg goals), Corners (home/away/combined avg only). No filters above.
- **Screenshot Charts**: One section, default expanded. Exactly 3 charts in v1: Total Goals (Last 10 combined), BTTS (Last 10 combined), Total Corners (Last 10 combined). Horizontal average line; one metric per chart; last 10 combined context. IDs for scroll: `chart-total-goals`, `chart-btts`, `chart-total-corners`.
- **Deep Stats**: Collapsed by default. Accordion “Deep stats” with Goals For/Against, Shots, Shots on Target; only rendered when data exists. Opens when hash is `#section-deep-stats` (e.g. SHOTS tab).
- **Filters**: Hidden by default; “Show filters” reveals category + conditions.

## Data

- BTTS/O2.5: last 5 home for home team, last 5 away for away team; combined = 10. Per match: `goals_for`, `goals_against`, `total_goals`, `btts_hit`.
- Corners: same venue sets; `corners_for`, `corners_against`, `total_corners`. Feed uses hit rates / averages from `lib/insights/feed-market-stats.ts` and team-stats rows.

## Copy rules

- Allowed: BTTS, O2.5, O3.5 (detail only later), Corners, Total Goals, Total Corners, Avg goals, Avg corners.
- Not shown in v1: volatility, bias, lean, primary/secondary, “what stands out” narrative, interpretive adjectives.

## Key files

- Feed: `app/components/MatchCard.tsx` (MarketRow), `lib/build-feed.ts`, `lib/insights/feed-market-stats.ts`.
- Detail: `app/match/[id]/page.tsx`, `app/components/MarketSnapshot.tsx`, `app/components/ScreenshotCharts.tsx`, `app/components/DeepStats.tsx`, `app/components/DetailTabs.tsx`, `app/components/FiltersReveal.tsx`.
