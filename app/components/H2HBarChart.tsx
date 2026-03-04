"use client";

/**
 * Single stat comparison: two bars (home vs away) for L10 average.
 * Optional team colors from API (e.g. primary hex); falls back to theme.
 */

type Props = {
  statLabel: string;
  homeValue: number;
  awayValue: number;
  homeLabel: string;
  awayLabel: string;
  /** Optional team colors (hex or CSS). If not provided, uses theme. */
  homeColor?: string;
  awayColor?: string;
  integerValues?: boolean;
};

export function H2HBarChart({
  statLabel,
  homeValue,
  awayValue,
  homeLabel,
  awayLabel,
  homeColor = "var(--bg-accent)",
  awayColor = "var(--text-tertiary)",
  integerValues,
}: Props) {
  const maxVal = Math.max(homeValue, awayValue, 0.5);
  const fmt = (n: number) =>
    n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        padding: "var(--space-sm) var(--space-md)",
      }}
    >
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-tertiary mb-3">
        {statLabel}
      </h3>
      <div className="flex gap-4 items-end">
        <div className="flex-1 flex flex-col items-center gap-2">
          <div
            className="w-full rounded-t min-h-[8px] transition-all"
            style={{
              height: `${(homeValue / maxVal) * 80}px`,
              maxHeight: "120px",
              backgroundColor: homeColor,
            }}
          />
          <span className="text-[12px] font-mono text-tertiary truncate w-full text-center">
            {homeLabel}
          </span>
          <span className="text-[13px] font-mono font-medium">
            {fmt(homeValue)}
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center gap-2">
          <div
            className="w-full rounded-t min-h-[8px] transition-all"
            style={{
              height: `${(awayValue / maxVal) * 80}px`,
              maxHeight: "120px",
              backgroundColor: awayColor,
            }}
          />
          <span className="text-[12px] font-mono text-tertiary truncate w-full text-center">
            {awayLabel}
          </span>
          <span className="text-[13px] font-mono font-medium">
            {fmt(awayValue)}
          </span>
        </div>
      </div>
    </div>
  );
}
