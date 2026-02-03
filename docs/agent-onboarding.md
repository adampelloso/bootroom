# Agent Onboarding Checklist

Goal: get a new agent productive in 5–10 minutes with zero overlap.

---

## 1) Read these first (5 minutes)
- `CONTRIBUTING.md`
- `docs/workstreams.md`
- `docs/insight-market-map.md`

## 2) Pick a stream and create a branch
Example:
```
git checkout -b insight-market-templates
```

## 3) Confirm your file boundaries
- Only edit files listed in your workstream.
- If you must touch shared files, coordinate first.

## 4) Know the product constraints
- No betting terms in UI copy.
- Odds are internal only; never show them.
- Feed = match markets only.
- Player props only in match detail.

## 5) Do Not Touch (global)
- `app/page.tsx` unless you are in the feed UI stream.
- `lib/insights/catalog.ts` unless you are in the insights template stream.
- `lib/insights/select.ts` unless you are in the selection stream.
- `lib/providers/*` unless you are in the data stream.

## 6) How to sanity-check your work
- Ensure UI still renders in dev (no runtime errors).
- Keep template placeholders valid (`{home}`, `{away}`, `{value}`, `{l5}`, `{l10}`, `{n}`, `{k}`, `{pct}`, `{diff}`, `{against}`).
- Keep styling consistent with `docs/feed-ui-reference.md`.

## 7) PR summary format
Use this structure:
```
What changed:
- ...

Why:
- ...

Notes/assumptions:
- ...
```

---

If anything is unclear, update `docs/workstreams.md` for clarity.
