# Insight Period UX and Detail Tabs

## Summary

Period terminology standardised, period moved to far right of each insight, feed cards show form dots and H2H teaser, and match detail tabs restructured to Home | H2H | Away.

## Changes

### Period terminology
- **L5** – One team's last 5 matches
- **L10** – One team's last 10 matches
- **Combined L5** / **Combined L10** – Both teams' L5/L10 aggregated
- Period shown on the right of each insight; templates no longer embed period text

### Feed card
- **Form dots** – Red/green/gray dots for L5 results (W/D/L), two rows per match
- **H2H teaser** – "Last 5 H2H: 3-1-1 (Liverpool)" when H2H data exists

### Detail view
- **Home** – Home team rolling stats (L5/L10), insights, top scorers
- **Away** – Away team rolling stats, insights, top scorers
- **H2H** – Past H2H fixture list, recent form comparison (side-by-side goals, shots, corners)

### Provider
- `getH2HFixtures(homeTeamId, awayTeamId, options?)` added to FootballProvider
- API-Football: `/fixtures/headtohead?h2h={id1}-{id2}&league=39&last=20`
- Mock provider returns sample Arsenal vs Man Utd H2H

### Data flow
- **Form dots**: `getTeamRecentResults(teamName, 5, fixtureDate)` from ingested fixtures
- **H2H teaser**: `getH2HFixtures` per match when building feed; summary derived from response
- **Detail H2H**: `getH2HFixtures` on match page load; passed to tabs
