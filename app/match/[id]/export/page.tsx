import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchDetail } from "@/lib/build-feed";

function formatKickoff(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

async function getMatch(id: string) {
  return getMatchDetail(id);
}

export default async function ExportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ratio?: string }>;
}) {
  const { id } = await params;
  const { ratio = "1:1" } = await searchParams;
  const match = await getMatch(id);
  if (!match) notFound();

  const isPortrait = ratio === "9:16";
  const aspectClass = isPortrait
    ? "aspect-[9/16] max-w-[360px]"
    : "aspect-square max-w-[480px]";
  const exportInsights = Object.entries(match.insightsByFamily ?? {}).flatMap(
    ([, insights]) => insights.slice(0, 3)
  );

  return (
    <main className="min-h-screen bg-[var(--bg-body)] p-4">
      <div className="mx-auto flex flex-col items-center gap-4">
        <p className="text-center text-mono text-[11px] uppercase tracking-[0.2em] text-tertiary">
          Minimal chrome for screenshot — tap to capture
        </p>
        <div
          id="export-card"
          className={`${aspectClass} w-full border border-black bg-[var(--bg-body)]`}
          style={{ padding: "var(--space-md)" }}
        >
          <div className="flex items-center justify-between text-mono text-[11px] uppercase text-tertiary">
            <span>{formatKickoff(match.kickoffUtc)} GMT</span>
            <span className="text-right">{match.venueName ?? "Venue TBD"}</span>
          </div>
          <div className="mt-4 flex items-center gap-3" style={{ gap: "var(--space-sm)" }}>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-0.5">
                <span
                  className="font-semibold uppercase truncate block"
                  style={{ fontSize: "28px", letterSpacing: "-0.8px", lineHeight: 1.05 }}
                >
                  {match.homeTeamName}
                </span>
                <span
                  className="font-semibold uppercase truncate block"
                  style={{ fontSize: "28px", letterSpacing: "-0.8px", lineHeight: 1.05 }}
                >
                  {match.awayTeamName}
                </span>
              </div>
            </div>
            {match.homeGoals != null && match.awayGoals != null ? (
              <span
                className="text-mono stat-value font-medium shrink-0"
                style={{ fontSize: "15px" }}
              >
                {match.homeGoals} – {match.awayGoals}
              </span>
            ) : null}
          </div>
          <div className="mt-4 flex flex-col gap-3" style={{ gap: "var(--space-sm)" }}>
            {exportInsights.map(
              (ins: { id: string; headline: string }, index: number) => (
                <div
                  key={ins.id}
                  className={`flex items-start gap-3 rounded-xl py-3 px-5 ${
                    index === 0 ? "bg-black text-white" : ""
                  }`}
                  style={{
                    background: index === 0 ? undefined : "var(--bg-surface)",
                    padding: "var(--space-sm) var(--space-md)",
                    borderRadius: 12,
                    gap: "var(--space-sm)",
                  }}
                >
                  <div>
                    {index === 0 ? (
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
                        Key Insight
                      </span>
                    ) : null}
                    <p
                      className={`font-medium ${index === 0 ? "mt-2" : ""}`}
                      style={{ fontSize: "13px", lineHeight: 1.5 }}
                    >
                      {ins.headline}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/match/${id}/export?ratio=1:1`}
            className="rounded-full border border-[var(--border-light)] bg-[var(--bg-body)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-tertiary"
          >
            1:1
          </Link>
          <Link
            href={`/match/${id}/export?ratio=9:16`}
            className="rounded-full border border-[var(--border-light)] bg-[var(--bg-body)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-tertiary"
          >
            9:16
          </Link>
        </div>
        <Link
          href={`/match/${id}`}
          className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary"
        >
          ← Back to match
        </Link>
      </div>
    </main>
  );
}
