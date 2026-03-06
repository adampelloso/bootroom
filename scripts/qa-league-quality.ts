import { getLeagueQualityMetrics } from "@/lib/league-quality";

function pct(v: number | null): string {
  if (v == null) return "-";
  return `${(v * 100).toFixed(1)}%`;
}

function fmt(v: number | null, digits = 3): string {
  if (v == null) return "-";
  return v.toFixed(digits);
}

async function main() {
  const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  const rows = getLeagueQualityMetrics(date);

  const withTodayMatches = rows.filter((r) => r.todayUpcoming > 0);
  const eligible = withTodayMatches.filter((r) => r.todayEligible);
  const blocked = withTodayMatches.filter((r) => !r.todayEligible);

  console.log(`League quality QA for ${date}`);
  console.log(
    `today leagues=${withTodayMatches.length}, eligible=${eligible.length}, blocked=${blocked.length}`
  );

  console.log("\nEligible today:");
  for (const r of eligible.sort((a, b) => a.label.localeCompare(b.label))) {
    console.log(
      `${r.label.padEnd(24)} lid=${String(r.leagueId).padEnd(4)} type=${r.type.padEnd(6)} ` +
        `upcoming=${String(r.todayUpcoming).padStart(2)} sim=${String(r.todaySimulated).padStart(2)} ` +
        `cov=${pct(r.simCoverage).padStart(6)} hist=${String(r.historicalFixtures).padStart(5)} ` +
        `brier=${fmt(r.backtestBrier1x2)} acc=${pct(r.backtestAcc1x2)}`
    );
  }

  console.log("\nBlocked today:");
  for (const r of blocked.sort((a, b) => a.label.localeCompare(b.label))) {
    console.log(
      `${r.label.padEnd(24)} lid=${String(r.leagueId).padEnd(4)} type=${r.type.padEnd(6)} ` +
        `upcoming=${String(r.todayUpcoming).padStart(2)} sim=${String(r.todaySimulated).padStart(2)} ` +
        `cov=${pct(r.simCoverage).padStart(6)} hist=${String(r.historicalFixtures).padStart(5)} ` +
        `brier=${fmt(r.backtestBrier1x2)} acc=${pct(r.backtestAcc1x2)} ` +
        `reasons=${r.reasons.join(",")}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
