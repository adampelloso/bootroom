/**
 * Utilities for displaying implied odds alongside probabilities.
 */

export type OddsFormat = "decimal" | "fractional" | "american";

export function probToDecimalOdds(prob: number): number {
  if (prob <= 0 || prob >= 1) return 0;
  return 1 / prob;
}

export function probToAmericanOdds(prob: number): string {
  const decimal = probToDecimalOdds(prob);
  if (decimal <= 1) return "—";
  if (decimal < 2) {
    return `-${Math.round((100 / (decimal - 1)))}`;
  }
  return `+${Math.round((decimal - 1) * 100)}`;
}

export function probToFractionalOdds(prob: number): string {
  const decimal = probToDecimalOdds(prob);
  if (decimal <= 1) return "—";
  const value = decimal - 1;
  if (!Number.isFinite(value) || value <= 0) return "—";
  const denominator = 100;
  let numerator = Math.round(value * denominator);
  let d = denominator;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(Math.abs(numerator), d);
  numerator = numerator / g;
  d = d / g;
  return `${numerator}/${d}`;
}

export function formatOddsDisplay(prob: number, format: OddsFormat = "decimal"): string {
  if (!Number.isFinite(prob) || prob <= 0 || prob >= 1) return "—";
  if (format === "american") {
    return probToAmericanOdds(prob);
  }
  if (format === "fractional") {
    return probToFractionalOdds(prob);
  }
  return probToDecimalOdds(prob).toFixed(2);
}
