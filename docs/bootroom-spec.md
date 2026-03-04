**BOOTROOM**

Product Specification v1.0

*Bloomberg backend. Robinhood frontend.*

  ------------------ ----------------------------------------------------
  **Prepared for**   Bootroom Development Team

  **Version**        1.0 --- Initial Spec

  **Date**           March 2026

  **Status**         Draft --- Iterate freely
  ------------------ ----------------------------------------------------

**0. Product Philosophy**

Bootroom is not a data warehouse. It is an analyst. Where every
competitor --- including DataGaffer, the current benchmark --- presents
raw simulation output and asks the user to figure out the rest, Bootroom
surfaces a clear opinion: here is where the value is today, here is why,
here is the data behind it if you want to verify.

**The Three-Layer Model**

All product decisions should be evaluated against this hierarchy:

  ------------------ ----------------------------------------------------
  **Layer 1 ---      The Robinhood piece. Daily Brief, Match Feed, Top
  Surface**          Picks. The user who opens the app and wants to act
                     in under 60 seconds. Default experience. Where new
                     users form habits.

  **Layer 2 ---      Match Detail pages. The user who wants to validate a
  Drill-Down**       recommendation before acting. Already partially
                     built. Needs polish and new tabs.

  **Layer 3 ---      The Bloomberg piece. League-wide Zone views, Value
  Power**            Finder, Player Props, Parlay Builder. Accessible but
                     never the default. Serves your most engaged 20% of
                     users.
  ------------------ ----------------------------------------------------

The guiding question for every design and engineering decision: does
this surface an answer, or does it just show more data? If it only shows
data, it belongs in Layer 3, behind a filter or a drill-down path. The
homepage is never a table.

> **Note:** *DataGaffer lives entirely in Layer 3. That is Bootroom\'s
> entire opportunity.*

**1. Information Architecture**

The navigation should be flat, purposeful, and ordered by user intent
--- not by data type.

**Primary Navigation (always visible)**

-   **Daily Brief ---** Today

```{=html}
<!-- -->
```
-   Top Picks feed, Edge Score leaderboard, personalized alerts

```{=html}
<!-- -->
```
-   **Match Feed ---** Matches

```{=html}
<!-- -->
```
-   Card/table toggle. Filterable by league, market type, edge threshold

```{=html}
<!-- -->
```
-   **League Hub ---** Leagues

```{=html}
<!-- -->
```
-   Zone views: Goal Zone, Shot Zone, Corner Zone, Player Props

```{=html}
<!-- -->
```
-   **Power Tools ---** Tools

```{=html}
<!-- -->
```
-   Value Finder, Parlay Builder, H2H Explorer

```{=html}
<!-- -->
```
-   **Profile & Settings ---** Account

```{=html}
<!-- -->
```
-   Preferences, followed leagues, bet type filters, notification
    > settings

**What Changes vs. Current Build**

-   REMOVE: No top-level page per data type. No standalone
    \"Simulation\" page, no standalone \"Probability\" page. These
    become tabs inside Match Detail.

-   ADD: Daily Brief as the true homepage --- not the Match Feed.

-   KEEP: Match Feed with card/table toggle. Table is a power-user view,
    not the default.

-   ADD: Leagues section housing all cross-match zone views (currently
    missing entirely).

-   ADD: Tools section consolidating Value Finder and Parlay Builder
    (new features).

  -----------------------------------------------------------------------
  **SCREEN 01** Daily Brief --- NEW FEATURE

  -----------------------------------------------------------------------

**2. Daily Brief**

**Route:** /today (default homepage)

**Status:** New --- does not exist

**Priority:** P0 --- build first

**Layer:** 1 --- Surface

**Purpose**

This is the entry point for the majority of users on any given day. It
answers one question: what should I look at today? It does not ask the
user to explore. It presents conclusions.

**Layout --- Top to Bottom**

**2.1 Daily Header Bar**

Full-width banner. Left: date + number of matches available today.
Center: a single plain-English \"market of the day\" tagline generated
from the day\'s highest-edge opportunity (e.g. \"Over markets are
heavily mispriced today --- 6 high-edge plays identified\"). Right: user
avatar / settings shortcut.

> **Note:** *The tagline is auto-generated from the Edge Score engine.
> It should update when the day\'s first confirmed lineups land.*

**2.2 Top Picks Rail (Hero Section)**

Horizontally scrollable card rail. 3--5 cards maximum. Each card is a
single recommended bet, auto-selected by the Edge Score engine as the
day\'s highest-confidence plays.

Each Pick Card contains:

-   Match name + league badge + kickoff time

-   Recommended market in large type (e.g. \"Over 2.5 Goals\")

-   Edge Score badge: a single percentage representing model probability
    minus implied bookmaker probability (e.g. \"+18.4% edge\")

-   Confidence tier label: HIGH / MEDIUM / SPECULATIVE with color coding
    (green / amber / red)

-   One-sentence plain-English rationale generated from simulation data
    (e.g. \"Both sides have averaged 3.2 combined goals in last 8
    matches and xG projects to 3.6 today\")

-   Two CTAs: \"See Full Analysis\" (routes to Match Detail) and a
    bookmarking/save icon

> **Note:** *Confidence tiers map to edge thresholds: HIGH = edge \>
> 15%, MEDIUM = 8--15%, SPECULATIVE = 4--8%. Do not surface picks below
> 4% edge.*

**2.3 Edge Leaderboard**

A ranked list of ALL today\'s matches sorted by their single best-market
edge score. This is the \"scan everything\" view for users who want more
than the top 5 picks. Displayed as a compact table with: Match, Best
Market, Edge %, Confidence Tier, Kickoff. Clicking any row routes to
Match Detail.

Default sort: Edge % descending. Allow toggle sort by: Kickoff Time,
League, Market Type.

**2.4 Market Breakdown Strip**

A horizontal filter/summary bar showing: total plays available today
broken down by market type. Example: \"Goals (12) \| BTTS (8) \| Corners
(6) \| Player Props (9) \| Correct Score (4)\". Clicking any market type
filters the Edge Leaderboard below to that market only.

**2.5 League Pulse (below fold)**

For each league the user follows (or top-5 by today\'s match count if no
preferences set): a compact league card showing number of today\'s
matches, highest edge opportunity in that league, and a mini spark-chart
of that league\'s recent simulation accuracy. Routes to the League Hub.

**Data / API Requirements**

-   Edge Score engine must run across all today\'s matches and all
    markets (Goals O/U, BTTS, Correct Score, Corners, Win/Draw, Team
    Totals, Player Props) and compare to live odds API for each market.

-   Plain-English rationale generation: a lightweight template engine
    (or LLM prompt) that takes simulation output fields (xG home, xG
    away, BTTS sim %, historical O2.5 hit rate, form, H2H avg goals) and
    produces a 1--2 sentence string. This does not need to be real-time
    --- generate at match creation time, refresh on lineup confirmation.

-   Personalization hook (Phase 2): filter Daily Brief by user\'s
    followed leagues and preferred market types stored in user profile.

  -----------------------------------------------------------------------
  **SCREEN 02** Match Feed --- REDESIGN

  -----------------------------------------------------------------------

**3. Match Feed**

**Route:** /matches

**Status:** Exists --- significant redesign required

**Priority:** P0

**Layer:** 1 / 3 (card = Layer 1, table = Layer 3)

**3.1 View Toggle**

Retain the existing card/table toggle. Two important changes: (1) Card
view becomes the default --- not table. (2) The toggle should be
visually secondary, not prominent. It lives in the top-right filter bar.
Power users will find it. Casual users should never feel like they need
it.

**3.2 Card View (Default)**

Each match renders as a card. The card tells a story about the match
rather than listing raw numbers. Key card anatomy:

-   Header row: Home team vs Away team, league badge, kickoff time,
    venue

-   Edge badge: top-right corner of card. Shows the single best-market
    edge for this match in large type. Color-coded by confidence tier.

-   Primary market pill: the specific market driving that edge (e.g.
    \"BTTS Yes +11.3%\"). This is the card\'s headline.

-   xG bar: a simple horizontal split bar showing home xG vs away xG.
    Not numbers --- a visual. Labels underneath.

-   Form indicators: last 5 results for each team as W/D/L dots.
    Compact, 10px dots, colored green/gray/red.

-   Secondary signals row: 2--3 small pill badges summarizing notable
    signals. Examples: \"High corners match\", \"Low-scoring H2H\",
    \"Referee books often\". These are generated from the simulation and
    H2H data.

-   Quick-action row: Save, Share, and \"Open\" (routes to Match
    Detail). \"Open\" is the primary CTA.

**3.3 Table View (Power)**

Retain existing sortable table structure. Add the following columns to
what currently exists:

-   Edge Score (best market) --- sortable, this should be the default
    sort

-   Best Market label (e.g. \"O2.5 Goals\")

-   Confidence Tier (HIGH / MED / SPEC pill)

-   Sim O2.5 % --- probability from Monte Carlo

-   Book O2.5 odds --- live from odds API

All existing columns (xG, O2.5 badge, BTTS badge) are retained. Column
visibility should be configurable --- let the user hide columns they
don\'t need.

**3.4 Filters**

Filter bar lives above the feed in both views. Controls:

-   League multi-select (default: all followed leagues)

-   Market type (Goals, Corners, BTTS, Win, Player Props, All)

-   Minimum edge threshold slider (0% to 30%, default 0%)

-   Confidence tier (ALL / HIGH only / HIGH + MEDIUM)

-   Kickoff time range (Today, Tonight, Tomorrow, This Week)

> **Note:** *Filters persist in localStorage per user session. Do not
> reset on page navigation.*

**Data / API Requirements**

-   Edge Score per match per market --- same engine as Daily Brief.

-   Secondary signals generation: a mapping layer that takes simulation
    fields and outputs human-readable signal tags. Define a fixed
    taxonomy of \~20 signal types (high corners, low-scoring H2H, home
    team form surge, away clean sheet streak, referee card rate, etc).
    Each match gets 0--4 tags based on thresholds.

-   Form data: last 5 results per team from existing data layer.

  -----------------------------------------------------------------------
  **SCREEN 03** Match Detail --- POLISH + NEW TABS

  -----------------------------------------------------------------------

**4. Match Detail**

**Route:** /match/:id

**Status:** Exists --- good foundation. Add tabs, polish existing.

**Priority:** P1

**Layer:** 2 --- Drill-Down

**Existing Tab Structure (retain and improve)**

Overview / Goals / Shots / Corners / Cards / Players / Simulation

**4.1 Overview Tab (improve)**

Currently solid. Add the following:

-   Edge Score summary block at the top of the page --- before any other
    content. Shows best 3 markets for this match with edge %, sim
    probability, and book odds side by side. This is the \"so what\" for
    anyone landing on this page.

-   Plain-English match narrative below the summary block. 3--5
    sentences generated from simulation data covering: projected score
    environment, which team is favored and by how much, key form
    factors, and top recommended market. This replaces the need for the
    user to synthesize data themselves.

-   H2H mini-summary: average goals in last 10 H2H meetings, BTTS hit
    rate in last 10, shown as two stat tiles. Routes to full H2H tab on
    click.

**4.2 Goals / Shots / Corners / Cards / Players (improve)**

These tabs are already well-designed. Targeted improvements:

-   Add a \"Full Time / 1st Half\" toggle to every stat tab (not just
    Goals). Bettors care about first-half markets across all stat types.

-   Add threshold hit rates to every tab. For Goals: show \"O2.5 hit
    rate last 10 combined\" as a single highlighted stat at the top.
    Same pattern for Shots (O25 shots), Corners (O9.5), Cards (O3.5).

-   Players tab: add a \"Player Picks\" section at the top that surfaces
    the 2--3 highest-edge player prop opportunities from this match
    (e.g. \"J. Bowen --- Anytime Scorer at +14.2% edge vs book\"). This
    is the bridge between the detail page and the Player Props surface.

**4.3 Simulation Tab (improve)**

Currently shows win probability, markets, xG, scoreline heatmap, and top
scorelines. Already the best implementation in the market. Add:

-   Correct Score odds comparison: for the top 8 scorelines, show sim
    probability, converted sim odds, and book odds side by side.
    Highlight positive-edge scorelines in green.

-   Lineup confirmation indicator: \"Lineup confirmed\" green badge or
    \"Pre-lineup estimate\" amber badge with timestamp. DataGaffer does
    this --- Bootroom should too.

-   Model transparency accordion: a collapsible section at the bottom
    explaining the inputs to the simulation for this match (team
    strength ratings, form weight, xG source, H2H adjustment). This
    builds trust.

**4.4 NEW TAB --- H2H**

Head-to-head historical data does not currently exist in Bootroom.
DataGaffer has it. It must be built.

-   Overview sub-tab: average goals, BTTS rate, home win / draw / away
    win distribution across all historical meetings. Shows number of
    meetings analyzed (e.g. \"Last 17 meetings\").

-   Trends sub-tab: for each market (Goals O/U, Corners O/U, BTTS, SOT)
    --- show hit rate as a percentage across last 5, 10, and all H2H
    meetings. Display as a simple table with green/red heat coloring.

-   Matchups sub-tab: how each team performs specifically against this
    opponent. Home team goals scored vs this opponent vs season average.
    Away team goals conceded vs this opponent vs season average.
    Surfaces mismatches.

> **Note:** *H2H data requires a new data pipeline pulling historical
> match results per team pair. This is the only genuinely new data
> requirement for Match Detail.*

**4.5 NEW TAB --- Value**

A match-specific version of the Value Finder. Shows every available
market for this specific match with: sim probability, book odds, edge %,
and a BET / PASS / AVOID signal.

-   Markets covered: Win/Draw/Away, 1X/X2/12, DNB, O/U Goals (0.5
    through 5.5), BTTS Yes/No, Correct Score (top 10), Team Totals,
    Corners O/U, Cards O/U, First Half versions of all the above.

-   Default sort: edge % descending. Show only markets with positive
    edge by default, with a toggle to show all markets.

-   This tab is the power user\'s destination. It replaces the need for
    a separate cross-match Value Finder for users who are already in a
    specific match.

  -----------------------------------------------------------------------
  **SCREEN 04** League Hub & Zone Views --- NEW

  -----------------------------------------------------------------------

**5. League Hub & Zone Views**

**Route:** /leagues and /leagues/:id

**Status:** New --- does not exist

**Priority:** P1

**Layer:** 3 --- Power

**5.1 League Hub (/leagues)**

Grid of all supported leagues. Each league card shows: league name +
crest, number of today\'s fixtures, top edge opportunity today, and a
\"Follow\" toggle. Clicking routes to the league-specific view.

**5.2 League View (/leagues/:id)**

Date nav at top (Yesterday / Today / Tomorrow). Four zone sub-tabs:

**Goal Zone**

All today\'s matches in this league, ranked by projected total goals.
Columns:

-   Match + kickoff

-   Projected total goals (from Monte Carlo)

-   Probability of hitting O1.5 / O2.5 / O3.5 / O4.5

-   Edge % on best goals market

-   Player goal props rail: top 5 players by 1+ goal probability with
    their per-90 xG and match edge vs book

**Shot Zone**

Same structure, focused on shots and shots-on-target markets.

-   Projected total shots and SOT per match

-   Probability thresholds: O22 / O24 / O26 / O28 / O30 shots

-   Player shots props: top 5 by shots/90 for today\'s matches

**Corner Zone**

Focused on corner markets.

-   Projected total corners per match + team breakdown

-   Probability thresholds: O8.5 / O9.5 / O10.5 / O11.5

-   Player assist props: top 5 corner-takers by assists/90

**Player Props**

A cross-match player ranking surface. This is DataGaffer\'s Player Rates
view, done better.

-   Filter by: stat type (Goals, Assists, Shots, SOT, Cards), position,
    team, league

-   Columns: Player, Club, Opponent, Stat/90, Match probability (1+ of
    stat type), Edge vs book

-   Default sort: edge % descending, so the best prop opportunities rise
    to the top

-   Each player row expands inline to show: recent form in that stat
    category (last 5 matches), H2H history vs today\'s opponent, and
    quick links to bookmakers

**Data / API Requirements**

-   All zone views are powered by the same Monte Carlo output used in
    Match Detail --- just aggregated cross-match instead of per-match.

-   Player props require: per-90 stats per player per match, sim-derived
    1+ goal / shot / assist probabilities, and live player prop odds
    from the odds API. Player prop odds lines vary by bookmaker ---
    source from the primary odds API and flag where lines are
    unavailable.

  -----------------------------------------------------------------------
  **SCREEN 05** Value Finder --- NEW

  -----------------------------------------------------------------------

**6. Value Finder**

**Route:** /tools/value-finder

**Status:** New --- does not exist

**Priority:** P1

**Layer:** 3 --- Power

**Purpose**

The cross-match, cross-league edge surface. Answers: across all of
today\'s matches, where is the bookmaker most mispriced vs our model?
This is Bootroom\'s most powerful tool for serious bettors and the
feature that most directly proves the Bloomberg backend claim.

**6.1 Market Filter Bar**

Horizontal pill-select filter for market type. Options:

-   BTTS Yes/No

-   Over/Under Goals (selectable line: 1.5 / 2.5 / 3.5 / 4.5)

-   Win / Draw / Away

-   Team Total (selectable line)

-   Corners Over/Under (selectable line)

-   First Half Goals

-   Correct Score

Secondary filter: league. Default all. Tertiary filter: minimum edge
threshold (default 5%).

**6.2 Results Table**

Sorted by edge % descending by default. Columns:

-   Match + kickoff

-   Market (specific, e.g. \"Over 2.5 Goals\")

-   Sim % (model probability)

-   Sim Odds (converted from sim probability)

-   Book Odds (live from odds API)

-   Edge % (Sim % minus implied book probability). Color-coded: green
    positive, red negative.

-   Confidence Tier badge

Row click routes to the Value tab inside Match Detail for that match.

**6.3 Edge Score Calculation (Engineering Spec)**

This is the core engine powering Daily Brief, Match Feed, Value Finder,
and all confidence tiers. It must be centralized.

  ------------------ ----------------------------------------------------
  **Input A**        sim_probability: float (0--1). Monte Carlo output
                     for a specific market in a specific match.

  **Input B**        book_odds: float. American or decimal odds from the
                     live odds API for the same market.

  **Step 1**         Convert book_odds to implied probability:
                     implied_prob = 1 / decimal_odds (after removing vig
                     --- divide each side by (1/odds_home + 1/odds_draw +
                     1/odds_away)).

  **Step 2**         edge_score = sim_probability - implied_prob

  **Step 3**         Confidence tier: edge \> 0.15 = HIGH, 0.08--0.15 =
                     MEDIUM, 0.04--0.08 = SPECULATIVE, below 0.04 =
                     suppress.

  **Output**         edge_score (float), confidence_tier (enum), sim_odds
                     (1/sim_probability formatted), book_odds
                     (passthrough).
  ------------------ ----------------------------------------------------

> **Note:** *Run this calculation for every match x every market
> combination on page load (or via background job refreshed every 30
> min). Cache results. Do not recalculate inline on every component
> render.*

  -----------------------------------------------------------------------
  **SCREEN 06** Parlay Builder --- NEW

  -----------------------------------------------------------------------

**7. Parlay Builder**

**Route:** /tools/parlay-builder

**Status:** New --- does not exist

**Priority:** P2

**Layer:** 3 --- Power

**Purpose**

Lets users build multi-leg parlays and see the combined sim probability
vs book odds. Also generates computer-recommended parlays from the Edge
Score engine. DataGaffer has this feature --- Bootroom needs a better
version.

**7.1 Manual Builder**

User searches for any match and selects a market. Each selection is
added as a \"leg\" to the active parlay slip.

-   Parlay Slip panel (right sidebar or bottom drawer on mobile): shows
    all added legs, combined sim probability, combined book odds, edge
    on the parlay, and a confidence indicator.

-   Leg card: match, market, sim %, book odds, edge %. Remove button.

-   Combined stats update live as legs are added/removed.

-   Cap at 8 legs. Warn user above 4 legs that parlay sim accuracy
    degrades.

**7.2 Computer-Generated Parlays**

Auto-generated using the Edge Score engine. Three profiles:

-   Safe: 2-leg parlays using only HIGH confidence plays. Combined edge
    \> 20%.

-   Balanced: 2-3 leg parlays mixing HIGH and MEDIUM confidence.
    Combined edge \> 12%.

-   Aggressive: 3-4 leg parlays including SPECULATIVE plays. Combined
    edge \> 8%.

Show 3 generated parlays per profile. Each parlay card shows: legs
(match + market + edge per leg), combined sim %, combined book odds,
total edge, and a \"Load into Builder\" button.

> **Note:** *Generated parlays should avoid correlated legs (e.g. do not
> combine \"Man City win\" and \"Man City O1.5 team goals\" --- these
> are highly correlated and the combined edge is overstated). Implement
> basic correlation suppression: if two legs share the same match, flag
> a warning.*

**Data / API Requirements**

-   Parlay combination logic: multiply individual sim probabilities for
    uncorrelated legs to get combined sim probability. This is an
    approximation --- document this limitation.

-   Combined book odds: product of individual decimal odds.

-   Combined edge: combined sim probability minus 1/combined decimal
    odds.

  -----------------------------------------------------------------------
  **SECTION** Component Inventory

  -----------------------------------------------------------------------

**8. Component Inventory**

All new and modified components required across the spec. Each should be
built as a standalone reusable component.

**New Components**

-   \<EdgeBadge /\>

```{=html}
<!-- -->
```
-   Props: edge (float), tier (HIGH\|MEDIUM\|SPECULATIVE). Renders a
    > colored pill with percentage. Used everywhere.

```{=html}
<!-- -->
```
-   \<PickCard /\>

```{=html}
<!-- -->
```
-   Props: match, market, edge, tier, rationale. Full pick card for
    > Daily Brief hero rail.

```{=html}
<!-- -->
```
-   \<MatchCard /\>

```{=html}
<!-- -->
```
-   Props: match data object. Card view of a single match for the Match
    > Feed. Contains EdgeBadge, xG bar, form dots, signal tags.

```{=html}
<!-- -->
```
-   \<EdgeLeaderboard /\>

```{=html}
<!-- -->
```
-   Props: matches\[\], filters. Sortable table of all today\'s matches
    > by edge. Used in Daily Brief and as a fallback view.

```{=html}
<!-- -->
```
-   \<MarketBreakdownStrip /\>

```{=html}
<!-- -->
```
-   Props: marketCounts object. Horizontal count strip by market type.
    > Filter controller.

```{=html}
<!-- -->
```
-   \<SignalTag /\>

```{=html}
<!-- -->
```
-   Props: type (enum from taxonomy), value. Small pill badge showing a
    > plain-English match signal. Taxonomy of \~20 types defined in
    > constants.

```{=html}
<!-- -->
```
-   \<PlainEnglishNarrative /\>

```{=html}
<!-- -->
```
-   Props: simulationData object. Renders the generated plain-language
    > match summary. Accepts pre-generated string or calls generation
    > endpoint.

```{=html}
<!-- -->
```
-   \<ValueTable /\>

```{=html}
<!-- -->
```
-   Props: markets\[\], sort, filters. Full value finder table. Used in
    > Value Finder page and Match Detail Value tab.

```{=html}
<!-- -->
```
-   \<ParlaySlip /\>

```{=html}
<!-- -->
```
-   Props: legs\[\], onRemove. Floating slip panel for parlay builder.

```{=html}
<!-- -->
```
-   \<ConfidenceMeter /\>

```{=html}
<!-- -->
```
-   Props: tier, edge. Visual indicator (bar or arc) showing play
    > confidence.

```{=html}
<!-- -->
```
-   \<H2HOverview /\>

```{=html}
<!-- -->
```
-   Props: matchId. Fetches and renders H2H history for a team pair.

```{=html}
<!-- -->
```
-   \<LineupIndicator /\>

```{=html}
<!-- -->
```
-   Props: confirmed (bool), timestamp. \"Lineup confirmed\" vs
    > \"Pre-lineup estimate\" badge.

**Modified Components**

-   \<MatchFeed /\>

```{=html}
<!-- -->
```
-   Add: EdgeBadge, view toggle persistence, new filter bar, SignalTags
    > per card.

```{=html}
<!-- -->
```
-   \<SimulationTab /\>

```{=html}
<!-- -->
```
-   Add: LineupIndicator, correct score odds comparison table, model
    > transparency accordion.

```{=html}
<!-- -->
```
-   \<PlayersTab /\>

```{=html}
<!-- -->
```
-   Add: Player Picks edge summary at top.

```{=html}
<!-- -->
```
-   \<OverviewTab /\>

```{=html}
<!-- -->
```
-   Add: Edge Score summary block, PlainEnglishNarrative, H2H
    > mini-tiles.

  -----------------------------------------------------------------------
  **SECTION** User Flows

  -----------------------------------------------------------------------

**9. Key User Flows**

**Flow A --- Casual Bettor (Daily Brief to Bet)**

This is the primary flow. Should be completable in under 60 seconds.

-   User opens app. Lands on Daily Brief (/today).

-   Scans Top Picks rail. Reads plain-English rationale on top card.
    Sees +18% edge badge.

-   Taps \"See Full Analysis\". Routes to Match Detail \> Value tab for
    that match.

-   Confirms the edge, sees the model transparency note. Decides to act.

-   Taps bookmaker link. Places bet externally.

```{=html}
<!-- -->
```
-   Total taps: 2. Total time: \<60 seconds. Zero tables encountered.

**Flow B --- Power User (Value Mining)**

-   User opens app. Navigates to /tools/value-finder.

-   Filters to \"Corners Over/Under\", minimum edge 10%.

-   Sorts by edge descending. Sees 3 high-confidence corner plays.

-   Clicks into one match. Match Detail \> Value tab. Reviews all corner
    market edges.

-   Adds preferred leg to parlay builder via \"Add to Parlay\" button in
    the Value tab.

-   Navigates to /tools/parlay-builder. Reviews slip. Adds a second leg.

-   Sees combined sim probability, combined edge. Decides to bet.

**Flow C --- League Research**

-   User navigates to /leagues/epl.

-   Opens Goal Zone. Sees today\'s 6 EPL matches sorted by projected
    goals.

-   Notes that Man City vs Wolves is projected at 3.8 total goals with
    71% O2.5 vs book 62% implied. Edge +9%.

-   Clicks match row. Routes to Match Detail for that match.

  -----------------------------------------------------------------------
  **SECTION** Removals & Deprioritizations

  -----------------------------------------------------------------------

**10. What to Remove, Hide, or Defer**

**Remove from Primary Navigation**

-   Any standalone page that duplicates data already accessible inside
    Match Detail tabs. If it\'s a different view of a single match, it
    belongs in Match Detail --- not in nav.

-   Any page that is purely a table of raw simulation outputs with no
    edge/value layer. These become League Zone sub-tabs, not standalone
    nav items.

**Demote / Hide Behind Controls**

-   Table view of Match Feed --- keep it, make it opt-in via toggle,
    never default.

-   Raw simulation probability outputs --- keep them in Simulation tab.
    Do not surface on cards or in the feed without an edge
    interpretation layer.

-   Proprietary index values (if any are added in future, e.g. pace
    index) --- available in detail view only, never in card summaries.
    Jargon without context is noise.

**Defer to Phase 2**

-   Push notifications / alerts (when lineup confirms, when odds move
    significantly against your saved pick)

-   Bet tracking / performance history (\"how have Bootroom\'s picks
    performed over time\")

-   Social / shared picks

-   Subscription paywall / feature gating

-   Mobile app (spec for web-first, responsive, progressive enhancement)

  -----------------------------------------------------------------------
  **SECTION** Engineering Notes

  -----------------------------------------------------------------------

**11. Edge Score Engine --- Engineering Summary**

This is the most important new infrastructure piece. Everything in Layer
1 depends on it.

**Architecture**

-   Run as a background job on match creation and again on lineup
    confirmation.

-   For each match: iterate over all market types. Call Monte Carlo
    model for sim_probability. Call odds API for book_odds. Calculate
    edge_score and confidence_tier. Persist to a match_markets table.

-   Expose via a single API endpoint: GET /api/matches/today/edges ---
    returns all matches with their edge scores across all markets,
    sorted by edge descending. This endpoint powers Daily Brief, Match
    Feed badges, and Value Finder simultaneously.

-   Cache aggressively. TTL: 30 minutes outside lineup window, 5 minutes
    within 2 hours of kickoff.

**Plain-English Narrative Generation**

-   Define a template library with \~15 narrative templates keyed to
    simulation output patterns.

-   Example: if xG_home \> 2.0 and xG_away \< 1.0 and form_home = W3+ →
    use template \"Strong home dominance projected. {home_team} are in
    excellent form and face an {away_team} side averaging just {xg_away}
    xG away this season.\"

-   On lineup confirmation: re-run with confirmed player availability
    adjustments. Flag narrative as \"updated for confirmed lineup\".

-   Phase 2: replace template system with LLM-generated narratives using
    structured simulation data as context.

**Signal Tag Taxonomy**

Define these 20 signal types as constants. Each has: a threshold
condition, a display label, and a category (goals / corners / discipline
/ form).

-   HIGH_SCORING_H2H --- avg H2H goals \> 3.0

-   LOW_SCORING_H2H --- avg H2H goals \< 2.0

-   BTTS_TREND --- BTTS hit rate in last 10 H2H \> 70%

-   HOME_FORM_SURGE --- home team W in last 4+ home matches

-   AWAY_FORM_COLLAPSE --- away team L in last 3+ away matches

-   HIGH_CORNER_MATCH --- projected corners \> 11.0

-   REFEREE_BOOKS_OFTEN --- referee avg cards per game \> 4.5

-   REFEREE_TIGHT --- referee avg cards per game \< 2.5

-   HOME_CLEAN_SHEET_RUN --- home team CS in 3+ last 5 home

-   AWAY_GOAL_DROUGHT --- away team 0 goals in 2+ last 3 away

-   LARGE_XG_GAP --- \|xG_home - xG_away\| \> 1.2

-   LOW_TOTAL_XG --- xG_home + xG_away \< 1.8

-   HIGH_TOTAL_XG --- xG_home + xG_away \> 3.5

-   LINEUP_UNCONFIRMED --- confirmed_lineup = false at \<3h to kickoff

-   KEY_PLAYER_MISSING --- starter_probability of top scorer/assist \<
    50%

  -----------------------------------------------------------------------
  **SECTION** Phased Roadmap

  -----------------------------------------------------------------------

**12. Phased Delivery Roadmap**

**Phase 1 --- Foundation (Ship this first)**

Goal: make Bootroom\'s existing match detail content discoverable
through a smarter front door. Establish the Edge Score engine.

-   Edge Score engine + match_markets data layer

-   Daily Brief page with Top Picks rail + Edge Leaderboard

-   Match Feed card redesign with EdgeBadge and SignalTags

-   Overview tab: Edge summary block + plain-English narrative
    (template-based)

-   Value tab inside Match Detail

-   Navigation restructure (Today / Matches / Leagues / Tools / Account)

**Phase 2 --- Breadth (Close the DataGaffer feature gap)**

Goal: give power users the full Bloomberg backend. No feature parity
gaps vs competitors.

-   League Hub + Zone Views (Goal Zone, Shot Zone, Corner Zone, Player
    Props)

-   H2H tab inside Match Detail

-   Value Finder (/tools/value-finder) --- cross-match version

-   Parlay Builder (/tools/parlay-builder)

-   1st Half toggle across all Match Detail tabs

**Phase 3 --- Retention & Personalization**

Goal: create daily habit and competitive lock-in.

-   User preferences: followed leagues, preferred markets, edge
    threshold defaults

-   Personalized Daily Brief filtered to user preferences

-   Push/email notifications: lineup confirmed alerts, odds drift alerts
    for saved picks

-   Pick performance tracking: historical accuracy of Bootroom\'s HIGH
    confidence picks

-   LLM-powered match narratives replacing template system

*Bootroom Product Spec v1.0 --- Iterate freely. This is a starting
point, not a contract.*
