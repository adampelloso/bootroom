/**
 * Fill insight templates with stub or real context.
 * Replaces placeholders {home}, {away}, {value}, {l5}, {l10}, {n}, {k}, {pct}, {diff}, {against}, {combinedCleanSheets}.
 */

import type { InsightType } from "./catalog";

export interface InsightContext {
  home: string;
  away: string;
  value: string;
  l5: string;
  l10: string;
  n: string;
  k: string;
  pct: string;
  diff: string;
  against: string;
  combinedCleanSheets?: string;
}

export interface FilledInsight {
  headline: string;
  supportLabel: string;
  supportValue: string;
}

function replacePlaceholders(str: string, ctx: InsightContext): string {
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
    .replace(/\{against\}/g, ctx.against)
    .replace(/\{combinedCleanSheets\}/g, ctx.combinedCleanSheets ?? "0");
}

/**
 * Given a catalog type and context, produce headline, supportLabel, supportValue.
 */
export function fillInsightTemplate(
  type: InsightType,
  ctx: InsightContext
): FilledInsight {
  return {
    headline: replacePlaceholders(type.headlineTemplate, ctx),
    supportLabel: replacePlaceholders(type.supportLabel, ctx),
    supportValue: replacePlaceholders(type.supportValueTemplate, ctx),
  };
}
