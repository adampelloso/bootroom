# Betting decision engine (v1)

Summary of the v1 implementation from the betting decision engine plan.

## Feed (Match list)

- **Structured highlights**: Each `FeedInsight` now has `market`, `direction`, `confidence`, and `venueContext` (Home | Away | Combined). Built in `lib/build-feed.ts` from catalog `marketKey`, `getVenueContextForInsightKey`, and simple `deriveDirection` / `deriveConfidence` (stub: Medium).
- **Primary angle row**: `FeedMatch` has `primaryAngle`, `secondaryAngle`, and `volatility`. Derived in build-feed from highlight confidence order; volatility defaults to "Low".
- **MatchCard UI**: Each highlight shows market pill, direction, confidence badge, and venue tag (e.g. "Home L5", "Combined L10"). A row above the highlights shows Primary (and optional Secondary, Volatility) when present.

## Match detail

- **Conditions row**: New `ConditionsRow` component (Venue: Home | Away | Combined; Sample: L5 | L10 | Season; Time: Full only). State is URL search params (`venue`, `sample`, `time`). Trends and “What stands out” use the selected sample and venue.
- **What stands out**: Up to 3 bullets from `lib/insights/what-stands-out.ts` (rule-based: combined goals &lt; 2.5 → “Under goals favored”, home vs away attack, corner volume). Rendered below conditions row.
- **Market tags**: Under each trend group and single-stat header in `MatchDetailTabs`, a tertiary line lists supported markets (e.g. “For: Team goals, Match totals, BTTS” for Goals).

## Data layer

- **Venue filter**: `lib/insights/team-stats.ts` now supports optional `{ venue: 'home' | 'away' | 'all' }` on `getTeamStats`, `getTeamLastNMatchRows`, and `getMatchStats`. When venue is Home or Away, only that team’s home or away matches are included in rolling stats and trend rows.

## Files touched

- **Types / feed**: `lib/feed.ts`, `lib/build-feed.ts`, `lib/insights/catalog.ts`
- **Feed UI**: `app/components/MatchCard.tsx`
- **Match detail**: `app/match/[id]/page.tsx`, `app/components/MatchDetailTabs.tsx`, `app/components/ConditionsRow.tsx` (new)
- **Insights**: `lib/insights/what-stands-out.ts` (new), `lib/insights/team-stats.ts`

## Not in v1 (planned for v2+)

- League baseline module and league avg / percentile on charts
- Bet-first headline copy and refined confidence logic
- 1H/2H in data and Time: 1H | 2H
