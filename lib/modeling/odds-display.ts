/**
 * Utilities for displaying implied odds alongside probabilities.
 */

export function probToDecimalOdds(prob: number): number {
  if (prob <= 0 || prob >= 1) return 0;
  return 1 / prob;
}

export function probToAmericanOdds(prob: number): string {
  const decimal = probToDecimalOdds(prob);
  if (decimal < 2) {
    return `-${Math.round((100 / (decimal - 1)))}`;
  }
  return `+${Math.round((decimal - 1) * 100)}`;
}

export function formatOddsDisplay(prob: number, format: "decimal" | "american" = "decimal"): string {
  if (format === "american") {
    return probToAmericanOdds(prob);
  }
  return probToDecimalOdds(prob).toFixed(2);
}
