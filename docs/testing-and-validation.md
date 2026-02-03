# Testing and Validation

This project does not yet have automated tests. Use these checks before review.

## UI streams
- Open the feed view and verify:
  - Sticky header works; matches scroll.
  - Match cards render GMT + stadium.
  - Highlights show; first is inverse with KEY INSIGHT label.
- Match detail:
  - Header uses GMT + venue + stacked team names.
  - Insights render by family.
- Export:
  - Matches feed typography.
  - No bullet artifacts or legacy styling.

## Insights streams
- Templates render without placeholder leaks.
- All highlights are objective and numeric.
- Feed pool excludes player props.
- Detail can include player props.

## Data streams
- Mock provider still returns valid data.
- No dependency on live API keys.
- TypeScript builds succeed.

## Manual sanity checks
- `npm run dev` loads feed without errors.
- Random highlights appear in each match.

## Real data snapshot
If `.env` contains API_FOOTBALL_KEY, run:
```
node scripts/season-snapshot.mjs --league=39 --season=2025
```
This outputs L5/L10/season goal summaries for the EPL season.
