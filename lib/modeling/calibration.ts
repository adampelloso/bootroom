import calibrationData from "@/lib/modeling/calibration-data.json";

type MarketKey = "1X2" | "OU_2.5";
type OneX2Outcome = "H" | "D" | "A";
type OuOutcome = "Over" | "Under";

type CalibrationTable = {
  markets: {
    [market in MarketKey]?: {
      [outcome: string]: {
        xs: number[];
        ys: number[];
      };
    };
  };
};

const CALIBRATION = calibrationData as CalibrationTable;

function applyTable(raw: number, xs: number[], ys: number[]): number {
  if (!Number.isFinite(raw) || raw < 0 || raw > 1 || xs.length === 0 || ys.length === 0) {
    return raw;
  }

  const x0 = xs[0];
  const xN = xs[xs.length - 1];

  if (raw <= x0) return ys[0];
  if (raw >= xN) return ys[ys.length - 1];

  // Find interval [xs[i], xs[i+1]] containing raw.
  let lo = 0;
  let hi = xs.length - 2;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= raw && raw <= xs[mid + 1]) {
      const xL = xs[mid];
      const xR = xs[mid + 1];
      const yL = ys[mid];
      const yR = ys[mid + 1];
      if (xR === xL) return yL;
      const t = (raw - xL) / (xR - xL);
      return yL + t * (yR - yL);
    }
    if (raw < xs[mid]) {
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  return raw;
}

export function applyCalibration(
  market: MarketKey,
  outcome: OneX2Outcome | OuOutcome,
  rawProb: number,
): number {
  const marketTable = CALIBRATION.markets[market];
  if (!marketTable) return rawProb;
  const entry = marketTable[outcome];
  if (!entry) return rawProb;
  return applyTable(rawProb, entry.xs, entry.ys);
}

