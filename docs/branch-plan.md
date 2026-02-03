# Branch plan and handoff guide

This repo is ready for parallel work. Use the branch names listed below (no prefix).

## Proposed branches (short-term)

1. **`insight-market-templates`**
   - Goal: implement the market→template mapping from `docs/insight-market-map.md`.
   - Update `lib/insights/catalog.ts` templates to be **objective, numeric**, and market-aligned.
   - Keep **feed** match-only and **detail** match + player props.

2. **`insight-selection`**
   - Goal: split feed vs detail pools in code (match-only feed, player props in detail).
   - Update `lib/insights/select.ts` and `lib/build-feed.ts` if needed.
   - Ensure feed highlights are deterministic per fixture (optional improvement).

3. **`match-detail-player-props-ui`**
   - Goal: design the player props section in match detail.
   - Ensure no player props appear in feed.
   - Keep layout consistent with feed typography.

4. **`data-pipeline-scaffold`**
   - Goal: lay groundwork for API-Football ingestion.
   - Optional: define normalization tables, data fetch scaffolding, and storage plan.

## Handoff checklist for each branch

- Read `spec.md` and `docs/insight-market-map.md`.
- If modifying insights:
  - Update templates in `lib/insights/catalog.ts`.
  - Note changes in `docs/insight-display-staging.md`.
- If modifying UI:
  - Update `docs/feed-ui-reference.md`.
- Keep UI language neutral (no betting terms), even if markets are driving the logic.

## Review expectations

- Include screenshots or describe UI changes in PR notes.
- Call out any data assumptions (e.g., using halftime scores for 1H markets).
- Keep changes scoped to the branch goal to ease review.
