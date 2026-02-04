# Real Data Insights

## Summary

Insights now use **real L5/L10 data** from ingested fixtures when available. Single-line format, coherent selection, and rolling form table in match detail.

## Changes

### Phase 1: Team Rolling Stats
- **`lib/insights/team-stats.ts`** – Loads `data/epl-2025-fixtures.json`, computes L5/L10 per team (goals, shots, SOT, corners, BTTS, clean sheets). Exposes `getTeamStats()`, `getMatchStats()`, `clearTeamStatsCache()`.

### Phase 2: Single-Line Format
- **Catalog** – All insight templates simplified to one line; `supportLabel`/`supportValue` removed for feed.
- **MatchCard** – Renders only `headline` per highlight (no second line).

### Phase 3: Real Context
- **`lib/insights/real-context.ts`** – `buildRealContext(matchStats, insightType, homeTeamName, awayTeamName)` fills templates with real values.
- **`lib/build-feed.ts`** – Uses real context when ingested data exists; falls back to stub when missing.

### Phase 4: Coherent Selection
- **`lib/insights/select.ts`** – Avoids contradictory pairs: BTTS high vs low, high vs low total goals, high vs low corners.

### Phase 5: Detail View
- **Match detail** – "Rolling form (L5 / L10)" section in Overview tab: goals for/against, shots for/against, corners, BTTS per team.

## Data Flow

```
data/epl-2025-fixtures.json
  → team-stats.ts (load, compute L5/L10 per team)
  → buildRealContext (per insight type)
  → fillInsightTemplate
  → Feed / Match Detail
```

## Fallback

When ingested data is missing (no JSON, team not found, or fixture date before any history), insights use `buildStubContext` with deterministic fake values.
