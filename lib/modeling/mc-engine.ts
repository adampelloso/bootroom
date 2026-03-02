export interface MatchSimulationRequest {
  lambdaHomeGoals: number;
  lambdaAwayGoals: number;
  lambdaHomeCorners?: number;
  lambdaAwayCorners?: number;
  simulations?: number;
  randomSeed?: number;
  /** Std dev of shared tempo factor; 0 = independent Poisson. */
  tempoStd?: number;
  /** Dixon-Coles ρ parameter for low-score correction. Default: -0.04. Set 0 to disable. */
  dixonColesRho?: number;
}

export interface ScorelineDistribution {
  /** key is \"home-away\" (e.g. \"2-1\") */
  [scoreline: string]: number;
}

export interface MatchSimulationResult {
  totalSimulations: number;
  scorelines: ScorelineDistribution;
  pHomeWin: number;
  pDraw: number;
  pAwayWin: number;
  pBTTS: number;
  pO25: number;
  pO35: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  expectedHomeCorners?: number;
  expectedAwayCorners?: number;
}

function createRng(seed?: number): () => number {
  if (seed == null) return Math.random;
  // Simple LCG for reproducibility (not cryptographically secure).
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function samplePoisson(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda);
  let p = 1;
  let k = 0;
  do {
    k += 1;
    p *= rng();
  } while (p > L);
  return k - 1;
}

/**
 * Dixon-Coles (1997) correction for low-scoring games.
 * Independent Poisson underestimates draws and low-score outcomes because
 * real football has tactical dependencies (e.g. teams parking the bus).
 *
 * The correction multiplies probabilities for {0-0, 1-0, 0-1, 1-1} by:
 *   τ(0,0) = 1 - λ·μ·ρ
 *   τ(1,0) = 1 + μ·ρ
 *   τ(0,1) = 1 + λ·ρ
 *   τ(1,1) = 1 - ρ
 *
 * ρ (rho) is typically negative (-0.03 to -0.07), which:
 *   - Increases P(0-0) — fewer goals than independent model expects
 *   - Increases P(1-1) — more "fair" 1-1 draws
 *   - Decreases P(1-0) and P(0-1) — adjusts single-goal games
 */
function applyDixonColesCorrection(
  result: MatchSimulationResult,
  lambdaHome: number,
  lambdaAway: number,
  rho: number = -0.04,
): MatchSimulationResult {
  if (rho === 0) return result;

  const n = result.totalSimulations;
  const adjusted: ScorelineDistribution = { ...result.scorelines };

  // Dixon-Coles τ multipliers for low-scoring outcomes
  const tau00 = 1 - lambdaHome * lambdaAway * rho;
  const tau10 = 1 + lambdaAway * rho;
  const tau01 = 1 + lambdaHome * rho;
  const tau11 = 1 - rho;

  const corrections: Record<string, number> = {
    "0-0": tau00,
    "1-0": tau10,
    "0-1": tau01,
    "1-1": tau11,
  };

  // Apply corrections (multiply raw counts by τ)
  let totalWeight = 0;
  for (const [key, count] of Object.entries(adjusted)) {
    const tau = corrections[key] ?? 1;
    adjusted[key] = count * tau;
    totalWeight += adjusted[key];
  }

  // Renormalize so probabilities sum to 1
  const scale = n / totalWeight;
  for (const key of Object.keys(adjusted)) {
    adjusted[key] *= scale;
  }

  // Recompute derived metrics from adjusted scoreline distribution
  let homeWins = 0, draws = 0, awayWins = 0;
  let btts = 0, o25 = 0, o35 = 0;
  let sumHG = 0, sumAG = 0;

  for (const [key, weight] of Object.entries(adjusted)) {
    const [hStr, aStr] = key.split("-");
    const gh = parseInt(hStr);
    const ga = parseInt(aStr);

    if (gh > ga) homeWins += weight;
    else if (gh === ga) draws += weight;
    else awayWins += weight;

    if (gh > 0 && ga > 0) btts += weight;
    if (gh + ga >= 3) o25 += weight;
    if (gh + ga >= 4) o35 += weight;
    sumHG += gh * weight;
    sumAG += ga * weight;
  }

  const inv = 1 / n;

  return {
    ...result,
    scorelines: adjusted,
    pHomeWin: homeWins * inv,
    pDraw: draws * inv,
    pAwayWin: awayWins * inv,
    pBTTS: btts * inv,
    pO25: o25 * inv,
    pO35: o35 * inv,
    expectedHomeGoals: sumHG * inv,
    expectedAwayGoals: sumAG * inv,
  };
}

export function simulateMatch(req: MatchSimulationRequest): MatchSimulationResult {
  const simulations = req.simulations ?? 100000;
  const rng = createRng(req.randomSeed);
  const tempoStd = req.tempoStd ?? 0;

  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let btts = 0;
  let o25 = 0;
  let o35 = 0;
  let sumHomeGoals = 0;
  let sumAwayGoals = 0;
  let sumHomeCorners = 0;
  let sumAwayCorners = 0;

  const scorelines: ScorelineDistribution = {};

  for (let i = 0; i < simulations; i++) {
    let scale = 1;
    if (tempoStd > 0) {
      // Approximate N(0, tempoStd^2) via Box–Muller.
      const u1 = Math.max(rng(), 1e-12);
      const u2 = rng();
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const z = z0 * tempoStd;
      scale = Math.max(0.25, 1 + z);
    }

    const gh = samplePoisson(req.lambdaHomeGoals * scale, rng);
    const ga = samplePoisson(req.lambdaAwayGoals * scale, rng);

    const key = `${gh}-${ga}`;
    scorelines[key] = (scorelines[key] ?? 0) + 1;

    sumHomeGoals += gh;
    sumAwayGoals += ga;

    if (gh > ga) homeWins += 1;
    else if (gh === ga) draws += 1;
    else awayWins += 1;

    if (gh > 0 && ga > 0) btts += 1;

    const totalGoals = gh + ga;
    if (totalGoals >= 3) o25 += 1;
    if (totalGoals >= 4) o35 += 1;

    if (req.lambdaHomeCorners != null && req.lambdaAwayCorners != null) {
      const ch = samplePoisson(req.lambdaHomeCorners, rng);
      const ca = samplePoisson(req.lambdaAwayCorners, rng);
      sumHomeCorners += ch;
      sumAwayCorners += ca;
    }
  }

  const inv = 1 / simulations;

  const rawResult: MatchSimulationResult = {
    totalSimulations: simulations,
    scorelines,
    pHomeWin: homeWins * inv,
    pDraw: draws * inv,
    pAwayWin: awayWins * inv,
    pBTTS: btts * inv,
    pO25: o25 * inv,
    pO35: o35 * inv,
    expectedHomeGoals: sumHomeGoals * inv,
    expectedAwayGoals: sumAwayGoals * inv,
    expectedHomeCorners:
      req.lambdaHomeCorners != null ? sumHomeCorners * inv : undefined,
    expectedAwayCorners:
      req.lambdaAwayCorners != null ? sumAwayCorners * inv : undefined,
  };

  // Apply Dixon-Coles correction for low-scoring games
  return applyDixonColesCorrection(
    rawResult,
    req.lambdaHomeGoals,
    req.lambdaAwayGoals,
    req.dixonColesRho ?? -0.04,
  );
}

