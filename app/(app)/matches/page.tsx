import { DateSelector, type DateRange } from "@/app/components/DateSelector";
import { requireActiveSubscription } from "@/lib/auth-guard";
import { getFollowedLeagueIds } from "@/lib/league-preferences";
import { MatchesClient } from "./matches-client";


function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDateRange(range: DateRange): { from: string; to: string } {
  const now = new Date();
  const today = toISODate(now);

  if (range === "today") {
    return { from: today, to: today };
  }

  if (range === "tomorrow") {
    const tmrw = new Date(now);
    tmrw.setDate(tmrw.getDate() + 1);
    const tmrwStr = toISODate(tmrw);
    return { from: tmrwStr, to: tmrwStr };
  }

  // "week" — next 7 days from today
  const end = new Date(now);
  end.setDate(end.getDate() + 6);
  return { from: today, to: toISODate(end) };
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireActiveSubscription();

  const params = await searchParams;
  const range: DateRange = (["today", "tomorrow", "week"].includes(params.range ?? "") ? params.range : "today") as DateRange;
  const { from, to } = getDateRange(range);

  const leagueIds = await getFollowedLeagueIds();
  return (
    <main className="app-shell app-shell--wide min-h-screen flex flex-col bg-[var(--bg-body)] pb-20">
      <header
        className="flex justify-between items-center"
        style={{ paddingTop: "var(--space-lg)", paddingBottom: "var(--space-sm)" }}
      >
        <h1
          className="font-bold uppercase"
          style={{ fontSize: "20px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          Matches
        </h1>
        <DateSelector currentRange={range} />
      </header>

      <MatchesClient from={from} to={to} range={range} leagueIds={leagueIds} />
    </main>
  );
}
