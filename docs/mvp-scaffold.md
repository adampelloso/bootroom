# MVP scaffold summary

First four steps from the Bootroom plan are done.

## 1. Spec conversion
- **spec.md.rtf** → **spec.md** (plain markdown at repo root). RTF control codes stripped; structure preserved.

## 2. Next.js + provider + mock data
- **Stack:** Next.js 15 (App Router) + TypeScript + Tailwind.
- **Provider interface:** `lib/providers/types.ts` — `FootballProvider` with `getFixtures`, `getFixture`, `getFixtureStats`, `getFixturePlayers`, `getOdds`, etc. App and normalization use this only.
- **API-Football types:** `lib/api-football-types.ts` — response shapes for fixtures, fixture statistics, fixture players, odds so mock and real provider return the same format.
- **Mock provider:** `lib/providers/mock-provider.ts` + `lib/providers/mock-data.ts` — `MockFootballProvider` returning API-Football-shaped data (3 EPL fixtures: 2 upcoming, 1 finished with stats/players). No API key or DB required.

## 3. Feed, match detail, export UI
- **Feed:** `app/page.tsx` — sticky header (title + date navigator), league filter pills, scrollable match list with full-width black dividers. Cards show GMT time + stadium, stacked team names, right chevron to match detail, and highlights (first is inverse “Key Insight”).
- **Match detail:** `app/match/[id]/page.tsx` — matchup header matches feed styling (time + venue, stacked team names), insights grouped by family, link to export.
- **Export:** `app/match/[id]/export/page.tsx` — minimal chrome, Bootroom watermark, aspect ratio toggle (1:1, 9:16) for screenshot-ready share.
- **API routes:** `GET /api/feed`, `GET /api/match/:id` for external or client use. Pages call `getFeedMatches` / `getMatchDetail` from `lib/build-feed.ts` directly in server components.

## 4. Data pipeline scaffold (no DB yet)
- **Provider registry:** `lib/providers/registry.ts` — resolves active provider with a safe fallback to mock while real ingestion is wired.
- **Normalization types:** `lib/normalization/types.ts` — internal shapes for fixtures, stats, players, odds, and snapshot bundles.
- **Normalization helpers:** `lib/normalization/*.ts` — converts API-Football responses into internal normalized records.
- **Ingestion stub:** `lib/normalization/pipeline.ts` — builds an in-memory snapshot and fixture bundles (ready for future DB writes).

## Run
- `npm install` then `npm run dev` — open http://localhost:3000 for feed; tap a card for match detail; use “Share / Export” for export view.
- `npm run build` — production build succeeds.

## Next (when you “make it work”)
- Add normalization layer (provider response → internal schema).
- Add daily job + ApiFootballProvider + DB.
- Replace stub highlights with real insight engine (features, scoring, ranking).
