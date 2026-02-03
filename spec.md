# Bootroom EPL MVP Spec (API-Football)

## 0) Product Contract
Bootroom is a stats-focused soccer intelligence app.
- No odds, lines, books, implied probabilities, or bet recommendations in the UI.
- Odds are used only on the backend to suppress trivial insights and help rank what to surface.
- EPL-only for MVP.
- Daily updates, not live.
Core UX:
- Users follow leagues (MVP: EPL only).
- Feed shows match cards with ~3 highlights each.
- Match detail shows all stat families and all insights, ranked.
- Share/export mode produces clean screenshot-ready visuals.

## 1) MVP Scope

### Included
- EPL fixtures, results, standings (optional for UI)
- Match stats and player match stats (as provided by API-Football)
- Daily ingestion and recompute pipeline
- Season-to-date + rolling windows (L5, L10, L20)
- Insight engine: compute, score, rank, select feed highlights
- Feed view + Match detail view
- Export mode for match cards (minimal chrome, watermark)

### Excluded (Post-launch)
- Monte Carlo simulation engine
- Live match updates
- Line movement tracking
- Multi-league UI (architecture supports it)

## 2) Data Provider Decision
Primary provider for MVP:
- API-Football (API-Sports) for fixtures, results, match stats, player stats, and odds snapshots.
Implementation note:
- Provider is abstracted behind a simple adapter interface so we can supplement or switch later.

## 3) System Architecture Overview

### Services / Modules
- `providers/` (external API adapters)
- `ingestion/` (jobs to fetch and store raw + normalized data)
- `normalization/` (maps provider data into internal schema)
- `features/` (computes team/player/match features per window)
- `insights/` (generates InsightInstances from features)
- `scoring/` (strength, relevance, clarity, total)
- `api/` (app-facing endpoints)
- `ui/` (feed, match detail, export)

### Storage
- Postgres (or Supabase) for normalized entities + computed features + insights
- Optional blob storage for raw provider responses (recommended for debugging)

## 4) Internal Data Model

### Core Entities
- `league`:
- id (uuid)
- key (string, "EPL")
- provider_league_id (int)
- season_year (int, ex: 2025)
- `team`:
- id (uuid)
- league_id
- name
- provider_team_id
- `player`:
- id (uuid)
- team_id
- name
- provider_player_id
- `match`:
- id (uuid)
- league_id
- season_year
- provider_fixture_id
- kickoff_utc (timestamp)
- home_team_id
- away_team_id
- status (scheduled, in_progress, finished, postponed)
- home_goals (int, nullable)
- away_goals (int, nullable)
- updated_at
- `match_team_stats`:
- match_id
- team_id
- stats_json (raw-normalized fields, see section 6)
- updated_at
- `match_player_stats`:
- match_id
- player_id
- team_id
- minutes (int)
- stats_json
- updated_at
- `odds_snapshot` (internal only):
- match_id
- captured_at
- provider (string)
- markets_json
- updated_at

### Insight Objects
- `insight_type`:
- key (string)
- family (string)
- title (string)
- clarity_score (int: 50/70/90)
- description (string)
- `insight_instance`:
- id (uuid)
- match_id
- insight_type_key
- family
- headline (string)
- support_label (string)
- support_value (string)
- narrative (string)
- strength_score (int 0-100)
- relevance_score (int 0-100)
- clarity_score (int 0-100)
- total_score (int 0-100)
- created_at

## 5) Provider Adapter Interface
Implement `FootballProvider`:
- `get_leagues()`
- `get_seasons(league_id)`
- `get_fixtures(league_id, season_year)`
- `get_fixture(fixture_id)`
- `get_fixture_stats(fixture_id)` (team-level match stats)
- `get_fixture_lineups(fixture_id)` (optional, if needed for minutes/starts)
- `get_fixture_players(fixture_id)` (player match stats)
- `get_odds(fixture_id, markets)` (prematch odds snapshot)
Important rule:
- Only normalization layer can reference provider field names.
- Everything else uses internal normalized field names.

## 6) Normalized Stat Schema (MVP)
Normalize to these fields when available:

### Team match stats (per team per match)
- goals_for
- goals_against
- shots_for
- shots_against
- shots_on_target_for
- shots_on_target_against
- corners_for
- corners_against
- possession_pct (optional)
- fouls_for (optional)
- cards_yellow_for (optional)
- cards_red_for (optional)

### Player match stats (per player per match)
- minutes
- shots
- shots_on_target
- goals (optional)
- assists (optional)
If a field is missing from provider, store null and ensure feature computation handles null.

## 7) Jobs and Freshness

### Daily Cron Job (runs once per day)
1. Upsert fixtures for EPL season (full season or rolling window).
2. For fixtures that finished since last run (include 3-day buffer):
- fetch fixture stats
- fetch player stats
- upsert normalized tables
3. For upcoming fixtures (next 7-14 days):
- capture odds snapshot for supported markets (internal only)
4. Recompute features and insights:
- per team season-to-date
- per team rolling windows L5/L10/L20
- per player rolling windows L5/L10 (optional for MVP)
- per upcoming match: generate insights for feed and detail views
Freshness target:
- Within 24 hours of match completion.

## 8) Feature Computation
Compute features per team and per match using:
- Season-to-date
- Rolling windows L5/L10/L20
- Home-only and away-only splits for team metrics
Basic derived features:
- goals_per_match_for, goals_per_match_against
- total_goals_per_match (team for + against)
- btts_rate (match-level, computed from both teams recent matches)
- shots_for_per_match, shots_against_per_match
- sot_for_per_match, sot_against_per_match
- corners_for_per_match, corners_against_per_match
- control_differentials:
- shots_diff = shots_for - shots_against
- sot_diff = sot_for - sot_against
- corners_diff = corners_for - corners_against
- timing features (if provider offers goal minute data, optional):
- early_goal_rate (0-30), late_goal_rate (75+)
- half splits (1H vs 2H)
If timing data is not available from API-Football in an easy way for MVP, postpone timing insights that require it and keep the insight types but mark them disabled until supported.

## 9) Insight Engine

### Insight Families
- Goals and scoring environment
- Match control and dominance
- Corners and pressure
- Player shooting involvement
- Timing and volatility (partially enabled if timing data exists)

### Insight Catalog (50 types)

These are patterns, tendencies, and match-shape descriptors. Odds are used only to decide whether an insight is worth surfacing; they do not determine what the insight says.

For MVP:
- All goal, shots, corners, and player shots insights are enabled if data exists.
- Timing insights enabled only if we can reliably compute timing.

Each InsightType includes:
- required fields
- computation function mapping to features
- thresholds for "show-worthy" strength

#### A) Goals and scoring environment (14)

| Key | Title | Description |
|-----|-------|-------------|
| high_total_goals_environment | High total goals environment | Match-level goals trend materially above league baseline. |
| low_total_goals_environment | Low total goals environment | Match-level goals trend materially below league baseline. |
| home_goals_trending_up | Home team goals trending up | Home team scoring rate increasing vs season baseline. |
| away_goals_trending_up | Away team goals trending up | Away team scoring rate increasing vs season baseline. |
| home_goals_trending_down | Home team goals trending down | Home team scoring rate decreasing vs season baseline. |
| away_goals_trending_down | Away team goals trending down | Away team scoring rate decreasing vs season baseline. |
| btts_tendency_high | BTTS tendency high | Both teams scoring frequency elevated. |
| btts_tendency_low | BTTS tendency low | Both teams scoring frequency depressed. |
| clean_sheet_resistance | Clean sheet resistance | One or both teams rarely keep clean sheets. |
| early_goal_frequency | Early goal frequency | Goals disproportionately occur in 0–30 minute window. |
| late_goal_frequency | Late goal frequency | Goals disproportionately occur after minute 75. |
| first_half_goals_tilt | First-half goals tilt | Goals skew toward first half. |
| second_half_goals_tilt | Second-half goals tilt | Goals skew toward second half. |
| score_first_tendency | Score-first tendency | One team scores first at a materially elevated rate. |

#### B) Match control and dominance (10)

| Key | Title | Description |
|-----|-------|-------------|
| shot_dominance_edge | Shot dominance edge | Large shots-for minus shots-against differential. |
| sot_dominance_edge | Shots on target dominance edge | Large SOT-for minus SOT-against differential. |
| opponent_shots_suppressed | Opponent shots suppressed | Team consistently limits opponent shot volume. |
| big_chance_creation_proxy | Big chance creation proxy | High SOT-to-shot or goal-to-shot efficiency proxy. |
| pressure_dominance | Pressure dominance | Sustained attacking pressure indicators elevated. |
| low_event_control_match | Low event control match | Both teams produce and allow few events. |
| one_sided_match_profile | One-sided match profile | Large control differential suggests imbalance. |
| underdog_resilience_profile | Underdog resilience profile | Underdog allows limited shots despite results. |
| finishing_overperformance_flag | Finishing overperformance flag | Goals exceed shot quality proxy over time. |
| finishing_underperformance_flag | Finishing underperformance flag | Goals below shot quality proxy over time. |

#### C) Corners and pressure (10)

| Key | Title | Description |
|-----|-------|-------------|
| high_total_corners_environment | High total corners environment | Match-level corners trend above baseline. |
| low_total_corners_environment | Low total corners environment | Match-level corners trend below baseline. |
| home_corners_dominance_trend | Home corners dominance trend | Home team corners elevated vs baseline. |
| away_corners_dominance_trend | Away corners dominance trend | Away team corners elevated vs baseline. |
| opponent_corners_suppressed | Opponent corners suppressed | Team consistently limits opponent corner volume. |
| corners_spike_vs_style | Corners spike vs style | Corners increase vs certain opponent profiles (heuristic in v1). |
| first_half_corners_tilt | First-half corners tilt | Corners skew toward first half. |
| second_half_corners_tilt | Second-half corners tilt | Corners skew toward second half. |
| trailing_pressure_profile | Trailing pressure profile | Corners increase significantly when trailing. |
| leading_control_profile | Leading control profile | Corners decrease sharply when leading. |

#### D) Player shooting involvement (10)

| Key | Title | Description |
|-----|-------|-------------|
| primary_shooter_concentration | Primary shooter concentration | One player accounts for large share of team shots. |
| distributed_shooting_profile | Distributed shooting profile | No clear primary shooter. |
| player_shots_trending_up | Player shots trending up | Player shot volume increasing vs baseline. |
| player_sot_trending_up | Player shots on target trending up | Player SOT volume increasing vs baseline. |
| player_minutes_stability | Player minutes stability | Consistent starts and minutes. |
| player_role_volatility | Player role volatility | Minutes or starts fluctuate materially. |
| opponent_allows_shots_to_role | Opponent allows shots to role/position | Approximate using team-level allowances in v1. |
| player_matchup_boost | Player matchup boost | Player shot rate elevated vs similar opponents. |
| team_shot_volume_boost_spot | Team shot volume boost spot | Team context inflates all shooter volume. |
| team_shot_volume_suppress_spot | Team shot volume suppress spot | Team context suppresses shooter volume. |

#### E) Timing, volatility, and game state (6)

| Key | Title | Description |
|-----|-------|-------------|
| high_variance_match_profile | High variance match profile | Wide dispersion in totals and events. |
| low_variance_match_profile | Low variance match profile | Narrow dispersion in totals and events. |
| comeback_frequency | Comeback frequency | Team frequently recovers after conceding first. |
| concede_and_collapse_risk | Concede-and-collapse risk | Team concedes first and allows multi-goal losses. |
| scoreline_clustering | Scoreline clustering | Matches repeatedly land in narrow score bands. |
| late_chaos_profile | Late chaos profile | Late goals + late corners elevated together. |

### Display formulas

Each insight type is rendered in the UI with a **heading** (headline) and **supporting text** (one or two stats). Full templates per type live in the code catalog; this section defines the convention.

**Heading (headline)** – One short sentence that states the pattern. May include team names, window (L5/L10), and one key number.

**Supporting text** – One or two stats that back the headline. Rendered as `supportLabel`: `supportValue`. For clarity 90 use a single stat; for 70, two (e.g. "L5: 2.8 • L10: 2.4").

**Placeholders** – Templates use placeholders filled at runtime:

| Placeholder | Meaning |
|-------------|---------|
| `{home}`, `{away}` | Team names |
| `{value}`, `{l5}`, `{l10}` | Numeric values (goals, corners, etc.) |
| `{n}`, `{k}` | Counts (e.g. "4 of last 5" → k=4, n=5) |
| `{pct}` | Percentage |
| `{diff}` | Differential (e.g. +4.2) |
| `{against}` | Opponent / against value |

**Examples** (full templates in code catalog):

- **high_total_goals_environment** – Heading: "O2.5 in {k} of last {n} H2H". Support: "Goals per match (L5): {value}".
- **btts_tendency_high** – Heading: "Both sides score in {k} of last {n}". Support: "BTTS rate: {pct}%".
- **shot_dominance_edge** – Heading: "{home} shots diff +{diff} (L5)". Support: "Shots for: {l5} • against: {against}".
- **high_total_corners_environment** – Heading: "Over 10.5 corners in {k} of last {n}". Support: "Corners per match (L5): {value}".
- **primary_shooter_concentration** – Heading: "{home} rely on one shooter (L5)". Support: "Top shooter share: {pct}%".

## 10) Scoring and Ranking

### Subscores

#### Strength (0-100)
Measures pattern strength using football data only.
Method:
- Compute metric M using weighted blend:
- L5 weight 0.50
- L10 weight 0.30
- Season weight 0.20
- Compute baseline B as EPL season average for same metric (home/away split if relevant).
- z = (M - B) / stdev(EPL metric)
- strength_raw = 50 + 15*z
- clamp to 0..100
- penalties:
- sample penalty: multiply by min(1, N/10) when N < 10
- missing input penalty: multiply by 0.7 if any key inputs missing

#### Relevance (0-100)
Uses odds internally to suppress trivial insights.
If supported odds market exists for this insight:
- Convert odds to implied probability p (internal).
- relevance = strength
- triviality suppression:
- if p >= 0.92: relevance = 0
- else if p >= 0.85: relevance *= 0.2
- else if p >= 0.75: relevance *= 0.4
If no odds market:
- relevance = min(strength, 70)

#### Clarity (50/70/90)
Fixed per insight type:
- 90: one stat + one sentence
- 70: two supporting stats
- 50: needs conditions or context

### Total score
- total = 0.55*strength + 0.35*relevance + 0.10*clarity
- store as int 0..100

### Feed highlight selection (per match)
- Compute all InsightInstances for the match.
- Filter: total >= 65 (tune later).
- Sort by total desc.
- Diversity:
- max 2 insights from the same family in the top 3
- if fewer than 3 qualify, fill with next best regardless
- Select top 3.

### Match detail ranking
- Group by family.
- Sort within family by total desc.
- Hide any insight where relevance == 0.

## 11) Odds Usage Policy (Internal)
Odds may be used only for:
- relevance scoring
- triviality suppression
- optional tie-breakers during ranking
Odds may not be used for:
- UI display
- copy language about prices or implied probability
- bet recommendations
- line movement features in MVP
Markets to ingest (if available):
- match total goals (2.5, 3.5 etc)
- BTTS
- corners total
- player shots
- player shots on target
- team totals optional, if API-Football coverage is consistent
If odds are missing:
- insight still computed
- relevance capped as described

## 12) UI Spec

### Feed
- Shows upcoming EPL matches (default next 48 hours).
- Each match card includes:
- teams
- kickoff time (user timezone)
- top 3 highlights (headline + support line)
- tap to open match detail
- Optional filters:
- date range (today, next 48h, next 7d)
- team search

### Match Detail
Sections by family:
- Goals
- Control
- Corners
- Players
- Timing (if enabled)
Each section lists ranked insights.
Optionally a collapsed "raw stats" panel (feature flag) for debugging.

### Export Mode
- Shareable layout with no navigation chrome.
- Includes small Bootroom watermark.
- Stable aspect ratios:
- square (1:1) and portrait (9:16) are prioritized.
- Export:
- client-side screenshot capture or server-side render (implementation choice)

## 13) API Endpoints (App-facing)
- `GET /feed?from=...&to=...`
- returns matches with top 3 insight instances
- `GET /match/:id`
- returns match header + all insights grouped by family + selected raw stats
- `GET /teams` and `GET /players` (optional for search)

## 14) Analytics
Track events:
- feed_view
- match_open
- export_open
- export_complete
- insight_impression (type key)
- filter_change

## 15) Post-launch Plan (vNext)

### Monte Carlo Simulation
Not required for MVP.
Prepare by:
- storing feature vectors per match and per team as a single JSON blob or wide table
- ensuring features are stable and versioned by `data_version`
When implemented:
- simulation becomes its own family
- simulation outputs do not change odds usage policy
- still no odds shown

## 16) Migration and Provider Swap Strategy
Design now to make later changes easy:
- provider adapter interface
- strict normalization into internal schema
- insight engine reads only normalized fields
- baseline computations versioned by `data_version`:
- "api_football_v1"
- later "sportmonks_v1" or "hybrid_v1"
Supplement plan:
- keep API-Football for fixtures and core stats
- optionally add Sportmonks for advanced stats later
- choose best available metric per field with explicit precedence rules
}