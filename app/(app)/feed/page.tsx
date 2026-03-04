import { getFeedMatches } from "@/lib/build-feed";
import { FeedView } from "@/app/components/FeedView";
import { DateSelector, type DateRange } from "@/app/components/DateSelector";
import { AccountButton } from "@/app/components/AccountButton";
import { ALL_COMPETITION_IDS, SUPPORTED_COMPETITIONS, getLeagueStrength, type LeagueFilterValue } from "@/lib/leagues";
import { requireActiveSubscription } from "@/lib/auth-guard";


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

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; league?: LeagueFilterValue }>;
}) {
  await requireActiveSubscription();

  const params = await searchParams;
  const range: DateRange = (["today", "tomorrow", "week"].includes(params.range ?? "") ? params.range : "today") as DateRange;
  const league = params.league ?? "all";
  const { from, to } = getDateRange(range);

  // Always fetch all leagues — per-league cache makes this cheap after first load.
  const allMatches = await getFeedMatches(from, to, ALL_COMPETITION_IDS);

  // Derive active leagues from actual match data, sorted by strength (strongest first)
  const activeLeagueIds = new Set(allMatches.map((m) => m.leagueId).filter(Boolean));
  const activeLeagues = SUPPORTED_COMPETITIONS
    .filter((c) => activeLeagueIds.has(c.id))
    .map((c) => ({ value: `${c.id}` as LeagueFilterValue, label: c.label, strength: getLeagueStrength(c.id) }))
    .sort((a, b) => b.strength - a.strength);

  // Filter for display, sort by league strength (strongest first)
  const filtered =
    league === "all"
      ? allMatches
      : allMatches.filter((m) => m.leagueId === Number(league));
  const matches = filtered.toSorted((a, b) => {
    if (league === "all") {
      const strengthDiff = getLeagueStrength(b.leagueId ?? 0) - getLeagueStrength(a.leagueId ?? 0);
      if (strengthDiff !== 0) return strengthDiff;
    }
    return a.kickoffUtc.localeCompare(b.kickoffUtc);
  });

  return (
    <main className="app-shell app-shell--wide min-h-screen flex flex-col bg-[var(--bg-body)]">
      <header
        className="flex justify-between items-center"
        style={{ paddingTop: "var(--space-lg)", paddingBottom: "var(--space-sm)" }}
      >
        <h1
          className="font-bold uppercase"
          style={{ fontSize: "20px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          Match Feed
        </h1>
        <div className="flex items-center gap-2">
          <DateSelector currentRange={range} currentLeague={league} />
          <AccountButton />
        </div>
      </header>

      <FeedView
        matches={matches}
        currentRange={range}
        currentLeague={league}
        activeLeagues={activeLeagues}
      />
    </main>
  );
}
