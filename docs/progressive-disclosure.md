# Decision-first progressive disclosure

Summary of the progressive disclosure implementation (decision-first UI).

## Match Feed

- **Single primary, max two angles**: Angle derivation in [lib/build-feed.ts](lib/build-feed.ts) returns exactly one primary and at most one secondary; highlights are filtered to those that **support** the chosen angle(s) (same market/family, no contradiction), then capped at 3.
- **Support filter**: `supportsAngle()` and `filterHighlightsToSupport()` keep only highlights that reinforce the primary or secondary angle; venue-scoped preferred when capping.
- **Card order and weight**: [MatchCard](app/components/MatchCard.tsx) order is Teams → Primary angle (prominent) → Volatility → Secondary angle (subdued) → Supporting highlights (muted, no accent block).

## Match Detail – Stage 1 (Decision Summary)

- **Data**: [MatchDetail](lib/feed.ts) includes `primaryAngle`, `secondaryAngle`, `volatility`, `supportingStatements`. [getMatchDetail](lib/build-feed.ts) derives angles from detail highlights and builds 2–3 supporting statements via [getWhatStandsOut](lib/insights/what-stands-out.ts); if there are no supporting statements, no primary angle is set.
- **UI**: [DecisionSummary](app/components/DecisionSummary.tsx) renders under the match header when `primaryAngle` and `supportingStatements` exist: primary (prominent), volatility, optional secondary, 2–3 bullets. No charts or filters.
- **Filters hidden by default**: [FiltersReveal](app/components/FiltersReveal.tsx) shows a “Show filters” control until the user reveals CategoryScrubber and ConditionsRow.

## Match Detail – Stage 2 (Focused Evidence)

- **Collapsible sections**: Goals, Corners, Shots, Shots on target, BTTS are collapsible in [MatchDetailTabs](app/components/MatchDetailTabs.tsx). Default open state comes from `getSectionsForAngles(primaryAngle, secondaryAngle)` so only angle-relevant sections are expanded; Shots and SOT never both open by default; BTTS only when the angle mentions BTTS.
- **One primary chart per section**: Each open section has one trend chart with For/Against where applicable. [StatTrendChart](app/components/StatTrendChart.tsx) accepts optional `leagueAvg` and shows a league average line/label.
- **League average**: [lib/insights/league-baseline.ts](lib/insights/league-baseline.ts) stub provides per-stat league averages; replace with real league data later.

## Match Detail – Stage 3 (Deep Exploration)

- **Collapsed by default**: “Deep exploration” block at the bottom of the tabs; user must click to expand.
- **Content when expanded**: [ConditionsRow](app/components/ConditionsRow.tsx) (venue, sample, time) and short copy. With “Deep exploration” open, section expansion is effectively “all” (expandAll) so every section can be opened.

## Defaults

- **Venue from angle**: When the URL has no `venue`, [defaultVenueFromAngle](app/match/[id]/page.tsx) sets venue from primary/secondary (e.g. “Home bias” → Home, “Away bias” → Away, else Combined).
- **Sample**: L10; **Time**: Full.

## Files touched

- **Feed**: [lib/build-feed.ts](lib/build-feed.ts), [lib/feed.ts](lib/feed.ts), [app/components/MatchCard.tsx](app/components/MatchCard.tsx)
- **Match detail**: [app/match/[id]/page.tsx](app/match/[id]/page.tsx), [app/components/DecisionSummary.tsx](app/components/DecisionSummary.tsx), [app/components/FiltersReveal.tsx](app/components/FiltersReveal.tsx), [app/components/MatchDetailTabs.tsx](app/components/MatchDetailTabs.tsx), [app/components/StatTrendChart.tsx](app/components/StatTrendChart.tsx)
- **Data**: [lib/insights/league-baseline.ts](lib/insights/league-baseline.ts)
