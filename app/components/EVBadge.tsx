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
        className="inline-flex items-center font-mono font-semibold uppercase text-[11px]"
        style={{ color: "var(--text-main)" }}
      >
        {label}{marketLabel}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center font-mono font-semibold uppercase text-[11px] border border-current px-1.5 py-0.5"
      style={{ color: "var(--text-main)" }}
    >
      {label}{marketLabel}
    </span>
  );
}
