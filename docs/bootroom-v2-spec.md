# BOOTROOM UI SPEC v2.0
## Visual Design Overhaul + Odds Integration
### March 2026

---

## 1. WHERE WE ARE

The UX audit (v1) restructured the information architecture. The developer shipped it: seven tabs (Overview, Goals, Shots, Corners, Cards, Players, Simulation), hero panels on each tab, form tables replacing dots, scoreline heatmaps, threshold bars, the unified player table. The bones are right.

But the product doesn't yet match the tagline. "The beautiful game deserves beautiful data" sets an expectation that the current UI doesn't deliver. It reads as functional wireframes with real data, not as a designed product. The typography is flat, the spacing is mechanical, the charts feel auto-generated, and mobile is cramped.

This spec covers two things:

1. A visual design overhaul that transforms the current implementation into something people screenshot and share.
2. Odds integration that contextualizes every simulation output against real bookmaker lines, turning Bootroom from "interesting data" into "actionable intelligence."

---

## 2. ODDS API INTEGRATION

### 2.1 Provider Recommendation

**The Odds API** (the-odds-api.com) is the clear choice.

Why: free tier with 500 requests/month (enough to prototype and test), paid plans start at $25/month for 20K requests, covers all major soccer leagues (EPL, La Liga, Serie A, Bundesliga, Ligue 1, Championship, EFL, MLS, Champions League, Europa League), returns data from 50+ bookmakers (Bet365, Pinnacle, Unibet, William Hill, Betfair, DraftKings, FanDuel), simple REST API with JSON responses, supports h2h (1X2), totals (over/under), and spreads markets.

Sport keys for Bootroom's leagues: `soccer_epl`, `soccer_efl_champ`, `soccer_spain_la_liga`, `soccer_italy_serie_a`, `soccer_germany_bundesliga`, `soccer_france_ligue_one`, `soccer_usa_mls`, `soccer_uefa_champs_league`, `soccer_uefa_europa_league`, and more.

Alternatives considered:
- **API-Football** (api-football.com): Already in use for match data. Also provides pre-match odds. Could be simpler since match IDs would already be mapped. Worth checking if the odds coverage is sufficient before adding a second API dependency. Free plan includes odds endpoints.
- **odds-api.io**: 100 free requests/hour, covers 250+ bookmakers and 12K+ leagues. More expensive at scale but deeper coverage.

**Recommendation**: Check API-Football's odds endpoint first since you're already using their data pipeline. If the odds coverage and market depth is adequate (1X2, O/U 2.5, BTTS at minimum), use it. If not, add The Odds API as a secondary source. Either way, the integration is straightforward: fetch odds once per fixture per day (or on page load with caching), convert decimal odds to implied probability, display the delta against your simulation output.

### 2.2 Data Architecture

For each fixture, fetch and store:

```
{
  fixture_id: "...",
  odds_updated_at: "2026-03-03T14:00:00Z",
  bookmaker: "bet365",  // or consensus/average
  markets: {
    h2h: {
      home_win: { decimal: 2.10, implied: 47.6% },
      draw:     { decimal: 3.40, implied: 29.4% },
      away_win: { decimal: 3.50, implied: 28.6% }
    },
    totals: {
      over_0_5:  { decimal: 1.08, implied: 92.6% },
      over_1_5:  { decimal: 1.36, implied: 73.5% },
      over_2_5:  { decimal: 1.91, implied: 52.4% },
      over_3_5:  { decimal: 2.75, implied: 36.4% },
      over_4_5:  { decimal: 5.00, implied: 20.0% }
    },
    btts: {
      yes: { decimal: 1.72, implied: 58.1% },
      no:  { decimal: 2.10, implied: 47.6% }
    }
  }
}
```

**Implied probability formula**: `1 / decimal_odds * 100`

Note: Bookmaker implied probabilities sum to >100% due to the vig/overround. Bootroom should display the raw implied probability (not normalized) because the overround IS part of the story. When your model says 68% and the book implies 52.4%, that gap includes both genuine edge AND the vig. Users understand this.

### 2.3 The Edge Display

This is the core value add. Everywhere Bootroom shows a simulation probability, show the bookmaker implied probability next to it with the delta.

**Format**: `MODEL 68% | BOOK 52% | +16% EDGE`

Color coding:
- Edge > +10%: strong green highlight (high perceived value)
- Edge +5% to +10%: subtle green
- Edge -5% to +5%: neutral/gray (market roughly agrees)
- Edge < -5%: subtle red (model disagrees with market, or market sees something model doesn't)

This display should appear on:
- **Match cards** (match feed): Show the single highest-edge market for each fixture as a badge. "O2.5 +16% EDGE" in small text beneath the existing stats. This becomes the hook that makes people click into the match detail.
- **Overview tab**: In the Match Pulse hero section, show edge for the top 3 markets (1X2, O2.5, BTTS).
- **Simulation tab**: Full edge comparison table across all markets. This is where the complete picture lives.
- **Daily content generation**: The match with the highest single-market edge becomes today's "Best Edge" social post.

### 2.4 Request Budget

With The Odds API at $25/month (20K requests):
- 10 leagues x 1 request per league per day = 10 requests/day
- Each request returns all fixtures + odds for that league
- 10 requests x 30 days = 300 requests/month
- That's 1.5% of the 20K budget. Plenty of headroom for caching refreshes, additional market pulls, or scaling to more leagues.

If using API-Football's built-in odds, even simpler: odds come as part of the existing fixture data pipeline.

---

## 3. VISUAL DESIGN OVERHAUL

### 3.1 The Problem

Looking at the current screenshots, here's what's holding the product back visually:

**Landing page**: The layout is correct but the execution is flat. The dark background is right for the brand but every element sits at the same visual depth. The match preview cards look like wireframe components, not polished product UI. The feature descriptions (Match Feed, Simulation Engine, Deep Analysis) are plain bullet lists with no visual differentiation. The pricing cards lack hierarchy. Mobile stacks everything vertically with no adaptation of spacing or typography.

**Match feed**: The card grid works on desktop. The data density per card is good. But the cards are visually monotonous. Every card is identical in weight and treatment. There's no way to scan and identify the "interesting" matches at a glance. The league filter pills at the top are functional but bland. Mobile squeezes the same card layout into a narrow column, making the data hard to scan.

**Match detail (Overview)**: The Match Pulse hero is a good addition from v1. But the numbers (2.78 total xG, 49% O2.5, 58% BTTS, 1-1 top scoreline) all sit at the same size and weight. The form table is an improvement over dots but reads as a generic HTML table. The Total Goals chart has the right data but the bars are utilitarian, not designed.

**Match detail (Goals, Shots, Corners)**: Wall of charts problem from v1 is improved but not solved. Charts still use the same blue/gray palette with no visual hierarchy between primary and supporting data. Section headers (TOTAL GOALS, BTTS, TEAM TOTALS) are all uppercase monospace at the same size. Nothing guides the eye.

**Cards tab**: The cleanest tab. Discipline Snapshot hero panel works well. Team Card History is readable. Card Thresholds with progress bars are effective. This tab is closest to the target quality.

**Players tab**: Key Players cards at the top are a good concept but the cards themselves are plain. The unified projections table below is data-dense and functional but visually overwhelming. On mobile, the table becomes unreadable with columns getting cut off.

**Simulation tab**: Win Probability with the stacked bar is the strongest visual element in the entire product. Markets section is a raw data dump. The scoreline heatmap has the right concept but the execution (plain gray cells with numbers) undersells what should be the most visually impressive feature.

### 3.2 Design System Refinements

The terminal aesthetic is correct. Don't change it. But refine it.

**Typography upgrade**:
- Primary display: Keep the monospace for headers, labels, and key figures. But pick a specific, high-quality monospace. **JetBrains Mono** or **IBM Plex Mono** over generic system monospace. These have better readability at small sizes and more character.
- Body/data: **IBM Plex Sans** or **DM Sans** for table body text, player names, descriptions. These pair naturally with their monospace siblings and are highly legible at small sizes in data-dense contexts.
- Hero numbers: The big metrics in Match Pulse (2.78 xG, 49%, etc.) should be oversized, bold monospace. 36-48px on desktop, 28-36px on mobile. These are the 2-second glance numbers.
- Sizing hierarchy: Display (hero numbers) 36-48px. Section headers 13-14px uppercase monospace with generous letter-spacing (0.1em). Table headers 10-11px uppercase monospace. Table body 13-14px proportional. Small labels 10-11px.

**Color system**:
- Background layers: Surface 0 (page): `#0A0A0A`. Surface 1 (cards/panels): `#111111`. Surface 2 (elevated/hover): `#1A1A1A`. Surface 3 (active/selected): `#222222`. This creates subtle depth without visible borders.
- Primary data: `#3B82F6` (blue, slightly brighter and more saturated than the current blue). This is the home team / primary stat color.
- Secondary data: `#64748B` (slate gray). Away team / comparative data.
- Edge positive: `#22C55E` (green). For positive edge values and "value" indicators.
- Edge negative: `#EF4444` (red). For negative edge and caution indicators.
- Accent: `#F59E0B` (amber). For highlighted data points, "best edge" badges, featured content.
- Text primary: `#F1F5F9` (near-white, slightly cool).
- Text secondary: `#94A3B8` (muted slate). For labels, secondary info, timestamps.
- Text muted: `#475569` (dark slate). For tertiary info, disabled states.
- Win/Draw/Loss: W `#22C55E`, D `#F59E0B`, L `#EF4444`. Already in use, keep them.

**Borders and dividers**:
- Eliminate most borders. Use background color shifts between Surface 0/1/2 to create separation.
- Where lines are needed (table rows, section dividers), use `#1E293B` at 1px. Very subtle.
- Active tab indicator: 2px bottom border in primary blue.

**Border radius**:
- Cards and panels: 8px. Not too rounded, not too sharp. Feels intentional without being soft.
- Buttons: 6px.
- Badges/pills: Full radius (rounded-full) for status labels, edge indicators.
- Charts: 4px on bar tops only (flat bottom, slightly rounded top).

**Shadows and elevation**:
- No box shadows. The dark theme doesn't benefit from them. Use background color layers exclusively for depth.

### 3.3 Landing Page Redesign

**Hero section**:
- Tagline stays: "The beautiful game deserves beautiful data"
- Subtext stays: "100K simulations per match powered by 2K+ data points"
- Add a subtle animated gradient mesh behind the hero text. Very low opacity (5-8%), slowly morphing. Colors from the primary/accent palette. This adds life without being distracting.
- The CTA button ("Start free trial") should have a subtle glow effect on hover (box-shadow with primary blue at low opacity).

**Match preview cards**:
- These are the product's first impression. They need to look sharper than anything else on the page.
- Add a subtle top border (2px) in the primary blue to give each card a "lit" edge.
- The xG, O2.5, BTTS badges should have slightly more visual punch. The percentage badges are good but make them larger (not just small green/red pills). Think: each badge is a mini data visualization, not a label.
- **Add the edge badge here**. Below the top scorelines, show: "BEST EDGE: O2.5 +16%" in a small amber badge. This is the hook.

**Feature blocks** (Match Feed, Simulation Engine, Deep Analysis):
- Replace bullet lists with icon + short description pairs.
- Each block should have a unique accent color or subtle icon treatment.
- "Model vs. bookmaker edge detection" should be the FIRST bullet under Simulation Engine, not the last. This is now a headline feature.

**Pricing**:
- The two-card layout is fine. Make the yearly card more visually distinct. Give it the amber/accent border treatment and a "SAVE 60%" badge that looks like a real deal, not a plain text label.
- Add a third note below pricing: "Compare your edge against the books" or similar.

**Mobile**:
- The match preview cards need to be wider on mobile. Currently they're cramped with data getting cut off. Stack them full-width with slightly more padding.
- Pricing cards should stack vertically with the yearly card first (it's the better deal, show it first on mobile where scroll attention drops off).

### 3.4 Match Feed Redesign

**Card improvements**:
- Add a left-side accent bar (3px) color-coded by league. EPL purple, La Liga orange, Serie A blue, Bundesliga red, etc. This lets users visually scan by league even when the filter is set to ALL.
- The card should have a hover state: elevate to Surface 2, subtle brightness increase. On mobile, the "active" state on tap should do the same.
- Add a small "Edge" indicator on cards where the model finds significant value (>8% edge on any market). A small amber dot or badge in the top-right corner. Users quickly learn to look for this as a signal.
- Top scorelines should have slightly more visual emphasis. The "2-1 15%" labels are currently too small and low-contrast.

**Feed layout**:
- Desktop: 3-column grid is correct. Keep it.
- Tablet: 2-column grid.
- Mobile: Single column, full width. This is the biggest win. Currently mobile tries to show the same card layout in a narrow viewport and it gets cramped. Go full-width and let the data breathe.

**League filter**:
- The pill-style filters are fine functionally. Give them more visual weight. Currently they blend into the header. Use Surface 2 background, rounded-full, with the active pill getting a primary blue fill.
- Add a "VALUE" or "EDGE" filter pill that shows only matches where the model finds significant edge against the books. This is a power feature that also drives engagement. Users can scan all matches, or just see where the model disagrees with the market.

**Sort options**:
- Currently matches seem to be sorted by kickoff time. Add sort by: Kickoff (default), Highest Edge, Most Goals Expected (total xG), League.
- "Sort by Highest Edge" becomes the default for engaged users who use Bootroom as a value-finding tool.

### 3.5 Match Detail: Overview Tab

**Match Pulse hero**:
- The four metrics (Total xG, O2.5 Proj, BTTS Proj, Top Scoreline) are correct.
- Make the numbers significantly larger. Currently they're functional size. They should be the dominant visual element on the page. 40-48px on desktop, 28-32px on mobile.
- **Add edge display beneath each metric**. Under "O2.5 49%", show in smaller text: "BOOK 52% | -3%" in neutral gray (market roughly agrees). Under "BTTS 58%", show "BOOK 47% | +11% EDGE" in green. This immediately tells the user where the model sees value.
- The labels above each number (TOTAL XG, O2.5 PROJ, etc.) should be 10px uppercase monospace in text-muted color. The number itself does the talking.

**Form Snapshot**:
- Good data, needs visual polish. The progress bars for O2.5, AVG GOALS, BTTS are functional but could be more refined. Use a segmented bar or a filled track with the percentage as an overlay label, not separate.
- Add a micro-sparkline next to AVG GOALS showing the trend over last 5-10 matches. This gives form-adjusted context in a tiny footprint.

**Top Scorelines**:
- The horizontal bar chart is correct. Add the probability as a label at the end of each bar (not just to the right). The bar length AND the number should tell the same story.
- Highlight the most likely scoreline (first bar) with primary blue. The rest in secondary/muted colors. Visual hierarchy.

**Expected Goals diverging bar**:
- This is implemented. Good. Make the labels (team abbreviations) more prominent. The delta label ("+0.52 home edge" or similar) should be centered and clearly visible.

**Form table**:
- Structured well with Opponent, Score, H/A, Result columns.
- Add very subtle row striping (alternate rows at Surface 1 vs Surface 0). This aids scanning in dense tables.
- The W/D/L indicators should be small filled circles, not text letters. Green/amber/red dots are faster to scan than letters.

**Head to Head** (if implemented):
- Keep it compact. A simple bar showing "LEE 2W | 4D | 3W SUN" is effective. The visual proportion of the bar tells the story faster than numbers alone.

### 3.6 Match Detail: Goals Tab

**Goals Summary hero**:
- Currently shows Avg Goals, O2.5, BTTS, Clean Sheets. Good metrics.
- Full Time / 1st Half toggle is correct. Style it as a segmented control (two connected pills), not separate buttons.
- **Add edge display**. Next to "O2.5 60%", show "BOOK 52% | +8% EDGE" in green. This makes the Goals tab immediately actionable.

**Chart improvements**:
- The bar charts for Total Goals (Last 10 Combined) need color differentiation. Currently they're all the same blue/gray.
- Use primary blue for bars where the combined goals went OVER the O2.5 line. Use secondary gray for bars where it went UNDER. This instantly visualizes the hit rate without the user having to count.
- Same treatment for BTTS chart: blue bars where both teams scored, gray where they didn't.
- Value labels should be inside the bars (white text on blue/gray fill), not floating above. Cleaner look.

**Team Goals For/Against**:
- These charts are currently the most visually repetitive part of the product. Four near-identical charts (Team A For, Team A Against, Team B For, Team B Against).
- Consolidate into two charts: "Attacking Matchup" (Team A Goals For vs Team B Goals Against) and "Defensive Matchup" (Team B Goals For vs Team A Goals Against). Use grouped bars (blue for attack, gray for defense) side by side for each match. This creates the confrontation narrative from v1.

### 3.7 Match Detail: Shots Tab

**Shot Summary panel**:
- Currently plain text: "Shots 12.7, SOT 4.4, Shots ag. 12.4, SOT ag. 4.1". This needs visual hierarchy.
- Make the primary stat (Shots) large (28-32px) and the secondary (SOT, ag.) smaller beneath it.
- Add a shot accuracy badge: "35% accuracy" derived from SOT/Shots. This is a quick-scan metric.

**Team Shots Thresholds**:
- The green progress bars for "Team Shots O3.5 19/20 (95%)" are one of the best visual elements in the current design. These are immediately readable and satisfying.
- Keep this exact treatment. It's working.
- **Add edge here**. "Team Shots O4.5: 90% hit rate | BOOK implied 72% | +18% EDGE". This is a goldmine for player/team prop bettors.

**Shot charts**:
- Same color improvement as Goals: blue bars for matches that went over common shot lines, gray for under.
- On mobile, the team-by-team charts are too many to scroll through. Consider a tabbed interface within the Shots tab: "Combined" (default), "Home Team", "Away Team". Reduces scroll depth by 60%.

### 3.8 Match Detail: Corners Tab

The Corners tab is still the best-structured tab. Minor refinements:

- **Corner Thresholds**: Same green bar treatment as Shots. Already looks good. Add edge display.
- **Combined Expected**: The "20.4" combined expected corners with the Edge calculation (+1.8 / -1.4) is a strong feature. Make this more visually prominent. It's currently lost among the other stats.
- **Charts**: Same color coding improvement. Blue for matches that went O10.5, gray for under. Or whatever the most common line is.

### 3.9 Match Detail: Cards Tab

Currently the cleanest tab. Refinements:

- **Referee panel**: "Stuart Attwell, England" is important data but presented flatly. Give the referee their own visual treatment. A small card/badge with their name, avg cards/match, and a "card-happy" or "lenient" label based on their average relative to league average. This is personality. Users will share screenshots of "Card-happy referee alert: Stuart Attwell averages 4.2 cards/match."
- **Add edge**: "Expected Total Cards 3.5 | BOOK O2.5 cards at 65% implied | MODEL 70% | +5% EDGE"

### 3.10 Match Detail: Players Tab

**Key Players cards**:
- Currently plain white cards with team badge, position, name, scorer%, xG.
- Give these more visual punch. Each card should have a subtle gradient or accent based on the team's primary color (fetched from team data or manually mapped for top leagues). This makes the cards feel alive, not clinical.
- The scorer% should be the dominant visual. 37% in large type, "Scorer" in small label above it.

**Player Projections table**:
- The full table is data-dense and correct.
- On mobile, this table needs a horizontal scroll container with the Player name column frozen/sticky on the left. Currently the columns get cut off.
- Add conditional formatting to the Scorer% and xG columns. Higher values get a subtle background tint (very light blue). This creates a heatmap effect that helps users scan for standout players.
- **Add odds context**: If player goalscorer odds are available from the odds API (anytime goalscorer market), show them. "H. Wilson: 37% model, 28% book implied, +9% edge." This is a premium feature that no competitor offers at this level of integration.

### 3.11 Match Detail: Simulation Tab

This should be the crown jewel. Currently it's strong on data but visually flat.

**Win Probability**:
- The stacked bar (25% WOL | 29% DRAW | 46% LIV) is the best visual element. Keep it.
- **Add book odds beneath it**. Show: "BOOK: 22% | 28% | 50%" so users can see the model vs. book side by side. The visual gap between the two bars tells the edge story instantly.
- Consider making this a dual-bar: model on top, book on bottom, aligned. The visual difference between the two is the insight.

**Markets section**:
- Currently a dense three-column table (Total Goals, Team Goals, Double Chance). The data is right but the presentation is a raw dump.
- Restructure as a series of focused panels:
  - **Goals Markets** panel: O0.5 through O5.5 with model prob, book implied prob, and edge. Use a horizontal bar for each line where the bar length = model probability, and a marker/tick on the bar shows where the book is. The gap between bar end and marker = edge.
  - **Result Markets** panel: 1X2, Double Chance, Draw No Bet. Same treatment.
  - **BTTS** panel: Simple Yes/No with edge.
- Each panel gets a header and sits in its own Surface 1 card. This breaks the wall-of-numbers problem.

**Scoreline Heatmap**:
- The grid concept is right (home goals x away goals). Currently it's plain cells with numbers.
- Use a real heatmap color scale. Highest probability cells in bright primary blue, fading to very faint blue/transparent for low probabilities. The visual pattern of the heatmap tells the match story at a glance: a cluster of probability in the low-scoring zone (0-0, 1-0, 0-1) looks fundamentally different from a spread across 2-1, 1-2, 2-2.
- Highlight the most likely scoreline cell with an accent border or subtle glow.
- On mobile, the heatmap needs a min-width container with horizontal scroll. Don't try to squeeze a 6x6 grid into 375px.

**Model Transparency**:
- Keep collapsed by default. When expanded, show the inputs in a clean, structured format.
- Add "Last updated: 2 hours ago" timestamp. Users want to know the data is fresh.
- Add "100,000 simulations" as a prominent label. This is a trust signal.

### 3.12 Mobile-Specific Improvements

Mobile is where most users will be. The current implementation stacks everything vertically but doesn't truly adapt.

**Navigation**:
- The tab bar (Overview, Goals, Shots, Corners, Cards, Players, Simulation) should be horizontally scrollable on mobile, not wrapping. Pin it below the match header so it's always accessible.
- Consider adding a swipe gesture between tabs. This feels native-app smooth.

**Data tables on mobile**:
- All tables with 4+ columns need a horizontal scroll container with the first column (usually the identifier, like player name or match opponent) sticky on the left.
- Reduce font size to 12px for table body on mobile. 13-14px is too large in narrow contexts.
- Add zebra striping on mobile even if not on desktop. Aids scanning on small screens.

**Charts on mobile**:
- Bar charts should be full-width on mobile.
- Reduce the number of bars shown by default. On desktop, show last 10 matches. On mobile, show last 5 with a "Show more" toggle. This prevents endless scrolling.

**Match feed on mobile**:
- Single column, full-width cards. Each card should show: teams, kickoff time, xG, O2.5 badge, BTTS badge, top scoreline, and the edge badge. That's it. No extra data that requires squinting.
- Tap a card to expand inline or navigate to match detail.

**Bottom sheet pattern**:
- For the match feed filters (league, sort), use a bottom sheet that slides up from the bottom on mobile. This is more natural than the top-mounted filter pills.

### 3.13 Charts: General Design Language

All charts across the product should follow these rules:

- **Bar width**: Generous. The current bars are too narrow. Aim for bars that are 60-70% of the available column width.
- **Bar color**: Primary blue for the primary data series. Secondary gray for comparative/context data. Green accent for "hit" indicators (went over a line). Use opacity (80% for bars, 100% for hover) to add interactivity.
- **Bar labels**: Inside the bar for bars tall enough to contain text. Above the bar for short bars. Never on the x-axis only. The value should be immediately visible without scanning to the axis.
- **Average/reference lines**: Dashed, 1px, in text-muted color. With a label at the right end ("avg 3.0"). These are context, not primary data.
- **Axes**: Minimal. X-axis labels (opponent abbreviations) in 10px muted text. Y-axis can usually be omitted since bar labels show exact values.
- **Hover/tap states**: Bar brightens to 100% opacity. A tooltip appears showing the full match context: "vs LIV (H) | 3-2 W | Oct 15, 2025". This turns abstract bars into stories.
- **Animation**: Bars should animate in from zero height on tab switch/page load. 300ms ease-out, staggered by 30ms per bar. Subtle but feels alive.

### 3.14 The "Share Card" Feature (Future, high impact)

When a user finds a compelling edge or data point, they should be able to generate a shareable image. Tap a "Share" icon on any panel, and Bootroom generates a branded card with the data, the Bootroom logo, and the URL. This is how the product goes viral. The card should look like it belongs on Twitter, not like a screenshot of a data table.

This is a P2 feature but design the panels with this in mind. Every panel should look good as a standalone screenshot, which means it should look good as a share card.

---

## 4. IMPLEMENTATION PRIORITIES

### P0: Ship This Week

1. **Odds API integration** (developer task). Connect to The Odds API or API-Football odds endpoint. Fetch and cache 1X2, O/U 2.5, and BTTS odds for all fixtures daily.
2. **Edge display on Match Pulse** (Overview tab). Show book implied probability and delta next to each simulation metric in the hero panel.
3. **Edge display on Simulation tab**. Add book implied column to the Markets section.
4. **Edge badge on match feed cards**. Show highest-edge market as a small badge on each card.
5. **Typography upgrade**. Swap to JetBrains Mono + IBM Plex Sans (or similar pairing). Adjust the size hierarchy as specified.

### P1: Ship This Sprint (1-2 weeks)

6. **Background color layering**. Replace border-heavy design with the Surface 0/1/2/3 system. Eliminates visual clutter.
7. **Chart color coding**. Blue for over/hit, gray for under/miss across all bar charts. Immediate visual improvement.
8. **Mobile match feed**. Full-width single-column cards with edge badges.
9. **Mobile table scroll**. Horizontal scroll containers with sticky first columns on all data tables.
10. **Scoreline heatmap color scale**. Replace plain numbers with the blue intensity heatmap.
11. **League accent colors on feed cards**. Left-side color bar per league.
12. **Edge filter/sort on match feed**. Let users sort by highest model edge.

### P2: Next 2-4 Weeks

13. **Dual win probability bar** on Simulation tab (model vs. book).
14. **Market probability panels** replacing the raw three-column table.
15. **Player goalscorer edge** if odds API provides anytime scorer markets.
16. **Referee personality labels** ("card-happy" / "lenient" based on league average comparison).
17. **Chart bar animations** on tab switch.
18. **Share card generation** from any panel.
19. **"VALUE" filter** on match feed showing only high-edge fixtures.
20. **Mobile bottom sheet** for filters.

---

## 5. CONTENT STRATEGY (ENABLED BY ODDS)

The odds integration unlocks a daily content engine from @bootroomgg:

**Daily posts** (automated or semi-automated from the data):
- "BEST EDGE TODAY: [Match] O2.5 goals. Model says 68%. Books say 52%. That's a +16% edge." Attach a screenshot of the match card or Overview tab.
- "BIGGEST LONG SHOT: [Match] [Team] to win. Model says 18%. Books imply 12%. +6% edge at [decimal odds]."
- "MODEL AGREES WITH BOOKS: [Match]. Market efficient today. No significant edges."

**Post-match recaps**:
- "THE MODEL WAS RIGHT: Called O2.5 at 68% with +16% edge. Final score: 3-2."
- "THE MODEL MISSED: Called Home Win at 55%. Away team won 0-2. Here's why: [link to match detail showing the data]."

Being transparent about misses builds more trust than only celebrating wins. This is how you differentiate from tipster accounts that delete bad calls.

**Weekly roundup**:
- "BOOTROOM EDGE REPORT: 47 fixtures this week. 31 highest-edge plays hit. 66% hit rate on model edges >10%."
- This is the accountability content that converts followers to subscribers.

---

## 6. SETTINGS PAGE (MINIMAL V1)

Based on our earlier discussion, with the odds addition:

- **Account**: Change password, Change email, Delete account, Manage subscription (Stripe portal).
- **Display**: Light/Dark mode. Odds format (Decimal, Fractional, American). Default: decimal.
- **Preferences**: Default league. Default form period (Last 5, Last 10, Season).

The odds format preference now makes sense because you're showing actual odds, not just simulation probabilities. An American user on DraftKings thinks in American odds. A UK user on Bet365 thinks in fractional. Let them choose.

---

## 7. SUMMARY

Two moves change everything for Bootroom:

**Odds integration** transforms the product from "interesting football data" to "here's where the books are wrong." It gives you daily content, a viral hook, and a reason for bettors to pay $5/month. The technical lift is minimal: one API, one fetch-and-cache job, one implied probability calculation, one delta display.

**Visual polish** transforms the product from "works but looks like wireframes" to "I need to screenshot this and show my friends." You're a designer with 20 years of experience. The UX structure is built. Now make it undeniable.

Ship the odds integration first (it's a developer task, days not weeks). Then get into Figma and redesign the components with the edge display baked in from the start. Post the first "Best Edge" tweet the day the odds go live.

The product has legs. Now give it shoes.
