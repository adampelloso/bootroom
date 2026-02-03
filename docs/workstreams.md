# Workstreams and parallelization guide

Goal: let 3–5 agents pick independent streams with minimal conflict.

---

# COPY/PASTE WORKSTREAM BRIEFS (5)

## 1) INSIGHTS: MARKET TEMPLATES

**Branch name**  
`insight-market-templates`

**Goal**  
Replace subjective highlights with objective, numeric templates aligned to markets.

**Primary files**  
- `lib/insights/catalog.ts`  
- `docs/insight-market-map.md`  
- `docs/insight-display-staging.md`

**What to do**  
- Rewrite headline/support templates to match the market map.
- Use neutral, objective wording (no betting language).
- Ensure placeholder usage matches `stub-context` fields.

**Do not touch**  
- Feed UI components.
- Data/provider scaffolding.

**Validation**  
- Feed still renders 3 highlights per match.
- Templates are numeric and understandable.

---

## 2) INSIGHTS: SELECTION + POOLS

**Branch name**  
`insight-selection`

**Goal**  
Split feed vs detail pools and make selection consistent if needed.

**Primary files**  
- `lib/insights/select.ts`  
- `lib/build-feed.ts`  
- `lib/insights/catalog.ts` (pool keys only)  
- `docs/insight-display-staging.md`

**What to do**  
- Feed: match markets only.  
- Detail: match + player markets.  
- Optional: deterministic selection per fixture.

**Do not touch**  
- UI components.  
- Template wording (owned by workstream #1).

**Validation**  
- Feed shows only match-level highlights.  
- Detail can include player props.

---

## 3) UI: MATCH DETAIL + PLAYER PROPS

**Branch name**  
`match-detail-player-props-ui`

**Goal**  
Create a dedicated player props section in match detail.

**Primary files**  
- `app/match/[id]/page.tsx`  
- `app/components/*` (if needed)  
- `docs/feed-ui-reference.md` (only if visual changes)

**What to do**  
- Add player props section (shots, SOT, goalscorer, assists).  
- Keep typography consistent with feed.

**Do not touch**  
- Feed behavior or feed highlights.

**Validation**  
- Feed remains match-only.  
- Match detail includes player props layout.

---

## 4) UI: EXPORT POLISH

**Branch name**  
`export-polish`

**Goal**  
Align export view visuals with current feed styling.

**Primary files**  
- `app/match/[id]/export/page.tsx`  
- `docs/feed-ui-reference.md` (if styling notes change)

**What to do**  
- Remove any legacy bullets or off-style elements.  
- Match typography and spacing to feed.

**Do not touch**  
- Insight selection logic.

**Validation**  
- Export view feels consistent with feed.

---

## 5) DATA: PROVIDER SCAFFOLD

**Branch name**  
`data-pipeline-scaffold`

**Goal**  
Prepare data layer for real ingestion (no DB required yet).

**Primary files**  
- `lib/providers/*`  
- `lib/normalization/*` (new)  
- `docs/mvp-scaffold.md`

**What to do**  
- Outline normalization interfaces.  
- Stub ingestion pipeline (no live keys/DB).

**Do not touch**  
- UI, insight templates, or selection.

**Validation**  
- Code compiles; providers remain mock-safe.

---

## Ownership boundaries
- If you touch templates, update `docs/insight-market-map.md`.
- If you change feed UI, update `docs/feed-ui-reference.md`.
- If you change staging logic, update `docs/insight-display-staging.md`.

## Review checklist
- Keep UI language neutral (no betting terms).
- Avoid touching other streams’ core files.
- Provide a short summary in the PR description (what changed + why).
