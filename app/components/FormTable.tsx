"use client";

import type { TeamMatchRow } from "@/lib/insights/team-stats";

type Props = {
  rows: TeamMatchRow[];
  limit?: number;
};

function resultLabel(gf: number, ga: number): "W" | "D" | "L" {
  if (gf > ga) return "W";
  if (gf < ga) return "L";
  return "D";
}

const RESULT_COLORS: Record<"W" | "D" | "L", string> = {
  W: "var(--color-positive)",
  D: "var(--text-tertiary)",
  L: "var(--color-negative)",
};

export function FormTable({ rows, limit = 5 }: Props) {
  const display = rows.slice(-limit).reverse();
  if (display.length === 0) return null;

  return (
    <table className="w-full text-[12px] font-mono">
      <thead>
        <tr className="text-tertiary uppercase text-[12px]">
          <th className="text-left py-1 font-normal">Opp</th>
          <th className="text-center py-1 font-normal">Score</th>
          <th className="text-center py-1 font-normal">H/A</th>
          <th className="text-right py-1 font-normal">Result</th>
        </tr>
      </thead>
      <tbody>
        {display.map((r, i) => {
          const res = resultLabel(r.goalsFor, r.goalsAgainst);
          return (
            <tr
              key={i}
              className="border-t border-[var(--border-light)]"
              style={{ background: i % 2 === 1 ? "var(--bg-surface)" : "transparent" }}
            >
              <td className="py-1.5 text-[var(--text-sec)]">
                {r.opponentName.slice(0, 3).toUpperCase()}
              </td>
              <td className="py-1.5 text-center text-[var(--text-main)]">
                {r.goalsFor}-{r.goalsAgainst}
              </td>
              <td className="py-1.5 text-center text-tertiary">
                {r.isHome ? "H" : "A"}
              </td>
              <td className="py-1.5 text-right flex items-center justify-end">
                <span
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: RESULT_COLORS[res],
                  }}
                  title={res}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
