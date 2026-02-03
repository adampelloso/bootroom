/**
 * Fill insight templates with stub or computed context.
 * Replaces placeholders {home}, {away}, {value}, {l5}, {l10}, {n}, {k}, {pct}, {diff}, {against}.
 */

import type { InsightType } from "./catalog";
import type { StubContext } from "./stub-context";

export interface FilledInsight {
  headline: string;
  supportLabel: string;
  supportValue: string;
}

function replacePlaceholders(str: string, ctx: StubContext): string {
  return str
    .replace(/\{home\}/g, ctx.home)
    .replace(/\{away\}/g, ctx.away)
    .replace(/\{value\}/g, ctx.value)
    .replace(/\{l5\}/g, ctx.l5)
    .replace(/\{l10\}/g, ctx.l10)
    .replace(/\{n\}/g, ctx.n)
    .replace(/\{k\}/g, ctx.k)
    .replace(/\{pct\}/g, ctx.pct)
    .replace(/\{diff\}/g, ctx.diff)
    .replace(/\{against\}/g, ctx.against);
}

/**
 * Given a catalog type and stub context, produce headline, supportLabel, supportValue.
 */
export function fillInsightTemplate(
  type: InsightType,
  ctx: StubContext
): FilledInsight {
  return {
    headline: replacePlaceholders(type.headlineTemplate, ctx),
    supportLabel: replacePlaceholders(type.supportLabel, ctx),
    supportValue: replacePlaceholders(type.supportValueTemplate, ctx),
  };
}
