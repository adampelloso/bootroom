"use client";

import Link from "next/link";
import { useCachedApi } from "@/app/hooks/useCachedApi";
import { useOddsFormat } from "@/app/hooks/useOddsFormat";
import { formatOddsDisplay } from "@/lib/modeling/odds-display";

type Props = {
  date: string;
};

type TodayResponse = {
  date: string;
  play_count: number;
  source?: string;
  featured: TodayPlay[];
  plays: TodayPlay[];
};

type TodayPlay = {
  id: string;
  fixtureId: number;
  marketType: string;
  marketLabel: string;
  simProbability: number;
  impliedProbability: number;
  edgePct: number;
  confidenceTier: string;
  rationale: string;
  leagueName?: string;
  kickoffUtc: string;
  homeTeamName: string;
  awayTeamName: string;
  hasBookOdds: boolean;
};

function fmtDateLine(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function tierColor(tier: string): { bg: string; text: string } {
  if (tier === "STRONG") return { bg: "#16A34A", text: "#F8FAFC" };
  if (tier === "GOOD") return { bg: "var(--color-accent)", text: "#0B1220" };
  return { bg: "#D97706", text: "#111827" };
}

function kickoff(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function edge(v: number): string {
  const p = Math.round(v * 1000) / 10;
  return `${p >= 0 ? "+" : ""}${p}%`;
}

function FeaturedCard({ play }: { play: TodayPlay }) {
  const c = tierColor(play.confidenceTier);
  const fill = Math.max(0, Math.min(100, Math.round(play.simProbability * 100)));
  const oddsFormat = useOddsFormat();
  return (
    <article
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-light)",
        padding: "14px",
        minWidth: "300px",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="font-mono text-[11px] uppercase font-bold"
          style={{ padding: "2px 8px", background: c.bg, color: c.text }}
        >
          {play.confidenceTier}
        </span>
        <span className="font-mono text-[11px] uppercase" style={{ color: "var(--text-tertiary)" }}>
          {play.leagueName ?? "League"} · {kickoff(play.kickoffUtc)}
        </span>
      </div>
      <div className="font-bold" style={{ fontSize: "18px", letterSpacing: "-0.01em", color: "var(--text-main)" }}>
        {play.marketLabel}
      </div>
      <div className="font-mono text-[12px] uppercase mt-1" style={{ color: "var(--text-tertiary)" }}>
        {play.homeTeamName} v {play.awayTeamName}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[13px] font-mono">
        <span style={{ color: "var(--text-main)" }}>
          Model {formatOddsDisplay(play.simProbability, oddsFormat)}
        </span>
        <span style={{ color: "var(--text-tertiary)" }}>
          Book {play.hasBookOdds ? formatOddsDisplay(play.impliedProbability, oddsFormat) : "unavailable"}
        </span>
        <span style={{ color: "var(--color-edge-strong)" }}>
          {play.hasBookOdds ? `${edge(play.edgePct)} edge` : "Model lean"}
        </span>
      </div>
      <div
        style={{
          marginTop: "8px",
          background: "var(--bg-surface)",
          height: "8px",
          width: "100%",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${fill}%`, height: "100%", background: c.bg }} />
      </div>
      <p className="text-[12px] mt-3" style={{ color: "var(--text-sec)", lineHeight: 1.5 }}>
        {play.rationale}
      </p>
      <div className="flex items-center justify-between mt-3">
        <Link
          href={`/match/${play.fixtureId}?tab=value`}
          className="font-mono text-[12px] uppercase underline"
          style={{ color: "var(--text-main)" }}
        >
          See Full Analysis
        </Link>
        <button
          type="button"
          disabled
          aria-label="Save pick (coming soon)"
          className="font-mono text-[14px]"
          style={{
            width: "26px",
            height: "26px",
            border: "1px solid var(--border-light)",
            color: "var(--text-tertiary)",
            opacity: 0.7,
          }}
        >
          +
        </button>
      </div>
    </article>
  );
}

function CompactCard({ play }: { play: TodayPlay }) {
  const c = tierColor(play.confidenceTier);
  const oddsFormat = useOddsFormat();
  return (
    <Link
      href={`/match/${play.fixtureId}?tab=value`}
      style={{
        display: "block",
        background: "var(--bg-panel)",
        border: "1px solid var(--border-light)",
        padding: "10px 12px",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="font-mono text-[10px] uppercase font-bold"
            style={{ padding: "2px 6px", background: c.bg, color: c.text }}
          >
            {play.confidenceTier}
          </span>
          <span className="font-semibold text-[14px] truncate" style={{ color: "var(--text-main)" }}>
            {play.marketLabel}
          </span>
        </div>
        <span className="font-mono text-[12px]" style={{ color: "var(--color-edge-strong)" }}>
          {play.hasBookOdds ? `${edge(play.edgePct)} edge` : "Model lean"}
        </span>
      </div>
      <div className="mt-1 font-mono text-[11px] uppercase" style={{ color: "var(--text-tertiary)" }}>
        {play.homeTeamName} v {play.awayTeamName} · {play.leagueName ?? "League"} · {kickoff(play.kickoffUtc)}
      </div>
      <div className="mt-1 font-mono text-[11px]" style={{ color: "var(--text-sec)" }}>
        Model {formatOddsDisplay(play.simProbability, oddsFormat)} · Book{" "}
        {play.hasBookOdds ? formatOddsDisplay(play.impliedProbability, oddsFormat) : "unavailable"}
      </div>
      {!play.hasBookOdds && (
        <div className="mt-1 font-mono text-[10px] uppercase" style={{ color: "var(--text-tertiary)" }}>
          odds unavailable for this market right now
        </div>
      )}
    </Link>
  );
}

export function TodayClient({ date }: Props) {
  const url = `/api/today/best-bets?date=${encodeURIComponent(date)}`;
  const { data, loading, error } = useCachedApi<TodayResponse>(url, 60_000);

  if (loading && !data) {
    return <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>Loading best bets...</p>;
  }
  if (error && !data) {
    return <p className="text-[13px] text-red-500">Failed to load best bets.</p>;
  }

  const playCount = data?.play_count ?? 0;
  const featured = data?.featured ?? [];
  const plays = data?.plays ?? [];

  if (playCount === 0) {
    return (
      <section>
        <p className="font-mono text-[12px] uppercase" style={{ color: "var(--text-tertiary)" }}>
          {fmtDateLine(date)} · 0 plays identified
        </p>
        <div style={{ marginTop: "14px", padding: "14px", border: "1px solid var(--border-light)", background: "var(--bg-panel)" }}>
          <p className="text-[14px]" style={{ color: "var(--text-main)" }}>No plays identified today.</p>
          <p className="text-[12px] mt-2" style={{ color: "var(--text-sec)", lineHeight: 1.5 }}>
            No ranked plays are available for this date yet. Check back closer to kickoff as simulations and odds refresh.
          </p>
          <Link href="/matches" className="font-mono text-[12px] uppercase underline mt-3 inline-block" style={{ color: "var(--text-main)" }}>
            Browse Today&apos;s Matches
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <p className="font-mono text-[12px] uppercase mb-3" style={{ color: "var(--text-tertiary)" }}>
        {fmtDateLine(date)} · {playCount} plays identified
      </p>

      {featured.length > 0 && (
        <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px" }}>
          {featured.map((p) => (
            <FeaturedCard key={p.id} play={p} />
          ))}
        </div>
      )}

      {plays.length > 0 && (
        <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
          {plays.map((p) => (
            <CompactCard key={p.id} play={p} />
          ))}
        </div>
      )}
    </section>
  );
}
