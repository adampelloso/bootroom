import Link from "next/link";
import type { MatchEdges } from "@/lib/edge-engine";
import { EdgeBadge } from "@/app/components/EdgeBadge";

function tierColor(tier: string): string {
  if (tier === "HIGH") return "var(--color-edge-strong)";
  if (tier === "MEDIUM") return "var(--color-amber)";
  return "var(--color-edge-negative)";
}

type Props = {
  edges: MatchEdges[];
};

export function EdgeLeaderboard({ edges }: Props) {
  // Always sorted by edge descending (the whole point of this component)
  const sorted = [...edges].sort((a, b) => b.bestEdge - a.bestEdge);

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table className="w-full text-[12px] font-mono" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr
              className="text-[11px] uppercase tracking-[0.08em]"
              style={{ background: "var(--bg-surface)", color: "var(--text-tertiary)" }}
            >
              <th className="text-left py-2 px-3 font-semibold">Match</th>
              <th className="text-left py-2 px-3 font-semibold">Best Market</th>
              <th className="text-right py-2 px-3 font-semibold">Edge</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => {
              const matchUrl = `/match/${e.matchId.replace("match-", "")}`;
              const edgePct = `+${(e.bestEdge * 100).toFixed(1)}%`;
              return (
                <tr
                  key={e.matchId}
                  style={{ borderBottom: "1px solid var(--border-light)" }}
                >
                  <td className="py-2 px-3">
                    <Link
                      href={matchUrl}
                      className="uppercase font-semibold hover:underline"
                      style={{ color: "var(--text-main)" }}
                    >
                      {e.homeTeam} v {e.awayTeam}
                    </Link>
                  </td>
                  <td className="py-2 px-3 uppercase" style={{ color: "var(--text-sec)" }}>
                    <EdgeBadge edge={e.bestEdge} market={e.bestMarket} variant="badge" />
                  </td>
                  <td
                    className="py-2 px-3 text-right font-semibold"
                    style={{ color: tierColor(e.bestTier) }}
                  >
                    {edgePct}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <p
          className="text-[12px] font-mono py-4 text-center"
          style={{ color: "var(--text-tertiary)" }}
        >
          No edges identified today.
        </p>
      )}
    </div>
  );
}
