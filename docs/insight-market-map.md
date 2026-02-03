# Insight Market Map (MVP)

Purpose: map **bettable markets** to **objective, neutral highlights**. These templates avoid betting language while still aligning to common markets. This doc is the source for the feed/detail insight shortlist.

Notes:
- Placeholders use existing catalog fields: `{home}`, `{away}`, `{value}`, `{l5}`, `{l10}`, `{n}`, `{k}`, `{pct}`, `{diff}`, `{against}`.
- “L5” and “L10” are rolling window averages (or rates).
- The **feed** should use **match markets only**. **Player markets** live in match detail.

---

## Match Markets (Feed)

### 1) Match result (1X2)
Objective signals that correlate to result without saying “win”.
- `{home} avg {l5} goals for (L5)`
- `{away} avg {against} goals allowed (L5)`
- `{home} SOT per match (L5): {l5}`

### 2) Double chance (1X / 12 / X2)
- `{home} avg {l5} goals for (L10)`
- `{away} avg {against} goals allowed (L10)`
- `{home} shots diff +{diff} (L5)`

### 3) Draw no bet
- `{home} goals allowed (L5): {against}`
- `{away} goals allowed (L5): {against}`
- `Combined goals per match (L5): {value}`

### 4) Total goals O/U (0.5 / 1.5 / 2.5 / 3.5)
- `Combined goals per match (L5): {value}`
- `Both sides score in {k} of last {n}`
- `{home} + {away} goals avg (L10): {value}`

### 5) Team totals (home/away O/U)
- `{home} avg {l5} goals at home (L5)`
- `{away} avg {l5} goals away (L5)`
- `{home} goals allowed (L5): {against}`

### 6) BTTS yes/no
- `Both sides score in {k} of last {n}`
- `BTTS rate: {pct}%`
- `Clean sheets in {k} of last {n}`

### 7) Correct score bands / clustering
- `Common scoreband in {k} of last {n}`
- `Total goals avg (L5): {value}`

### 8) 1H result (1X2)
- `First-half goals in {k} of last {n}`
- `{home} 1H goals rate: {pct}%`

### 9) 1H total goals (O/U 0.5 / 1.5)
- `1H goals avg (L5): {value}`
- `First-half goals in {k} of last {n}`

### 10) 2H total goals (O/U 0.5 / 1.5)
- `2H goals avg (L5): {value}`
- `Second-half goals in {k} of last {n}`

### 11) Higher scoring half
- `1H goals share: {pct}%`
- `2H goals share: {pct}%`

### 12) Win either half
- `{home} half-win rate (L5): {pct}%`
- `{away} half-win rate (L5): {pct}%`

### 13) Total corners (O/U 8.5 / 9.5 / 10.5)
- `Combined corners per match (L5): {value}`
- `Over 10.5 corners in {k} of last {n}`

### 14) Team corners (home/away O/U)
- `{home} corners per match (L5): {l5}`
- `{away} corners per match (L5): {l5}`

### 15) Most corners
- `{home} corners diff +{diff} (L5)`
- `{away} corners diff +{diff} (L5)`

### 16) Team shots (if used)
- `{home} shots per match (L5): {l5}`
- `{away} shots per match (L5): {l5}`

### 17) Team shots on target
- `{home} SOT per match (L5): {l5}`
- `{away} SOT per match (L5): {l5}`

---

## Player Markets (Detail Only)

### 18) Anytime goalscorer
- `Top shooter share: {pct}%`
- `Player shots (L5): {l5}`

### 19) Player shots
- `Player shots (L5): {l5}`
- `Shots (L5 vs L10): {l5} / {l10}`

### 20) Player shots on target
- `Player SOT (L5): {l5}`
- `SOT (L5 vs L10): {l5} / {l10}`

### 21) Player assists
- `Assists (L5): {l5}`
- `Key passes (L5): {l5}` (if available)

---

## Next steps
- Convert these into **catalog templates** (neutral wording).
- Split **feed pool** (match markets only) vs **detail pool** (match + player).
- Use odds *internally* only to rank by value (per spec).
