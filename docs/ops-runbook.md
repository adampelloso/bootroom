# Bootroom Ops Runbook

## Core SLO
- Daily core pipeline must publish fixtures + odds + sims + KV at least once per 24h.
- Intraday refresh should run every 30m.

## Health checks
- Smoke: `node scripts/qa-runtime-smoke.mjs`
- Core freshness: `node scripts/qa-runtime-freshness.mjs`
- Referral readiness: `node scripts/qa-referral-readiness.mjs`
- Historical season completeness: `node scripts/verify-required-seasons.mjs`

## Migrations
- Apply safe migrations: `node scripts/migrate-safe.mjs`
- CI deploy runs migration automatically before deploy.

## Incident triage
1. Check GitHub Actions: deploy, daily-ingest, intraday-refresh, enrichment-refresh, health-monitor.
2. If app 500s on auth/session endpoints, run migration safety script.
3. If matches/today empty, check core freshness + odds coverage in daily/intraday logs.
4. If enrichment stale >48h, inspect enrichment workflow step timeouts/errors.

## Recovery commands
- Trigger core run: `gh workflow run daily-ingest.yml --ref main`
- Trigger intraday run: `gh workflow run intraday-refresh.yml --ref main`
- Trigger enrichment run: `gh workflow run enrichment-refresh.yml --ref main`
- Trigger health monitor: `gh workflow run health-monitor.yml --ref main`
