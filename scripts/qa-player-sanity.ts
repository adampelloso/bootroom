import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import { predictLineup, predictLineupFromDb } from '@/lib/modeling/predicted-lineup';
import { getMatchPlayerSim } from '@/lib/modeling/player-sim';
import { estimateMatchGoalLambdas } from '@/lib/modeling/baseline-params';
import { resolveProvider } from '@/lib/providers/registry';
import { attachPlayerMarketComparison } from '@/lib/modeling/player-market-odds';
import { getInjuredPlayersByTeam, getRecentLineupsBatch } from '@/lib/db-queries';

function readEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const env: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return env;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key) continue;
    env[key] = rest.join('=').replace(/^"|"$/g, '');
  }
  return env;
}

async function main() {
  const env = readEnv();
  for (const [k, v] of Object.entries(env)) process.env[k] = process.env[k] ?? v;

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const fixtureRes = await client.execute({
    sql: `SELECT id, date, league_id, home_team_id, away_team_id, home_team_name, away_team_name
          FROM fixture
          WHERE status='NS' AND date = ? AND home_team_name LIKE 'Bayern%'
          LIMIT 1`,
    args: ['2026-03-06'],
  });
  if (fixtureRes.rows.length === 0) {
    console.log('No Bayern fixture found for QA date');
    return;
  }

  const f = fixtureRes.rows[0] as any;
  const fixtureDate = String(f.date).slice(0, 10);
  const teamIds = [Number(f.home_team_id), Number(f.away_team_id)];

  const [injuredMap, recentLineupsMap] = await Promise.all([
    getInjuredPlayersByTeam(teamIds),
    getRecentLineupsBatch(teamIds, fixtureDate, 10),
  ]);

  const homeInjured = injuredMap.get(Number(f.home_team_id));
  const awayInjured = injuredMap.get(Number(f.away_team_id));
  const homeRecent = recentLineupsMap.get(Number(f.home_team_id));
  const awayRecent = recentLineupsMap.get(Number(f.away_team_id));

  const homeLineup = (homeRecent && homeRecent.length > 0
    ? predictLineupFromDb(String(f.home_team_name), homeRecent, homeInjured)
    : null) ?? predictLineup(String(f.home_team_name), Number(f.league_id), fixtureDate, homeInjured);

  const awayLineup = (awayRecent && awayRecent.length > 0
    ? predictLineupFromDb(String(f.away_team_name), awayRecent, awayInjured)
    : null) ?? predictLineup(String(f.away_team_name), Number(f.league_id), fixtureDate, awayInjured);

  if (!homeLineup || !awayLineup) {
    console.log('Missing lineups for QA');
    return;
  }

  const lambdas = estimateMatchGoalLambdas(String(f.home_team_name), String(f.away_team_name), fixtureDate, Number(f.league_id));
  if (!lambdas) {
    console.log('Missing lambdas for QA');
    return;
  }

  const sim = getMatchPlayerSim(
    homeLineup,
    awayLineup,
    lambdas.lambdaHomeGoals,
    lambdas.lambdaAwayGoals,
    fixtureDate,
    Number(f.league_id),
    { simulations: 100000, randomSeed: Number(f.id), tempoStd: 0.15 }
  );

  const base = {
    home: sim.home.map((r) => ({
      playerId: r.playerId,
      name: r.name,
      position: r.position,
      confidence: r.confidence,
      anytimeScorerProb: r.anytimeScorerProb,
      anytimeAssistProb: r.anytimeAssistProb,
      expectedGoals: r.expectedGoals,
      expectedShots: r.expectedShots,
      expectedSOT: r.expectedSOT,
      expectedAssists: r.expectedAssists,
    })),
    away: sim.away.map((r) => ({
      playerId: r.playerId,
      name: r.name,
      position: r.position,
      confidence: r.confidence,
      anytimeScorerProb: r.anytimeScorerProb,
      anytimeAssistProb: r.anytimeAssistProb,
      expectedGoals: r.expectedGoals,
      expectedShots: r.expectedShots,
      expectedSOT: r.expectedSOT,
      expectedAssists: r.expectedAssists,
    })),
  };

  const provider = resolveProvider('api-football').provider;
  const oddsResponse = await provider.getOdds(Number(f.id));
  const withMarket = attachPlayerMarketComparison(base as any, oddsResponse);

  const players = [...withMarket.home, ...withMarket.away]
    .filter((p) => p.bookScorerOdds != null)
    .sort((a, b) => (b.anytimeScorerProb - a.anytimeScorerProb))
    .slice(0, 12)
    .map((p) => ({
      name: p.name,
      modelScorerPct: p.anytimeScorerProb * 100,
      bookOdds: p.bookScorerOdds,
      bookPct: (p.bookScorerProb ?? 0) * 100,
      edgePct: (p.scorerEdgeProb ?? 0) * 100,
    }));

  console.log(`Player Scorer QA: ${f.home_team_name} v ${f.away_team_name} (fixture ${f.id})`);
  for (const p of players) {
    console.log(`${p.name.padEnd(24)} model=${p.modelScorerPct.toFixed(1)}%  book=${p.bookOdds?.toFixed(2)} (${p.bookPct.toFixed(1)}%)  edge=${p.edgePct >= 0 ? '+' : ''}${p.edgePct.toFixed(1)}%`);
  }

  const kane = players.find((p) => p.name.toLowerCase().includes('kane'));
  if (kane) {
    console.log(`\nKane check: model=${kane.modelScorerPct.toFixed(1)}%, bookOdds=${kane.bookOdds?.toFixed(2)}, implied=${kane.bookPct.toFixed(1)}%, edge=${kane.edgePct >= 0 ? '+' : ''}${kane.edgePct.toFixed(1)}%`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
