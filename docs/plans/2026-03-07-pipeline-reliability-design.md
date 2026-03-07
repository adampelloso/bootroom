# Pipeline Reliability Design (2026-03-07)

## Context
The existing daily workflow mixes core publish-critical tasks (fixtures, odds, simulations, KV publish) with heavy enrichment tasks (full season fixture backfill, player stats, H2H, injuries, lineups). This causes long runtimes and timeout/cancellation risk, making daily automation unreliable.

## Goal
Guarantee daily core product freshness while maximizing enrichment data volume over a 48-hour window.

## Approved Strategy
1. Split automation into two workflows:
- Core Daily Pipeline: must succeed daily and publish to KV.
- Enrichment Refresh Pipeline: runs independently, retries frequently, and never blocks core publish.
2. Keep intraday refresh for odds/sims near kickoff.
3. Add runtime bounds and per-step fault isolation in enrichment jobs.

## Core Daily Pipeline (SLA workflow)
- Runs daily at 06:00 UTC.
- Includes only:
  - fixture status sync
  - upcoming fixture ingest + DB sync
  - team metadata sync
  - odds ingest (retry passes)
  - simulations
  - QA gate for fixture/sim/odds coverage
  - full KV push
- Excludes heavy enrichment tasks.
- Timeout reduced to fail fast and surface issues quickly.

## Enrichment Refresh Pipeline (non-blocking)
- Runs on schedule (12-hour cadence) and manual dispatch.
- Performs:
  - season fixture incremental ingest
  - player stats refresh (skip-if-fresh)
  - sync fixtures to DB
  - H2H ingest
  - lineups ingest
  - injuries ingest
- Each heavy step has explicit step timeout and `continue-on-error` to prevent one failing source from blocking all others.
- Includes non-blocking freshness QA (48h target) for visibility.

## Freshness Policy
- Core data: daily guaranteed by core workflow + intraday refresh.
- Enrichment data: acceptable staleness up to 48h; warnings emitted if breached.

## Failure Model
- Core workflow failure => actionable incident.
- Enrichment failure => warning, auto-retry next run; no user-facing core outage.

## Validation Plan
- Observe 24h of scheduled runs:
  - 2+ intraday successful runs
  - 1 daily core run successful
  - 2 enrichment runs with no hard-fail of full workflow
- Confirm Today/Matches remain populated even if enrichment step errors.
