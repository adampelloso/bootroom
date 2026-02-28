import { getFeedMatches } from "@/lib/build-feed";
import { FeedView } from "@/app/components/FeedView";
import { DatePickerButton } from "@/app/components/DatePickerButton";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { ALL_COMPETITION_IDS, SUPPORTED_COMPETITIONS, getLeagueStrength, type LeagueFilterValue } from "@/lib/leagues";

// ISR: cache rendered page at CDN, shared across all users.
// Pre-match stats don't change, so 10 min is conservative.
export const revalidate = 600;

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; league?: LeagueFilterValue }>;
}) {
  const params = await searchParams;
  const dateStr = params.date;
  const league = params.league ?? "all";
  const today = toISODate(new Date());
  const from = dateStr ?? today;

  // Always fetch all leagues — per-league cache makes this cheap after first load.
  // This gives us a single source of truth for both active pills and match display.
  const allMatches = await getFeedMatches(from, from, ALL_COMPETITION_IDS);

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
          <DatePickerButton currentDate={from} currentLeague={league} />
          <ThemeToggle />
        </div>
      </header>

      <FeedView
        matches={matches}
        currentDate={from}
        currentLeague={league}
        activeLeagues={activeLeagues}
      />
    </main>
  );
}
