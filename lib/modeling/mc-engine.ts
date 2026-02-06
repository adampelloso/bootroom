export interface MatchSimulationRequest {
  lambdaHomeGoals: number;
  lambdaAwayGoals: number;
  lambdaHomeCorners?: number;
  lambdaAwayCorners?: number;
  simulations?: number;
  randomSeed?: number;
  /** Std dev of shared tempo factor; 0 = independent Poisson. */
  tempoStd?: number;
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

export function simulateMatch(req: MatchSimulationRequest): MatchSimulationResult {
  const simulations = req.simulations ?? 50000;
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

  return {
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
}

