import { MatchCard } from "./components/MatchCard";
import { getFeedMatches } from "@/lib/build-feed";
import type { FeedMatch } from "@/lib/feed";
import { LeagueFilterPill } from "./components/LeagueFilter";
import { DateScrubber } from "./components/DateScrubber";
import { ThemeToggle } from "./components/ThemeToggle";
import { DEFAULT_LEAGUE_ID, SUPPORTED_LEAGUES, type LeagueFilterValue } from "@/lib/leagues";

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
  const league = params.league ?? (`${DEFAULT_LEAGUE_ID}` as LeagueFilterValue);
  const today = toISODate(new Date());
  const from = dateStr ?? today;
  const to = from;
  const leagueIds =
    league === "all"
      ? SUPPORTED_LEAGUES.map((l) => l.id)
      : [Number(league)];
  const matches = await getFeedMatches(from, to, leagueIds);

  return (
    <main
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ maxHeight: "calc(100vh - 48px)" }}
    >
      <div className="sticky top-0 z-10 bg-[var(--bg-body)]">
        <header
          className="flex justify-between items-center px-5 pt-8 pb-3"
          style={{ paddingTop: "var(--space-lg)", paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)", paddingBottom: "var(--space-sm)" }}
        >
          <h1
            className="font-medium"
            style={{ fontSize: "32px", letterSpacing: "-1px", lineHeight: 1.1 }}
          >
            Match Feed
          </h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LeagueFilterPill currentDate={from} currentLeague={league} />
          </div>
        </header>

        <DateScrubber currentDate={from} currentLeague={league} />
      </div>

      <section
        className="flex flex-col gap-5 px-5 border-t border-[var(--border-light)] pt-5 overflow-y-auto"
        style={{ gap: "var(--space-md)", paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      >
        {matches.length === 0 ? (
          <p className="text-[13px] text-secondary">No matches in the feed.</p>
        ) : (
          matches.map((match: FeedMatch) => (
            <MatchCard key={match.id} match={match} />
          ))
        )}
      </section>
    </main>
  );
}
