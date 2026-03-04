"use client";

type Props = {
  primaryAngle: string;
  secondaryAngle?: string;
  volatility?: "Low" | "Medium" | "High";
  supportingStatements: string[];
};

/**
 * Stage 1: Decision Summary. Always visible when angle exists. No charts, no filters.
 * Minimal height; no scrolling required to understand the angle.
 */
export function DecisionSummary({
  primaryAngle,
  secondaryAngle,
  volatility,
  supportingStatements,
}: Props) {
  return (
    <section
      className="px-5 py-3 border-t border-[var(--border-light)] bg-[var(--bg-surface)]"
      style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      aria-label="Decision summary"
    >
      <p
        className="font-semibold text-[var(--text-main)]"
        style={{ fontSize: "15px", lineHeight: 1.35 }}
      >
        {primaryAngle}
      </p>
      {volatility ? (
        <span className="inline-block mt-1 text-mono text-[12px] uppercase text-tertiary">
          Volatility: {volatility}
        </span>
      ) : null}
      {secondaryAngle ? (
        <p className="mt-1 text-[13px] text-[var(--text-sec)]">{secondaryAngle}</p>
      ) : null}
      {supportingStatements.length > 0 ? (
        <ul className="mt-2 list-disc list-inside space-y-0.5 text-[12px] text-[var(--text-sec)]">
          {supportingStatements.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
