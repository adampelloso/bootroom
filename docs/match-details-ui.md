# Match Details UI Improvements

## Changes

### 1. H2H View Redesign
- **2-column comparison table**: The H2H tab now shows a side-by-side comparison of home vs away team stats
- **Category filtering**: The comparison table filters stats based on the selected category (All, Goals, Shots, Corners, etc.)
- **Stats shown**:
  - **All**: Goals for/against, Shots for/against, SOT for/against, Corners for/against, BTTS matches, Clean sheets
  - **Goals**: Goals for, Goals against
  - **Control (Shots)**: Shots for/against, SOT for/against
  - **Corners**: Corners for/against

### 2. Period Toggle
- **New component**: `PeriodToggle` - a toggle switch for selecting L5, L10, or Season
- **Applied to all stats tables**:
  - Single team stats (Home/Away tabs)
  - Recent form comparison
  - H2H comparison table
- **Replaces**: The old "L5 / L10" display format with a cleaner toggle interface

### 3. Season Stats Support
- **Added season averages**: Extended `TeamRollingStats` to include `season` stats
- **Computation**: Season stats compute averages across all matches in the season (up to the fixture date)
- **Updated**: `getTeamStats()` now returns L5, L10, and Season stats

## Components

- **`PeriodToggle.tsx`**: New toggle component for selecting period (L5/L10/Season)
- **`H2HComparisonTable`**: New component showing 2-column comparison filtered by category
- **Updated**: `SingleTeamStatsSection`, `RecentFormComparison` to use period toggle

## Technical Notes

- Period toggle uses the same sliding indicator pattern as the Home/H2H/Away tabs
- Each stats table maintains its own period state independently
- Season stats are computed by passing `filtered.length` to `computeRolling()` to get all-season averages
