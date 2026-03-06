# Large-Sample Model Audit (2026-03-06)

## Scope
- Historical backtest across local fixture data: **14,073 matches**, **26 leagues**.
- Odds-linked calibration QA: **391 finished fixtures with stored odds** (provider coverage-limited).
- Goal: find where the model is weak, tune conservatively, avoid overcorrecting noise.

## What Was Tuned
- Regenerated global probability calibration curves from the 14,073-match backtest:
  - `lib/modeling/calibration-data.json`
- Re-ran the full backtest and odds-linked QA after calibration refresh.

## Backtest Before vs After (14,073 matches)
- 1X2 Brier: **0.208 -> 0.207** (improved)
- 1X2 Accuracy: **47.8% -> 48.0%** (improved)
- BTTS Brier: **0.248 -> 0.247** (improved)
- BTTS Accuracy: **53.9% -> 54.3%** (improved)
- O2.5 Brier: **0.248 -> 0.247** (improved)
- O2.5 Accuracy: **53.5% -> 54.0%** (improved)

## Where Model Falls Short (Large Sample)

### 1) Weak 1X2 performance in specific leagues
Worst 1X2 Brier leagues (n>=200) from the 14,073-match backtest:
- Ligue 2 (62)
- Austrian BL (218)
- Ekstraklasa (106)
- Swiss Super League (207)
- League One (41)
- League Two (42)
- Segunda Div. (141)

Interpretation:
- This points to **league-specific misspecification** (pace/style/variance differences) rather than a global model failure.

### 2) Overconfidence in high-probability tails
From 14,073-match calibration buckets:
- Home win 60-70% bin: predicted 64.8%, actual 60.1% (before), and still mildly noisy in high bins after update.
- O2.5 60-80% bins were also slightly overconfident before; improved after refresh but tail sample sizes are small.

Interpretation:
- The engine is mostly calibrated in the core 40-60% range, but **tail confidence needs careful shrinkage**.

### 3) Odds-linked edge overconfidence pockets (coverage-limited sample)
From 391-fixture odds-linked QA, edge>=4% still shows overconfidence in several league+market cells.
Examples:
- L62 O2.5
- L61 A
- L136 H
- L207 A

Interpretation:
- Some displayed "value edges" are still too aggressive where league+market sample is thin/noisy.

## Odds Coverage Constraint (Important)
- API-FOOTBALL odds coverage is strong for very recent windows but sparse for older finished fixtures.
- That limits book-vs-model historical edge validation depth today.
- This is a data coverage constraint, not only a modeling constraint.

## Conservative Tuning Plan (Next)
1. Keep this new global calibration (it improved all key aggregate metrics).
2. Add league+market reliability weighting for edge display:
   - shrink edge toward 0 when historical league+market sample is small or unstable.
3. Add confidence tiers for displayed edge:
   - High confidence: stable sample + low calibration error.
   - Medium/Low confidence: unstable cells.
4. Continue odds backfill forward in time (daily snapshots) to build a larger book-linked validation set.

## Bottom Line
- The model is directionally solid at aggregate level and improved after this tuning pass.
- Largest gaps are **league-specific 1X2 behavior** and **overconfident edge pockets in thin samples**.
- Next gains should come from **reliability-weighted edge presentation**, not aggressive probability distortion.
