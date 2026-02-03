# Project Handbook

Single source of truth for onboarding, decisions, and collaboration.

---

## 1) Product constraints
- UI language must be neutral (no betting terms).
- Odds are used only internally; never shown in UI.
- Feed shows match markets only.
- Player props appear only in match detail.

---

## 2) Sources of truth
- Product spec: `spec.md`
- Market map: `docs/insight-market-map.md`
- UI reference: `docs/feed-ui-reference.md`
- Workstreams: `docs/workstreams.md`

---

## 3) Quick start (agents)
1. Read:
   - `CONTRIBUTING.md`
   - `docs/workstreams.md`
   - `docs/insight-market-map.md`
2. Create your branch (prefix `codex/`).
3. Stay inside your file boundaries.

---

## 4) Workstreams (summary)
See `docs/workstreams.md` for full copy/paste prompts.

---

## 5) API keys / environment
If you are working on data ingestion, use the placeholders in `.env.example`.
No real keys are required unless explicitly assigned to the data stream.

---

## 6) Review standards
- Keep changes scoped.
- Update relevant docs when changing behavior.
- Provide a short PR summary (what/why/notes).
