import fs from "fs";
import path from "path";
import { SUPPORTED_COMPETITIONS, type CompetitionType } from "@/lib/leagues";

export interface LeagueQualityMetrics {
  leagueId: number;
  label: string;
  type: CompetitionType;
  historicalFixtures: number;
  todayUpcoming: number;
  todaySimulated: number;
  simCoverage: number | null;
  backtestSample: number;
  backtestBrier1x2: number | null;
  backtestAcc1x2: number | null;
  todayEligible: boolean;
  reasons: string[];
}

type BacktestLeagueRow = {
  matches: number;
  markets: Array<{
    market: string;
    brier_score: number;
    accuracy: number;
    sample_size: number;
  }>;
};

const THRESHOLDS = {
  league: {
    minHistoricalFixtures: 250,
    minBacktestSample: 200,
    maxBrier1x2: 0.215,
    minAcc1x2: 0.44,
    minTodaySimCoverage: 0.75,
  },
  cup: {
    minHistoricalFixtures: 120,
    minTodaySimCoverage: 0.75,
  },
};

function parseDateOnly(v: string | undefined): string | null {
  if (!v) return null;
  if (v.length >= 10 && v[4] === "-" && v[7] === "-") return v.slice(0, 10);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function readJson<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function loadHistoricalFixtureCounts(dataDir: string): Map<number, number> {
  const out = new Map<number, number>();
  if (!fs.existsSync(dataDir)) return out;
  const files = fs.readdirSync(dataDir);
  const fixtureFiles = files.filter((f) => /^\d+-\d+-fixtures\.json$/.test(f));
  for (const file of fixtureFiles) {
    const leagueId = Number(file.split("-")[0]);
    if (!Number.isFinite(leagueId)) continue;
    const arr = readJson<unknown[]>(path.join(dataDir, file));
    const count = Array.isArray(arr) ? arr.length : 0;
    out.set(leagueId, (out.get(leagueId) ?? 0) + count);
  }
  return out;
}

function loadTodayCoverage(
  dataDir: string,
  date: string
): { upcomingByLeague: Map<number, number>; simulatedByLeague: Map<number, number> } {
  const upcomingByLeague = new Map<number, number>();
  const simulatedByLeague = new Map<number, number>();

  const upcoming = readJson<Array<{ date?: string; leagueId?: number }>>(
    path.join(dataDir, "upcoming-fixtures.json")
  );
  if (Array.isArray(upcoming)) {
    for (const row of upcoming) {
      const rowDate = parseDateOnly(row.date);
      const lid = Number(row.leagueId);
      if (!rowDate || rowDate !== date || !Number.isFinite(lid)) continue;
      upcomingByLeague.set(lid, (upcomingByLeague.get(lid) ?? 0) + 1);
    }
  }

  const sims = readJson<{
    fixtures?: Record<string, { meta?: { leagueId?: number } }>;
  }>(path.join(dataDir, "simulations", `${date}.json`));
  const fixtureMap = sims?.fixtures ?? {};
  for (const v of Object.values(fixtureMap)) {
    const lid = Number(v?.meta?.leagueId);
    if (!Number.isFinite(lid)) continue;
    simulatedByLeague.set(lid, (simulatedByLeague.get(lid) ?? 0) + 1);
  }

  return { upcomingByLeague, simulatedByLeague };
}

function loadBacktestByLeague(backtestPath: string): Map<number, BacktestLeagueRow> {
  const out = new Map<number, BacktestLeagueRow>();
  const parsed = readJson<{ by_league?: Record<string, BacktestLeagueRow> }>(backtestPath);
  if (!parsed?.by_league) return out;
  for (const [k, v] of Object.entries(parsed.by_league)) {
    const lid = Number(k);
    if (!Number.isFinite(lid)) continue;
    out.set(lid, v);
  }
  return out;
}

function evaluateLeague(metrics: Omit<LeagueQualityMetrics, "todayEligible" | "reasons">): {
  todayEligible: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (metrics.type === "cup") {
    if (metrics.historicalFixtures < THRESHOLDS.cup.minHistoricalFixtures) {
      reasons.push(`history<${THRESHOLDS.cup.minHistoricalFixtures}`);
    }
    if (
      metrics.todayUpcoming > 0 &&
      ((metrics.simCoverage ?? 0) < THRESHOLDS.cup.minTodaySimCoverage)
    ) {
      reasons.push(`simCoverage<${Math.round(THRESHOLDS.cup.minTodaySimCoverage * 100)}%`);
    }
  } else {
    if (metrics.historicalFixtures < THRESHOLDS.league.minHistoricalFixtures) {
      reasons.push(`history<${THRESHOLDS.league.minHistoricalFixtures}`);
    }
    if (metrics.backtestSample < THRESHOLDS.league.minBacktestSample) {
      reasons.push(`backtestN<${THRESHOLDS.league.minBacktestSample}`);
    }
    if (metrics.backtestBrier1x2 == null || metrics.backtestBrier1x2 > THRESHOLDS.league.maxBrier1x2) {
      reasons.push(`brier>${THRESHOLDS.league.maxBrier1x2.toFixed(3)}`);
    }
    if (metrics.backtestAcc1x2 == null || metrics.backtestAcc1x2 < THRESHOLDS.league.minAcc1x2) {
      reasons.push(`acc<${Math.round(THRESHOLDS.league.minAcc1x2 * 100)}%`);
    }
    if (
      metrics.todayUpcoming > 0 &&
      ((metrics.simCoverage ?? 0) < THRESHOLDS.league.minTodaySimCoverage)
    ) {
      reasons.push(`simCoverage<${Math.round(THRESHOLDS.league.minTodaySimCoverage * 100)}%`);
    }
  }
  return { todayEligible: reasons.length === 0, reasons };
}

export function getLeagueQualityMetrics(date: string): LeagueQualityMetrics[] {
  const root = process.cwd();
  const dataDir = path.join(root, "data");
  const historicalByLeague = loadHistoricalFixtureCounts(dataDir);
  const { upcomingByLeague, simulatedByLeague } = loadTodayCoverage(dataDir, date);
  const backtestByLeague = loadBacktestByLeague(path.join(dataDir, "backtests", "backtest-summary.json"));

  return SUPPORTED_COMPETITIONS.map((c) => {
    const backtest = backtestByLeague.get(c.id);
    const oneX2 = backtest?.markets?.find((m) => m.market === "1X2");
    const todayUpcoming = upcomingByLeague.get(c.id) ?? 0;
    const todaySimulated = simulatedByLeague.get(c.id) ?? 0;
    const simCoverage = todayUpcoming > 0 ? todaySimulated / todayUpcoming : null;

    const base = {
      leagueId: c.id,
      label: c.label,
      type: c.type,
      historicalFixtures: historicalByLeague.get(c.id) ?? 0,
      todayUpcoming,
      todaySimulated,
      simCoverage,
      backtestSample: oneX2?.sample_size ?? 0,
      backtestBrier1x2: oneX2?.brier_score ?? null,
      backtestAcc1x2: oneX2?.accuracy ?? null,
    };
    const evald = evaluateLeague(base);
    return { ...base, ...evald };
  });
}

export function getTodayEligibleLeagueIds(date: string): number[] {
  return getLeagueQualityMetrics(date)
    .filter((x) => x.todayEligible)
    .map((x) => x.leagueId);
}
