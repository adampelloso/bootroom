# Insight display formulas and staging (current)

Display formulas and staging-mode random assignment are implemented per plan.

## Source of truth
- **Market → highlight map:** `docs/insight-market-map.md`
- **Templates/catalog:** `lib/insights/catalog.ts`

## Staging feed pool (match markets only)

The feed uses a **curated match-only pool** (no player props in the feed). This pool is defined in `FEED_INSIGHT_KEYS` inside `lib/insights/catalog.ts`.

Current feed pool keys:
- `high_total_goals_environment`
- `low_total_goals_environment`
- `home_goals_trending_up`
- `away_goals_trending_up`
- `home_goals_trending_down`
- `away_goals_trending_down`
- `btts_tendency_high`
- `btts_tendency_low`
- `first_half_goals_tilt`
- `second_half_goals_tilt`
- `high_total_corners_environment`
- `low_total_corners_environment`
- `home_corners_dominance_trend`
- `away_corners_dominance_trend`
- `opponent_corners_suppressed`
- `trailing_pressure_profile`
- `shot_dominance_edge`
- `sot_dominance_edge`
- `opponent_shots_suppressed`
- `one_sided_match_profile`
- `underdog_resilience_profile`
- `high_variance_match_profile`
- `comeback_frequency`
- `late_chaos_profile`
- `scoreline_clustering`

## Staging match detail pool (match + player markets)

Match detail can include both match markets and player props. This pool is defined in `DETAIL_INSIGHT_KEYS` inside `lib/insights/catalog.ts`.

Current match detail pool keys:
- `high_total_goals_environment`
- `low_total_goals_environment`
- `home_goals_trending_up`
- `away_goals_trending_up`
- `home_goals_trending_down`
- `away_goals_trending_down`
- `btts_tendency_high`
- `btts_tendency_low`
- `first_half_goals_tilt`
- `second_half_goals_tilt`
- `high_total_corners_environment`
- `low_total_corners_environment`
- `home_corners_dominance_trend`
- `away_corners_dominance_trend`
- `opponent_corners_suppressed`
- `trailing_pressure_profile`
- `shot_dominance_edge`
- `sot_dominance_edge`
- `opponent_shots_suppressed`
- `one_sided_match_profile`
- `underdog_resilience_profile`
- `high_variance_match_profile`
- `comeback_frequency`
- `late_chaos_profile`
- `scoreline_clustering`
- `primary_shooter_concentration`
- `distributed_shooting_profile`
- `player_shots_trending_up`
- `team_shot_volume_boost_spot`

## Code

- **lib/insights/catalog.ts** – Insight catalog, plus `FEED_INSIGHT_KEYS` (match-only pool) and `DETAIL_INSIGHT_KEYS` (match + player pool).
- **lib/insights/stub-context.ts** – Deterministic placeholder values (value, l5, l10, n, k, pct, diff, against).
- **lib/insights/fill-template.ts** – Replaces placeholders in templates.
- **lib/insights/select.ts** – Picks 3 insights per match (max 2 per family). Deterministic when seeded.

## Build-feed

- **lib/build-feed.ts** – For each fixture: `selectThreeForMatch()` → fill templates → `FeedInsight[]`. Feed uses `FEED_INSIGHT_KEYS`, match detail uses `DETAIL_INSIGHT_KEYS`, and both selections are seeded by fixture id.

## Staging behaviour

- Each feed load: each match gets 3 insight types from the curated pool (max 2 per family).
- Selection is deterministic per fixture id, so the same match renders the same trio on refresh.
- Headlines and support lines use market-aligned, numeric templates filled with stub data so every type renders correctly.

## Extending

- Update `docs/insight-market-map.md` first.
- Then adjust `lib/insights/catalog.ts` and `FEED_INSIGHT_KEYS`.
