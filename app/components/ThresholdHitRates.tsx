"use client";

import { percentColor } from "@/lib/percent-color";

export type ThresholdRow = {
  label: string;
  hits: number;
  total: number;
};

type Props = {
  title: string;
  thresholds: ThresholdRow[];
};

export function ThresholdHitRates({ title, thresholds }: Props) {
  if (thresholds.length === 0) return null;

  return (
    <section
      className="px-5 py-4"
      style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
    >
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">{title}</h2>
      <div className="space-y-2">
        {thresholds.map((t) => {
          const rate = t.total > 0 ? t.hits / t.total : 0;
          const pct = (rate * 100).toFixed(0);
          return (
            <div key={t.label}>
              <div className="flex items-center justify-between text-[12px] font-mono mb-1">
                <span className="text-[var(--text-sec)]">{t.label}</span>
                <span className="font-semibold" style={{ color: percentColor(Number(pct)) }}>
                  {t.hits}/{t.total} ({pct}%)
                </span>
              </div>
              <div className="h-2 bg-[var(--bg-elevated)]" style={{ borderRadius: "1px" }}>
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${rate * 100}%`,
                    backgroundColor: percentColor(rate * 100),
                    borderRadius: "1px",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
