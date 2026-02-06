# Multi-League and Cup Support

## Summary

Expanded the app from EPL-only to all major European leagues and cups (Big 5, UCL, UEL, UECL, domestic cups). Form and stats are competition-aware; cups default to "this competition" form and leagues to "all"; a form filter lets users switch. Odds lookup is resolved by competition.

## Implemented

### 1. Competition catalog ([lib/leagues.ts](lib/leagues.ts))
- **SupportedCompetition**: `id`, `label`, `season`, `type: "league" | "cup"`, `oddsKey` (The Odds API code or null).
- **SUPPORTED_COMPETITIONS**: Big 5 (39, 78, 135, 140, 61), UCL (2), UEL (3), UECL (848), FA Cup (48), EFL Cup (45), Coppa Italia (137), Copa del Rey (143), Coupe de France (62), DFB-Pokal (81).
- **SUPPORTED_LEAGUES**: Backward-compat list (leagues only).
- **Helpers**: `getCompetitionByLeagueId`, `getOddsKeyForLeagueId`, `isCup`, `ALL_COMPETITION_IDS`.
- **ingest-odds.py**: Added `uecl`, `fa_cup`, `efl_cup` to SPORT_MAP.

### 2. Ingest
- **season-ingest.mjs**: Writes one file per competition: `{leagueId}-{season}-fixtures.json`. Persists each fixture with `league` set (API `item.league` or `{ id: league }` so every saved fixture has competition id). **Batch mode**: `--all` ingests all `ALL_LEAGUE_IDS`.
- **ingest-daily.sh**: `LEAGUE=all` runs season-ingest with `--all`. Odds loop uses configurable `ODDS_COMPETITIONS` (default includes all with odds keys). Health check counts any `*-{SEASON}-fixtures.json`.

### 3. Team stats ([lib/insights/team-stats.ts](lib/insights/team-stats.ts))
- Loads all `*-fixtures.json` (no longer only `epl-*`). Ingested fixture type includes `league?: { id, name }` on the fixture object; optional top-level `league` on each entry is also read when building rows.
- **TeamMatchRow**: Optional `leagueId`, `leagueName`.
- **TeamStatsOptions**: `venue`, `leagueId`. When `leagueId` is set, only matches from that competition are used.
- **Getters**: `getTeamStats`, `getTeamLastNMatchRows`, `getTeamRecentResults`, `getMatchStats` accept optional `leagueId` and filter by it.
- **feed-market-stats**: `getFeedMarketRows`, `getDetailScreenshotCharts` accept optional `{ leagueId }`.

### 4. Feed and match detail
- **FeedMatch / MatchDetail**: `leagueId`, `leagueName` added and set from API `item.league` and catalog.
- **build-feed**: For cups, form and market rows use same-competition only (`formLeagueId`); for leagues, all. Passes `formLeagueId` into getTeamRecentResults, getFeedMarketRows, getTeamStats; resolves `leagueName` from catalog.
- **getFeedMatches**: Uses `SUPPORTED_COMPETITIONS` for season map; feed page and API use `ALL_COMPETITION_IDS` when league filter is "all".
- **Odds**: `getOddsKeyForLeagueId(match.leagueId)` used in feed-model-probs and sim page; when null, market odds are skipped.

### 5. UI
- **MatchCard**: Competition badge (e.g. EPL, UCL) next to kickoff time.
- **LeagueFilter**: Uses full `SUPPORTED_COMPETITIONS`; label "All competitions" for "all".
- **Match detail**: Competition badge in header; **Form: All | This competition** links via [FormFilterLinks](app/components/FormFilterLinks.tsx). URL param `form=all` or `form=same`; default for cups = same, for leagues = all. The displayed form (home/away W-D-L) is computed with `getTeamRecentResults(..., { leagueId: formLeagueId })` so it updates when the user switches the form filter.

## Cup vs league behavior

| Aspect           | League (e.g. EPL)   | Cup (e.g. UCL)           |
|-----------------|---------------------|---------------------------|
| Form default    | All competitions    | This competition only     |
| Form filter     | All / This competition | All / This competition |
| Odds            | By oddsKey          | By oddsKey (if available) |
| Ingest          | `{id}-{season}-fixtures.json` | Same pipeline        |

## Files touched

- **New**: `app/components/FormFilterLinks.tsx`
- **Modified**: `lib/leagues.ts`, `lib/feed.ts`, `lib/build-feed.ts`, `lib/insights/team-stats.ts`, `lib/insights/feed-market-stats.ts`, `lib/modeling/feed-model-probs.ts`, `scripts/season-ingest.mjs`, `scripts/ingest-daily.sh`, `scripts/ingest-odds.py`, `app/page.tsx`, `app/api/feed/route.ts`, `app/components/MatchCard.tsx`, `app/components/LeagueFilter.tsx`, `app/match/[id]/page.tsx`, `app/match/[id]/sim/page.tsx`

## Notes

- Existing `epl-*-fixtures.json` files are still loaded (glob is `*-fixtures.json`). New ingest writes `39-2025-fixtures.json` etc. Re-ingest with `--all` to backfill other competitions.
- Odds keys for some domestic cups (Coppa Italia, Copa del Rey, etc.) are null in the catalog; those competitions have fixtures/form but no odds blend until The Odds API keys are added.
- Form filter on match detail preserves other query params (category, venue, sample, debug).
