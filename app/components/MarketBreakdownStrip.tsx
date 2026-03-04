"use client";

type Props = {
  counts: Record<string, number>;
};

export function MarketBreakdownStrip({ counts }: Props) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) return null;

  return (
    <section style={{ paddingBottom: "var(--space-sm)" }}>
      <h2
        className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3"
        style={{ color: "var(--text-main)" }}
      >
        Market Breakdown
      </h2>
      <div
        className="flex gap-2"
        style={{ overflowX: "auto", paddingBottom: "var(--space-xs)" }}
      >
        {entries.map(([market, count]) => (
          <span
            key={market}
            className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase shrink-0 px-2.5 py-1 rounded"
            style={{ background: "var(--bg-surface)", color: "var(--text-sec)" }}
          >
            {market}
            <span
              className="font-bold text-[11px] px-1.5 py-0.5 rounded"
              style={{
                background: "var(--bg-panel)",
                color: "var(--text-main)",
              }}
            >
              {count}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
