# Feed UI reference design (current)

This reflects the current feed UI styling and layout in `app/page.tsx` + `app/components/MatchCard.tsx`.

## Visual language
- **Fonts**: Inter (400–600) + JetBrains Mono (400–500).
- **Container**: max-width 480px, centered, **full black border on all sides**, with a small vertical margin to avoid touching the browser edges.
- **Palette**: black + off-white/gray surfaces, minimal chroma.

## Feed layout
- **Sticky header**: stays fixed while matches scroll.
  - Left: “Match Feed” title.
  - Right: Date navigator (prev/next + tap to open calendar).
- **League filters**: EPL/Bundesliga/Serie A/La Liga/Ligue 1 pills under the header.
- **Divider**: full-width black top border before the first match.
- **Matches**: only the list scrolls; header and filters remain visible.

## Match card layout
- **Top meta row**: GMT time (left) + stadium name (right), mono uppercase.
- **Team names**: large stacked uppercase names (no “vs” line).
- **Chevron**: right-facing chevron in a circle links to match detail.
- **Divider**: full-width **black** border between matches.

## Highlights
- All highlights show by default.
- First highlight is **inverse** (black background, white text) with **KEY INSIGHT** eyebrow.
- Support line uses `supportLabel: supportValue` only (no odds in UI).
