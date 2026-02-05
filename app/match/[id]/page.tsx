import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchDetail } from "@/lib/build-feed";
import { resolveProvider } from "@/lib/providers/registry";
import { getMatchStats, getTeamLastNMatchRows } from "@/lib/insights/team-stats";
import { buildTrendsByStat } from "@/lib/insights/trend-chart-data";
import { getFeedMarketRows, getDetailScreenshotCharts } from "@/lib/insights/feed-market-stats";
import { MarketSnapshot } from "@/app/components/MarketSnapshot";
import { ScreenshotCharts } from "@/app/components/ScreenshotCharts";
import { DeepStats } from "@/app/components/DeepStats";
import { DetailTabs } from "@/app/components/DetailTabs";
import { FiltersReveal } from "@/app/components/FiltersReveal";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { FormSummary } from "@/app/components/MatchCard";
import type { InsightFamily } from "@/lib/insights/catalog";

function formatKickoffTime(iso: string): string {
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

type PlayerPropStat = {
  id: number;
  name: string;
  teamName: string;
  shotsTotal: number | null;
  shotsOn: number | null;
  goals: number | null;
  assists: number | null;
};

async function getPlayerProps(id: string): Promise<PlayerPropStat[]> {
  const fixtureId = Number(id);
  if (Number.isNaN(fixtureId)) return [];
  const { provider } = resolveProvider("api-football");
  const res = await provider.getFixturePlayers(fixtureId);
  const teams = res.response ?? [];
  return teams.flatMap((team) =>
    team.players.map((player) => {
      const stats = player.statistics?.[0];
      return {
        id: player.id,
        name: player.name,
        teamName: team.team.name,
        shotsTotal: stats?.shots?.total ?? null,
        shotsOn: stats?.shots?.on ?? null,
        goals: stats?.goals?.total ?? null,
        assists: stats?.goals?.assists ?? null,
      };
    })
  );
}

type VenueCondition = "Home" | "Away" | "Combined";
type SampleCondition = "L5" | "L10" | "Season";

function parseConditions(search: Record<string, string | undefined>): {
  venue: VenueCondition;
  sample: SampleCondition;
} {
  const venue = (search.venue as VenueCondition) ?? "Combined";
  const sample = (search.sample as SampleCondition) ?? "L10";
  return {
    venue: venue === "Home" || venue === "Away" || venue === "Combined" ? venue : "Combined",
    sample: sample === "L5" || sample === "L10" || sample === "Season" ? sample : "L10",
  };
}

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string; venue?: string; sample?: string; debug?: string }>;
}) {
  const { id } = await params;
  const search = (await searchParams) as { category?: string; venue?: string; sample?: string; debug?: string };
  const category = search.category;
  const debugParam = search.debug;
  const match = await getMatch(id);
  if (!match) notFound();
  const parsed = parseConditions(search);
  const venue = parsed.venue;
  const sample = parsed.sample;
  const currentCategory = (category as InsightFamily | "all" | undefined) ?? "all";
  const showDebug = debugParam === "1" || debugParam === "true";

  const fixtureDate = match.kickoffUtc?.slice(0, 10);
  const snapshotRows = getFeedMarketRows(match.homeTeamName, match.awayTeamName, fixtureDate);
  const screenshotCharts = getDetailScreenshotCharts(match.homeTeamName, match.awayTeamName, fixtureDate);

  const rollingStats = getMatchStats(match.homeTeamName, match.awayTeamName, fixtureDate, { venue: "all" });
  const homeLast10 = getTeamLastNMatchRows(match.homeTeamName, 10, fixtureDate, { venue: "all" });
  const awayLast10 = getTeamLastNMatchRows(match.awayTeamName, 10, fixtureDate, { venue: "all" });
  const homeTrends =
    rollingStats && homeLast10.length > 0
      ? buildTrendsByStat(homeLast10, rollingStats.home.l10)
      : null;
  const awayTrends =
    rollingStats && awayLast10.length > 0
      ? buildTrendsByStat(awayLast10, rollingStats.away.l10)
      : null;

  const isFinished = match.homeGoals != null && match.awayGoals != null;

  return (
    <main className="min-h-screen flex flex-col bg-[var(--bg-body)]">
      <header
          className="flex justify-between items-center px-5 pt-8 pb-3"
          style={{ paddingTop: "var(--space-lg)", paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)", paddingBottom: "var(--space-sm)" }}
        >
          <Link
            href="/"
            className="font-medium text-[var(--text-main)] hover:text-[var(--text-sec)] transition-colors"
            style={{ fontSize: "32px", letterSpacing: "-1px", lineHeight: 1.1 }}
          >
            ← Match Details
          </Link>
          <ThemeToggle />
        </header>

        <div className="flex items-center justify-between text-mono text-[11px] uppercase text-tertiary px-5 pb-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)", paddingBottom: "var(--space-sm)" }}>
          <span>{formatKickoffTime(match.kickoffUtc)} GMT</span>
          <span className="text-right">{match.venueName ?? "Venue TBD"}</span>
        </div>

        <div
          className="flex items-center gap-3 px-5 pb-3"
          style={{ gap: "var(--space-sm)", paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)", paddingBottom: "var(--space-sm)" }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-0.5">
              <div
                className="flex items-center gap-3"
                style={{ gap: "var(--space-sm)" }}
              >
                <img
                  src={match.homeTeamLogo}
                  alt=""
                  className="w-6 h-6 object-contain shrink-0 rounded-sm"
                  width={24}
                  height={24}
                />
                <span
                  className="font-semibold uppercase truncate block"
                  style={{ fontSize: "28px", letterSpacing: "-0.8px", lineHeight: 1.05 }}
                >
                  {match.homeTeamCode ?? match.homeTeamName}
                </span>
                {match.homeForm ? <FormSummary form={match.homeForm} /> : null}
              </div>
              <div
                className="flex items-center gap-3"
                style={{ gap: "var(--space-sm)" }}
              >
                <img
                  src={match.awayTeamLogo}
                  alt=""
                  className="w-6 h-6 object-contain shrink-0 rounded-sm"
                  width={24}
                  height={24}
                />
                <span
                  className="font-semibold uppercase truncate block"
                  style={{
                    fontSize: "28px",
                    letterSpacing: "-0.8px",
                    lineHeight: 1.05,
                  }}
                >
                  {match.awayTeamCode ?? match.awayTeamName}
                </span>
                {match.awayForm ? <FormSummary form={match.awayForm} /> : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {isFinished ? (
              <span
                className="text-mono stat-value font-medium"
                style={{ fontSize: "15px" }}
              >
                {match.homeGoals} – {match.awayGoals}
              </span>
            ) : null}
          </div>
        </div>

      <DetailTabs />

      <MarketSnapshot rows={snapshotRows} />

      <ScreenshotCharts
        charts={screenshotCharts}
        homeTeamName={match.homeTeamName}
        awayTeamName={match.awayTeamName}
        threeOnly
      />

      <DeepStats
        homeTeamName={match.homeTeamName}
        awayTeamName={match.awayTeamName}
        homeTrends={homeTrends}
        awayTrends={awayTrends}
        rollingStats={rollingStats}
      />

      <FiltersReveal
        currentCategory={currentCategory}
        venue={venue}
        sample={sample}
      />

      {showDebug ? (
        <section className="px-5 py-3 border-t border-[var(--border-light)] bg-[var(--bg-surface)] text-[11px] font-mono text-tertiary overflow-x-auto">
          <p className="font-semibold text-[var(--text-sec)] mb-2">[Debug ?debug=1]</p>
          <p>home: {match.homeTeamName} | away: {match.awayTeamName} | date: {fixtureDate ?? "—"}</p>
        </section>
      ) : null}
    </main>
  );
}
