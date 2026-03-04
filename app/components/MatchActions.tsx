"use client";

import { useState } from "react";

type Props = {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  evFlags?: string[];
};

export function MatchActions({ matchId, homeTeamName, awayTeamName, evFlags }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const evText = evFlags && evFlags.length > 0 ? ` — ${evFlags.join(", ")} +EV` : "";
    const text = `${homeTeamName} v ${awayTeamName}${evText} (model vs market)`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleShare}
        className="text-mono text-[12px] uppercase px-2 py-1 border transition-colors"
        style={{
          borderColor: "var(--border-light)",
          color: copied ? "var(--text-main)" : "var(--text-tertiary)",
        }}
      >
        {copied ? "Copied" : "Share"}
      </button>
    </div>
  );
}
