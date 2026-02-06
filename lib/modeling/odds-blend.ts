import type { MarketProbabilities } from "@/lib/odds/the-odds-api";

export interface ModelProbabilities {
  home: number;
  draw: number;
  away: number;
  over_2_5?: number;
  under_2_5?: number;
}

export interface BlendContext {
  /** Number of recent matches per team we have stats for (approximate). */
  homeSampleSize?: number;
  awaySampleSize?: number;
}

function computeConfidence(ctx: BlendContext): number {
  const home = ctx.homeSampleSize ?? 0;
  const away = ctx.awaySampleSize ?? 0;
  const minSample = Math.min(home, away);

  // Simple logistic ramp: low confidence under 10 matches, high by 40+.
  const x = Math.max(0, Math.min(50, minSample));
  const t = (x - 10) / 30; // -? to +?
  const clamped = Math.max(0, Math.min(1, t));
  // Floor and ceiling to avoid 0 and 1.
  return 0.2 + 0.6 * clamped;
}

export function blendModelAndMarket(
  model: ModelProbabilities,
  market: MarketProbabilities,
  ctx: BlendContext,
): ModelProbabilities {
  const w = computeConfidence(ctx);

  const blend = (m: number, mk: number | undefined): number => {
    if (mk == null || mk <= 0 || mk >= 1) return m;
    return w * m + (1 - w) * mk;
  };

  const blended: ModelProbabilities = {
    home: blend(model.home, market.home),
    draw: blend(model.draw, market.draw),
    away: blend(model.away, market.away),
  };

  if (model.over_2_5 != null) {
    blended.over_2_5 = blend(model.over_2_5, market.over_2_5);
  }
  if (model.under_2_5 != null) {
    blended.under_2_5 = blend(model.under_2_5, market.under_2_5);
  }

  return blended;
}

