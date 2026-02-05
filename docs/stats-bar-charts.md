# Stats Bar Charts (Match Detail)

## Summary

Match detail stats are now shown as **bar chart trends** (last 10 games) with an **average line**, instead of a L5/L10/Season toggle. Each stat has its own chart; opponent is shown per bar. H2H view uses **two-bar comparison charts** (home vs away L10 average) per stat.

## Changes

### All tab – Home / Away

- **Removed**: Period toggle (L5 / L10 / Season) and the single rolling-stats table.
- **Added**: One bar chart per stat for the **last 10 games**:
  - Goals for, Goals against
  - Shots for, Shots against
  - Shots on target for/against
  - Corners for/against
  - BTTS (matches), Clean sheets
- Each chart:
  - One bar per game (oldest → newest).
  - **Opponent** shown under each bar (abbreviated; full name in tooltip).
  - **Average line** (dashed) for the L10 average.
- Data comes from ingested fixtures (`getTeamLastNMatchRows`); if there are fewer than 10 games, all available games are shown.

### H2H tab

- **Removed**: Period toggle and the comparison table.
- **Added**: One **comparison chart** per stat (same list as above), filtered by category (All / Goals / Control / Corners).
- Each chart has **two bars**: Home L10 average vs Away L10 average, with team labels and values.
- **Team colors**: API-Football’s `/teams` response does not include primary/secondary colors. The UI uses theme colors: `--bg-accent` for home, `--text-tertiary` for away. If the API adds team colors later, `H2HBarChart` already supports optional `homeColor` and `awayColor` props.

## Components

- **`StatTrendChart`**: Single stat, last-N bars + average line; shows opponent per bar.
- **`H2HBarChart`**: Two bars (home vs away) for one stat; optional team colors.
- **`SingleTeamTrendSection`**: Renders all `StatTrendChart`s for one team (Home or Away tab).
- **`H2HBarChartsSection`**: Renders all `H2HBarChart`s filtered by category.

## Data

- **`getTeamLastNMatchRows(teamName, n, asOfDate)`** (in `lib/insights/team-stats.ts`): Returns last N match rows with `opponentName` for trend charts.
- **`TeamMatchRow`**: Now includes `opponentName`; built from ingested fixture data (home/away team names).

## Technical notes

- Charts are CSS-only (no chart library): flex layout, divs for bars, dashed line for average.
- L10 averages are still computed by `getTeamStats` / `getMatchStats`; trend charts use the same ingested data as the old rolling stats.
