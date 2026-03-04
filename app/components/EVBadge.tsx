"use client";

type Props = {
  edge: number;
  market?: string;
  size?: "small" | "medium";
};

const EV_THRESHOLD = 0.03;
const STRONG_EV_THRESHOLD = 0.07;

export function EVBadge({ edge, market, size = "small" }: Props) {
  if (edge <= EV_THRESHOLD) return null;

  const isStrong = edge > STRONG_EV_THRESHOLD;
  const label = isStrong ? "++EV" : "+EV";
  const marketLabel = market ? ` ${market}` : "";

  if (size === "small") {
    return (
      <span
        className="inline-flex items-center font-mono font-semibold uppercase text-[12px] px-1.5 py-0.5"
        style={{
          color: "var(--color-amber)",
          background: isStrong ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.08)",
        }}
      >
        {label}{marketLabel}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center font-mono font-semibold uppercase text-[12px] px-1.5 py-0.5"
      style={{
        color: "var(--color-amber)",
        background: isStrong ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.08)",
        boxShadow: isStrong ? "0 0 8px rgba(245,158,11,0.2)" : "none",
      }}
    >
      {label}{marketLabel}
    </span>
  );
}
