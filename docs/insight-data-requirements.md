# Insight Data Requirements

This doc maps each market to the minimum data we need from API-Football.

## Core entities
- Fixture metadata (teams, date, venue, status)
- Team match stats (shots, SOT, corners, goals)
- Player match stats (shots, SOT, goals, assists, minutes)

---

## Match markets (feed)

### Match result (1X2), double chance, draw no bet
- Goals for/against per team
- Shots for/against
- SOT for/against

### Total goals (O/U)
- Goals per match (combined)

### Team totals (O/U)
- Team goals per match (home/away splits)
- Opponent goals allowed

### BTTS yes/no
- Both teams scored in match
- Team scoring frequency

### Correct score bands
- Final score distributions (from historical match results)

### 1H result / 1H goals O/U
- Halftime scores (goals at HT)

### 2H goals O/U
- Fulltime vs halftime scores (2H goals = FT - HT)

### Higher scoring half
- 1H vs 2H goal counts

### Win either half
- Half-time and full-time splits per team

### Total corners / team corners / most corners
- Corners per team per match

### Team shots / team SOT
- Shots and SOT per team per match

---

## Player markets (detail only)

### Anytime goalscorer
- Player goals per match
- Team total shots (context)

### Player shots / SOT
- Player shots and SOT per match
- Minutes played

### Player assists
- Player assists per match
- Key passes (if available)

---

## API-Football endpoints used
- `/fixtures` (fixtures, scores, venue)
- `/fixtures/statistics` (team stats: shots, SOT, corners)
- `/fixtures/players` (player stats: shots, SOT, goals, assists, minutes)

If any field is missing, the related insight should be suppressed.
