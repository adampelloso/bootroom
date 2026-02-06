# Testing Guide: Prediction Engine

## Quick Start

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Open the app** at `http://localhost:3000`

3. **Navigate to a match**:
   - The feed shows upcoming EPL matches (if you have API-Football data)
   - Click any match card → opens match detail page
   - Click the **`SIM →`** link in the match card header → opens `/match/[id]/sim`

## What to Test

### 1. **Calibration Working**
On `/match/[id]/sim`, check:
- **Model probabilities** (Home/Draw/Away, O2.5) should be **calibrated** (not raw Poisson)
- Compare to historical: if model says 45% home win, calibrated should adjust toward empirical frequency

### 2. **Model vs Market Comparison**
If odds data exists for the match:
- **"Model vs market" section** should appear below the main probabilities
- Format: `Model / Market` (e.g., "45.2% / 43.1%")
- **[+EV]** tags should highlight outcomes where blended model edge > 3%

### 3. **Odds Blending**
- When market odds are available, the displayed probabilities should be **blended** (model + market weighted by confidence)
- Without odds, it falls back to calibrated model-only probabilities

### 4. **As a Bettor: Does This Help?**
Ask yourself:
- Are the probabilities **reasonable** vs what you'd expect?
- Do the **[+EV]** flags align with your intuition on value?
- Is the **edge calculation** (model vs market) meaningful?
- Would you trust these signals to make betting decisions?

## Prerequisites

### Required
- **API-Football key** in `.env` (`API_FOOTBALL_KEY=...`)
- **Match data**: The app fetches fixtures from API-Football automatically

### Optional (for full testing)
- **Odds data**: Run `python scripts/ingest-odds.py --competition epl` to fetch current odds
  - This populates `data/odds/epl/upcoming_YYYYMMDD.json`
  - The sim page will automatically find and use these odds if available

## Troubleshooting

### "No sufficient historical data" on sim page
- The match needs both teams to have enough past matches in the ingested data
- Check `data/epl-2025-fixtures.json` (or your season file) has finished matches

### No "Model vs market" section
- Odds data not found for this match
- Run `python scripts/ingest-odds.py --competition epl` to fetch latest odds
- The app matches odds by team names + kickoff time (within 2 hours tolerance)

### Probabilities look wrong
- Check calibration data exists: `lib/modeling/calibration-data.json` should be present
- If missing, run: `python python/calibrate_probs.py --backtest-file data/backtests/epl-2020-baseline.csv`

## What's Actually Running

- **Baseline model**: Simple Poisson with league-normalized attack/defence + recent form
- **Calibration**: Isotonic regression fitted on EPL 2020 backtest
- **Blending**: Simple confidence-weighted average (model + market)
- **EV threshold**: 3% probability edge (configurable in sim page code)

## Next Steps After Testing

If you find issues or want improvements:
1. **Calibration quality**: Run `python python/monitor_calibration.py` to see Brier scores
2. **Feature depth**: The model is intentionally simple; we can add richer features
3. **EV thresholds**: Currently hardcoded at 3%; can tune based on your feedback
4. **More markets**: Currently 1X2 and O2.5; can add BTTS, team totals, etc.
