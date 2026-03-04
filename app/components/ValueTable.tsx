"use client";

import type { FeedModelProbs } from "@/lib/modeling/feed-model-probs";
import { useState } from "react";

type MarketRow = {
  market: string;
  modelProb: number;
  bookProb: number | null;
  edge: number | null;
  signal: string;
  signalColor: string;
};

type Props = {
  feedProbs: FeedModelProbs;
  showAll?: boolean;
};

function getSignal(edge: number | null): { label: string; color: string } {
  if (edge == null) return { label: "\u2014", color: "var(--text-tertiary)" };
  if (edge > 0.08) return { label: "STRONG PLAY", color: "var(--color-edge-strong)" };
  if (edge >= 0.04) return { label: "WORTH WATCHING", color: "var(--color-edge-mild, #d97706)" };
  if (edge >= 0) return { label: "NEUTRAL", color: "var(--text-tertiary)" };
  return { label: "PASS", color: "var(--color-edge-negative, #ef4444)" };
}

function buildRows(feedProbs: FeedModelProbs): MarketRow[] {
  const rows: MarketRow[] = [];

  const add = (market: string, modelProb: number | undefined, bookProb: number | null) => {
    if (modelProb == null) return;
    const edge = bookProb != null ? modelProb - bookProb : null;
    const { label, color } = getSignal(edge);
    rows.push({ market, modelProb, bookProb, edge, signal: label, signalColor: color });
  };

  add("HOME", feedProbs.home, feedProbs.marketProbs?.home ?? null);
  add("DRAW", feedProbs.draw, feedProbs.marketProbs?.draw ?? null);
  add("AWAY", feedProbs.away, feedProbs.marketProbs?.away ?? null);
  add("O2.5", feedProbs.over_2_5, feedProbs.marketProbs?.over_2_5 ?? null);
  if (feedProbs.over_2_5 != null) {
    const bookU25 = feedProbs.marketProbs?.over_2_5 != null ? 1 - feedProbs.marketProbs.over_2_5 : null;
    add("U2.5", 1 - feedProbs.over_2_5, bookU25);
  }
  add("O3.5", feedProbs.over_3_5, null);
  if (feedProbs.over_3_5 != null) {
    add("U3.5", 1 - feedProbs.over_3_5, null);
  }
  add("BTTS YES", feedProbs.btts, feedProbs.marketProbs?.btts ?? null);
  if (feedProbs.btts != null) {
    const bookBttsNo = feedProbs.marketProbs?.btts != null ? 1 - feedProbs.marketProbs.btts : null;
    add("BTTS NO", 1 - feedProbs.btts, bookBttsNo);
  }

  rows.sort((a, b) => (b.edge ?? -999) - (a.edge ?? -999));
  return rows;
}

export function ValueTable({ feedProbs }: Props) {
  const [showAll, setShowAll] = useState(true);
  const allRows = buildRows(feedProbs);
  const rows = showAll ? allRows : allRows.filter((r) => r.edge != null && r.edge > 0);

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[11px] font-mono uppercase text-tertiary hover:text-[var(--text-sec)] transition-colors cursor-pointer"
          style={{ background: "none", border: "none", padding: 0 }}
        >
          {showAll ? "Positive edge only" : "Show all"}
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="w-full text-[12px] font-mono" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr
              className="text-[11px] uppercase tracking-[0.08em]"
              style={{ background: "var(--bg-surface)", color: "var(--text-tertiary)" }}
            >
              <th className="text-left py-2 px-3 font-semibold">Market</th>
              <th className="text-right py-2 px-3 font-semibold">Projection</th>
              <th className="text-right py-2 px-3 font-semibold">Published</th>
              <th className="text-right py-2 px-3 font-semibold">Edge</th>
              <th className="text-right py-2 px-3 font-semibold">Signal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.market}
                style={{ borderBottom: "1px solid var(--border-light)" }}
              >
                <td className="py-2 px-3 uppercase font-semibold" style={{ color: "var(--text-main)" }}>
                  {row.market}
                </td>
                <td className="py-2 px-3 text-right" style={{ color: "var(--text-sec)" }}>
                  {Math.round(row.modelProb * 100)}%
                </td>
                <td className="py-2 px-3 text-right text-tertiary">
                  {row.bookProb != null ? `${Math.round(row.bookProb * 100)}%` : "\u2014"}
                </td>
                <td className="py-2 px-3 text-right" style={{ color: row.edge != null ? row.signalColor : "var(--text-tertiary)" }}>
                  {row.edge != null ? `${row.edge > 0 ? "+" : ""}${(row.edge * 100).toFixed(1)}%` : "\u2014"}
                </td>
                <td className="py-2 px-3 text-right font-semibold" style={{ color: row.signalColor }}>
                  {row.signal}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <p className="text-[12px] text-tertiary py-4 text-center">No positive edges found.</p>
      )}
    </div>
  );
}
