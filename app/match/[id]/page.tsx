import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchDetail } from "@/lib/build-feed";
import { mockFootballProvider } from "@/lib/providers/mock-provider";
import { MatchDetailTabs } from "@/app/components/MatchDetailTabs";

function formatKickoff(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
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
  const res = await mockFootballProvider.getFixturePlayers(fixtureId);
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

function topPlayers(
  players: PlayerPropStat[],
  key: "shotsTotal" | "shotsOn" | "goals" | "assists",
  limit = 3
) {
  return players
    .map((player) => ({ ...player, value: player[key] ?? 0 }))
    .filter((player) => player.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function sortByScore(insights: { totalScore: number }[]) {
  return [...insights].sort((a, b) => b.totalScore - a.totalScore);
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const insightsByFamily = match.insightsByFamily ?? {};
  const families = Object.entries(insightsByFamily);
  const playerStats = await getPlayerProps(id);
  const playerProps = [
    { key: "shotsTotal", title: "Shots", label: "Shots" },
    { key: "shotsOn", title: "Shots on Target", label: "SOT" },
    { key: "goals", title: "Goalscorer", label: "Goals" },
    { key: "assists", title: "Assists", label: "Assists" },
  ] as const;
  const allInsights = sortByScore(
    Object.values(insightsByFamily).flat()
  );
  const overviewInsights = allInsights.slice(0, 8);

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <nav className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary"
        >
          ← Feed
        </Link>
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary">
          Match Detail
        </span>
      </nav>
      <header className="mb-10">
        <div className="flex items-center justify-between text-mono text-[11px] uppercase text-tertiary">
          <span>{formatKickoff(match.kickoffUtc)} GMT</span>
          <span>{match.venueName ?? "Venue TBD"}</span>
        </div>
        <div className="mt-4">
          <p
            className="font-semibold uppercase"
            style={{ fontSize: "32px", letterSpacing: "-1px", lineHeight: 1.05 }}
          >
            {match.homeTeamName}
          </p>
          <p
            className="font-semibold uppercase text-transparent"
            style={{
              fontSize: "32px",
              letterSpacing: "-1px",
              lineHeight: 1.05,
              WebkitTextStroke: "1px var(--text-main)",
            }}
          >
            {match.awayTeamName}
          </p>
        </div>
      </header>
      <MatchDetailTabs
        overviewInsights={overviewInsights}
        insightsByFamily={insightsByFamily}
        playerStats={playerStats}
        playerProps={playerProps}
      />
    </main>
  );
}
