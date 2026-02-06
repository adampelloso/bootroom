# Plan: Gather Historical Data for All Leagues

## Problem

The app only has fixture data for **EPL** (2020 and 2025). Form, L5/L10, market rows, and the goal model all depend on ingested fixtures. For other leagues (Bundesliga, La Liga, Serie A, Ligue 1, UCL, UEL, domestic cups) we have no data, so:

- `getTeamStats(teamName, ..., { leagueId })` returns **null** for teams in those leagues.
- Match cards and match detail show no form, no market rows, and “No sufficient historical data” for sim.

We need to ingest **past seasons** for every supported competition so that form, stats, and model have enough history per league.

---

## What “enough” means

| Use case | Minimum data |
|----------|----------------|
| **Form (W-D-L)** | At least 1 completed season so L5/L10 can be computed for most teams. |
| **Market rows (BTTS, O2.5, Corners)** | Same: last 5 home / 5 away per team → need a full season. |
| **Model lambdas** | `estimateMatchGoalLambdas` uses team L5 + season stats and `getLeagueGoalAverages()`. Need enough matches per team (and per league) for stable averages. |
| **Sensible defaults** | 1 full season is the bare minimum; **2–3 seasons** per league is better (form and league averages are more stable). |

So the target is: **at least 2 completed seasons** per league (e.g. 2023 and 2024 for Big 5 and European cups), plus the current season (2025) which ingest-daily can keep updated.

---

## Data we have today

| File | League | Season |
|------|--------|--------|
| `epl-2020-fixtures.json` | EPL (39) | 2020 |
| `epl-2025-fixtures.json` | EPL (39) | 2025 |

New ingest writes `{leagueId}-{season}-fixtures.json` (e.g. `39-2025-fixtures.json`). So we have EPL history only; all other competitions have **no** fixture files.

---

## Target: what to ingest

### Priority 1 – Big 5 leagues (form + model for league matches)

One file per (league, season). Suggested seasons: **2023**, **2024**, and optionally **2025** (if not already run).

| League ID | Label | Seasons to add |
|-----------|--------|-----------------|
| 39 | EPL | 2023, 2024 (we have 2020, 2025) |
| 78 | Bundesliga | 2023, 2024, 2025 |
| 135 | Serie A | 2023, 2024, 2025 |
| 140 | La Liga | 2023, 2024, 2025 |
| 61 | Ligue 1 | 2023, 2024, 2025 |

### Priority 2 – European cups (UCL, UEL, UECL)

Fewer matches per season; 2 seasons is enough for form.

| League ID | Label | Seasons to add |
|-----------|--------|-----------------|
| 2 | UCL | 2023, 2024 (and 2025 when available) |
| 3 | UEL | 2023, 2024, 2025 |
| 848 | UECL | 2023, 2024, 2025 |

### Priority 3 – Domestic cups

Optional; form in cups is “this competition” so having 1–2 seasons helps.

| League ID | Label | Seasons to add |
|-----------|--------|-----------------|
| 48 | FA Cup | 2023, 2024, 2025 |
| 45 | EFL Cup | 2023, 2024, 2025 |
| 137 | Coppa Italia | 2023, 2024, 2025 |
| 143 | Copa del Rey | 2023, 2024, 2025 |
| 62 | Coupe de France | 2023, 2024, 2025 |
| 81 | DFB-Pokal | 2023, 2024, 2025 |

---

## How to run the ingest

### Tool: `scripts/season-ingest.mjs`

- **`--league=<id>`** – single league (e.g. `39`).
- **`--season=<year>`** – season year (e.g. `2024`).
- **`--all`** – run for all `ALL_LEAGUE_IDS` in one go (same season for all).
- **`--delay=<ms>`** – delay between API calls (default 5000). Use to respect rate limits.
- **`--skipPlayers`** – do not fetch `/fixtures/players`; halves calls per fixture and is enough for form/stats/model.
- **`--limit=<n>`** – cap number of fixtures (useful for testing).

Output: `data/{leagueId}-{season}-fixtures.json` (e.g. `78-2024-fixtures.json`).

### Rate limits and runtime

- API-Football: typically **~10 requests/minute** on free tier; paid tiers higher. Each fixture costs **2 calls** with `--skipPlayers` (fixtures list + statistics), **3** without.
- A full Big 5 season is ~380 finished fixtures → **~760 calls** with `--skipPlayers` → at 2 calls/min, **~6+ hours per league per season**. With 5s delay (12 calls/min) you stay under 10/min.
- So: run in batches (e.g. one league+season per run, or one season for `--all`), and use **`--skipPlayers`** for historical backfill to save time and quota.

### Suggested order of runs

1. **Big 5, one season at a time for all** (so we quickly get “something” for every league):

   ```bash
   node scripts/season-ingest.mjs --all --season=2024 --delay=5000 --skipPlayers
   ```

   Then repeat for `--season=2023` (and optionally `2025` if you want more depth).

2. **Or league-by-league** (easier to resume if a run fails):

   ```bash
   for season in 2023 2024; do
     for league in 39 78 135 140 61; do
       node scripts/season-ingest.mjs --league=$league --season=$season --delay=5000 --skipPlayers
     done
   done
   ```

3. **European cups** (same idea):

   ```bash
   for season in 2023 2024; do
     for league in 2 3 848; do
       node scripts/season-ingest.mjs --league=$league --season=$season --delay=5000 --skipPlayers
     done
   done
   ```

4. **Domestic cups** last (smaller priority; fewer matches per season).

---

## Optional: batch script

To make backfill repeatable and resumable, add a small wrapper (e.g. `scripts/backfill-historical.sh` or `scripts/backfill-historical.mjs`) that:

- Takes a list of `(leagueId, season)` pairs (or reads from a config/manifest).
- For each pair, runs `season-ingest.mjs` with `--league` and `--season` (and `--skipPlayers`, `--delay`).
- Skips pairs for which `data/{leagueId}-{season}-fixtures.json` already exists (optional “resume”).
- Logs progress and failures.

That way you can run “backfill Big 5 + UCL/UEL/UECL for 2023 and 2024” in one go overnight.

---

## Verification

After ingesting:

1. **Files**  
   Check that `data/` contains e.g. `39-2024-fixtures.json`, `78-2024-fixtures.json`, etc., and that each file has a reasonable number of fixtures (e.g. 300+ for Big 5, 100+ for UCL).

2. **App**  
   - Open feed, filter to e.g. “Bundesliga” or “La Liga”; select a match.  
   - Match detail should show form, market rows (BTTS/O2.5/Corners), and sim should run (no “No sufficient historical data”).

3. **Team stats**  
   In code or a small script: call `getTeamStats(teamName, undefined, { leagueId: 78 })` for a Bundesliga team; should return non-null L5/L10/season.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Ingest **2023 and 2024** (and 2025 if desired) for **Big 5** (39, 78, 135, 140, 61) with `--skipPlayers`. |
| 2 | Ingest same seasons for **UCL, UEL, UECL** (2, 3, 848). |
| 3 | Optionally ingest **domestic cups** (48, 45, 137, 143, 62, 81) for 2023/2024/2025. |
| 4 | Use `--delay=5000` (or per your API plan) and run in batches or via a small backfill script. |
| 5 | Verify with file list + one league in the UI + one `getTeamStats` check. |

Once this is done, form, market rows, and the model will have enough historical data for all supported leagues.
