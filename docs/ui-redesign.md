# UI Redesign: Betting Edge Focus

## Summary

Comprehensive UI/UX redesign to transform the app into a scannable, actionable betting edge tool. Restructured visual hierarchy, surfaced +EV signals at the feed level, and made the Monte Carlo sim page lead with value.

## Implementation

### Phase 1: Foundation
- **Dark mode default**: Already configured in `layout.tsx` (defaults to dark)
- **Typography hierarchy**: Added `.text-headline`, `.text-primary-data`, `.text-secondary-data` classes in `globals.css`
- **Color system**: Added CSS variables for EV badges, score colors, and bar chart colors
- **Date picker**: Increased inactive date opacity to 60% for better visibility

### Phase 2: Feed-level +EV Signals
- **Model probabilities computation**: Created `lib/modeling/feed-model-probs.ts` for on-demand, cached model probability computation
- **MatchCard redesign**:
  - Entire card is now tappable (wrapped in Link)
  - +EV badges displayed in header when available
  - Combined scores right-aligned with prominent styling (20-24px, bold, color-coded)
  - Form display component with labels ("Home form" / "Away form")
  - Market rows hierarchy: BTTS/O2.5 primary (15px), Corners secondary (12px, 60% opacity)
  - SIM link styled as outlined pill badge with teal border
- **Feed integration**: Updated `lib/build-feed.ts` to compute model probabilities for each match

### Phase 3: Monte Carlo Sim Page Restructure
- **Information architecture reordered**:
  1. Header (match teams, sim runs count)
  2. **Model vs Market** (moved to top, primary treatment with background)
  3. 1X2 probabilities
  4. Goals markets
  5. Top scorelines (with bar chart)
  6. Expected goals (with visual spread showing delta)
  7. Supporting data (collapsible details section)
- **Visual enhancements**:
  - EVBadge components for +EV flags
  - ScorelineBarChart component for top scorelines
  - Implied odds display (decimal format) alongside probabilities
  - Expected goals delta highlighted in color

### Phase 4: Match Details Improvements
- **MarketSnapshot**: Combined scores elevated to 20-24px, bold, monospaced, color-coded (green for 7+/10, red for 0-3)
- **StatTrendChart**: 
  - Bars above average use warmer color (`--color-bar-above-avg`)
  - Bars below average use muted color (`--color-bar-below-avg`)
  - Opponent labels use 3-letter abbreviations via `getTeamAbbreviation`
- **DeepStats**: Updated label to "Deep stats: xG, shot maps, possession +"

### Phase 5: Supporting Components
- **Team abbreviations**: Created `lib/teams/abbreviations.ts` with mapping for EPL teams
- **FormDisplay**: New component replacing inline FormSummary with labels and hover tooltips
- **EVBadge**: Component for displaying +EV and STRONG +EV badges
- **ScorelineBarChart**: Horizontal bar chart for top scorelines
- **MatchActions**: Share button component (foundation for future actions)
- **Odds display utilities**: `lib/modeling/odds-display.ts` for converting probabilities to decimal odds

## Files Created
- `lib/modeling/feed-model-probs.ts`
- `app/components/EVBadge.tsx`
- `app/components/ScorelineBarChart.tsx`
- `app/components/MatchActions.tsx`
- `app/components/FormDisplay.tsx`
- `lib/modeling/odds-display.ts`
- `lib/teams/abbreviations.ts`

## Files Modified
- `app/components/MatchCard.tsx` (major restructure)
- `app/match/[id]/sim/page.tsx` (reorder sections, add badges/charts)
- `app/components/MarketSnapshot.tsx` (visual hierarchy)
- `app/components/StatTrendChart.tsx` (bar colors, abbreviations)
- `app/components/DeepStats.tsx` (teaser text)
- `app/components/DateScrubber.tsx` (inactive opacity)
- `app/globals.css` (typography hierarchy, color system)
- `lib/build-feed.ts` (add model probs computation)
- `lib/feed.ts` (extend FeedMatch interface)
- `app/match/[id]/page.tsx` (update FormDisplay usage)

## Key Features
1. **+EV signals at feed level**: Model probabilities computed on-demand, +EV badges shown in match cards
2. **Scannable visual hierarchy**: Combined scores prominently displayed, color-coded for quick scanning
3. **Model vs Market prominence**: Sim page leads with model vs market comparison
4. **Implied odds**: Decimal odds displayed alongside probabilities
5. **Improved form display**: Clear labels and hover tooltips
6. **Better chart visuals**: Color-coded bars, team abbreviations, bar charts for scorelines

## Technical Notes
- Model probabilities are cached per match ID to avoid recomputation
- Lightweight simulation (10k runs) for feed-level computation
- EV threshold set at 3% (configurable via `EV_THRESHOLD`)
- Color system uses CSS variables for easy theme customization
- Typography hierarchy uses monospace font for data consistency
