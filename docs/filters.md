# Filters

## What changed

- **Swapped filter emphasis on the feed**:
  - **League** is now a single pill dropdown in the header (instead of a row of league pills).
  - **Date** is now a horizontal scrubber strip you can scroll left/right and tap to navigate.

## League filter

- Implemented as `LeagueFilterPill` (`app/components/LeagueFilter.tsx`)
- Options:
  - **All leagues** (`league=all`) aggregates across all leagues in `SUPPORTED_LEAGUES`
  - Individual leagues (`league=<id>`)

## Date scrubber

- Implemented as `DateScrubber` (`app/components/DateScrubber.tsx`)
- Shows a 21-day window centered on the selected date and auto-scrolls the selected day into view.

## Data flow

- Feed supports multi-league aggregation via `getFeedMatches(from, to, leagueIds)` in `lib/build-feed.ts`
- API route `/api/feed` accepts `league=all` or `league=39,78,...`

