import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchDetail } from "@/lib/build-feed";
import { mockFootballProvider } from "@/lib/providers/mock-provider";

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

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const families = Object.entries(match.insightsByFamily ?? {});
  const playerStats = await getPlayerProps(id);
  const playerProps = [
    { key: "shotsTotal", title: "Shots", label: "Shots" },
    { key: "shotsOn", title: "Shots on Target", label: "SOT" },
    { key: "goals", title: "Goalscorer", label: "Goals" },
    { key: "assists", title: "Assists", label: "Assists" },
  ] as const;

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
      <section className="space-y-8">
        {families.map(([family, insights]) => (
          <div key={family}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-tertiary">
              {family}
            </h2>
            <ul className="space-y-4">
              {insights.map(
                (ins: {
                  id: string;
                  headline: string;
                  supportLabel: string;
                  supportValue: string;
                  narrative: string;
                }) => (
                  <li
                    key={ins.id}
                    className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-body)] p-4 shadow-[0_10px_24px_rgba(17,17,17,0.06)]"
                  >
                    <p className="font-medium">{ins.headline}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-tertiary">
                      <span className="rounded-full bg-[var(--bg-surface)] px-3 py-1">
                        {family}
                      </span>
                      <span className="rounded-full bg-[var(--bg-surface)] px-3 py-1">
                        {ins.supportLabel}
                      </span>
                      <span className="rounded-full bg-[var(--bg-surface)] px-3 py-1">
                        {ins.supportValue}
                      </span>
                    </div>
                    {ins.narrative && (
                      <p className="mt-3 text-sm text-[var(--text-sec)]">
                        {ins.narrative}
                      </p>
                    )}
                  </li>
                )
              )}
            </ul>
          </div>
        ))}
      </section>
      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary">
            Player Props
          </h2>
          <span className="text-mono text-[11px] uppercase text-tertiary">
            Top 3
          </span>
        </div>
        <div className="mt-4 space-y-4">
          {playerProps.map((prop) => {
            const rows = topPlayers(playerStats, prop.key);
            return (
              <div
                key={prop.key}
                className="rounded-xl"
                style={{
                  background: "var(--bg-surface)",
                  padding: "var(--space-sm) var(--space-md)",
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-tertiary">
                    {prop.title}
                  </h3>
                  <span className="text-mono text-[11px] uppercase text-tertiary">
                    {prop.label}
                  </span>
                </div>
                {rows.length === 0 ? (
                  <p className="mt-3 text-[13px] text-[var(--text-sec)]">
                    No player props available.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {rows.map((player) => (
                      <li
                        key={`${prop.key}-${player.id}`}
                        className="flex items-center justify-between"
                      >
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium">
                            {player.name}
                          </span>
                          <span className="text-xs uppercase tracking-[0.2em] text-tertiary">
                            {player.teamName}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-mono text-[15px] font-medium">
                            {player.value}
                          </span>
                          <span className="text-xs uppercase tracking-[0.2em] text-tertiary">
                            {prop.label}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <div className="mt-10">
        <Link
          href={`/match/${id}/export`}
          className="inline-block rounded-full border border-[var(--border-light)] bg-[var(--bg-body)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-tertiary"
        >
          Share / Export
        </Link>
      </div>
    </main>
  );
}
