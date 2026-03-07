"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TeamRadar, type TeamRadarData } from "@/app/components/TeamRadar";

type TeamSearchResult = {
  team_id: string;
  team_name: string;
  league_id: number | null;
  league_name: string | null;
  season: number | null;
  crest_url: string | null;
};

type TeamOption = {
  id: string;
  name: string;
  league: string | null;
  crestUrl: string | null;
};

type SearchTarget = "home" | "away";

function parseTeamsParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
}

function TeamSearchInput({
  label,
  value,
  onChange,
  results,
  onPick,
  loading,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  results: TeamSearchResult[];
  onPick: (team: TeamSearchResult) => void;
  loading: boolean;
}) {
  return (
    <div className="relative">
      <label className="block text-[11px] uppercase text-tertiary mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search team..."
        className="w-full rounded-md border border-[var(--border-light)] bg-[var(--bg-surface)] px-3 py-2 text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
      />
      {(loading || results.length > 0) && value.trim().length >= 2 ? (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-[12px] text-tertiary">Searching...</div>
          ) : (
            results.map((team) => (
              <button
                key={team.team_id}
                type="button"
                onClick={() => onPick(team)}
                className="w-full text-left px-3 py-2 hover:bg-[var(--bg-surface)] border-b border-[var(--border-light)] last:border-b-0"
              >
                <div className="text-[13px]">{team.team_name}</div>
                <div className="text-[11px] text-tertiary">{team.league_name ?? "League unavailable"}</div>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export function RadarClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialTeamsFromUrl = useMemo(() => parseTeamsParam(searchParams.get("teams")), [searchParams]);
  const [homeQuery, setHomeQuery] = useState("");
  const [awayQuery, setAwayQuery] = useState("");
  const [homeTeam, setHomeTeam] = useState<TeamOption | null>(null);
  const [awayTeam, setAwayTeam] = useState<TeamOption | null>(null);
  const [activeSearch, setActiveSearch] = useState<SearchTarget | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<TeamSearchResult[]>([]);

  const [radarLoading, setRadarLoading] = useState(false);
  const [radarError, setRadarError] = useState<string | null>(null);
  const [season, setSeason] = useState("2025-26");
  const [radarTeams, setRadarTeams] = useState<TeamRadarData[]>([]);

  useEffect(() => {
    if (initialTeamsFromUrl.length === 0) return;
    const ids = initialTeamsFromUrl;
    const run = async () => {
      setRadarLoading(true);
      setRadarError(null);
      try {
        const res = await fetch(`/api/teams/radar?teamIds=${encodeURIComponent(ids.join(","))}`, { credentials: "include" });
        if (!res.ok) throw new Error("Unable to load team data. Please try again.");
        const json = (await res.json()) as { season: string; teams: TeamRadarData[] };
        setSeason(json.season ?? "2025-26");
        setRadarTeams(json.teams ?? []);
        const first = json.teams[0];
        const second = json.teams[1];
        if (first) {
          setHomeTeam({ id: first.team_id, name: first.team_name, league: first.league, crestUrl: first.crest_url });
          setHomeQuery(first.team_name);
        }
        if (second) {
          setAwayTeam({ id: second.team_id, name: second.team_name, league: second.league, crestUrl: second.crest_url });
          setAwayQuery(second.team_name);
        }
      } catch (error) {
        setRadarError(error instanceof Error ? error.message : "Unable to load team data. Please try again.");
      } finally {
        setRadarLoading(false);
      }
    };
    void run();
  }, [initialTeamsFromUrl]);

  useEffect(() => {
    const query = activeSearch === "home" ? homeQuery.trim() : activeSearch === "away" ? awayQuery.trim() : "";
    if (!activeSearch || query.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/teams/search?q=${encodeURIComponent(query)}`, { credentials: "include" });
        if (!res.ok) throw new Error("Search failed");
        const json = (await res.json()) as { teams: TeamSearchResult[] };
        setSearchResults(json.teams ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [activeSearch, homeQuery, awayQuery]);

  useEffect(() => {
    if (!homeTeam || !awayTeam) {
      setRadarTeams([]);
      return;
    }
    const ids = `${homeTeam.id},${awayTeam.id}`;
    const sp = new URLSearchParams();
    sp.set("teams", ids);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });

    const run = async () => {
      setRadarLoading(true);
      setRadarError(null);
      try {
        const res = await fetch(`/api/teams/radar?teamIds=${encodeURIComponent(ids)}`, { credentials: "include" });
        if (!res.ok) throw new Error("Unable to load team data. Please try again.");
        const json = (await res.json()) as { season: string; teams: TeamRadarData[] };
        setSeason(json.season ?? "2025-26");
        setRadarTeams(json.teams ?? []);
      } catch (error) {
        setRadarError(error instanceof Error ? error.message : "Unable to load team data. Please try again.");
      } finally {
        setRadarLoading(false);
      }
    };

    void run();
  }, [awayTeam, homeTeam, pathname, router]);

  return (
    <main className="app-shell--detail min-h-screen bg-[var(--bg-body)] px-5 py-8 space-y-6" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
      <header className="space-y-2">
        <h1 className="text-[22px] font-semibold uppercase tracking-[0.08em]">Radar</h1>
        <p className="text-[13px] text-tertiary">Search and compare any two teams with league-relative seasonal percentiles.</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div onFocus={() => setActiveSearch("home")} onBlur={() => setTimeout(() => setActiveSearch((s) => (s === "home" ? null : s)), 120)}>
          <TeamSearchInput
            label="Home Team"
            value={homeQuery}
            onChange={(next) => {
              setHomeQuery(next);
              setHomeTeam((current) => (current && current.name === next ? current : null));
            }}
            results={activeSearch === "home" ? searchResults : []}
            loading={activeSearch === "home" && searchLoading}
            onPick={(picked) => {
              setHomeTeam({
                id: picked.team_id,
                name: picked.team_name,
                league: picked.league_name,
                crestUrl: picked.crest_url,
              });
              setHomeQuery(picked.team_name);
              setSearchResults([]);
              setActiveSearch(null);
            }}
          />
        </div>
        <div onFocus={() => setActiveSearch("away")} onBlur={() => setTimeout(() => setActiveSearch((s) => (s === "away" ? null : s)), 120)}>
          <TeamSearchInput
            label="Away Team"
            value={awayQuery}
            onChange={(next) => {
              setAwayQuery(next);
              setAwayTeam((current) => (current && current.name === next ? current : null));
            }}
            results={activeSearch === "away" ? searchResults : []}
            loading={activeSearch === "away" && searchLoading}
            onPick={(picked) => {
              setAwayTeam({
                id: picked.team_id,
                name: picked.team_name,
                league: picked.league_name,
                crestUrl: picked.crest_url,
              });
              setAwayQuery(picked.team_name);
              setSearchResults([]);
              setActiveSearch(null);
            }}
          />
        </div>
      </section>

      {radarError ? <p style={{ color: "var(--prob-very-low)" }}>{radarError}</p> : null}
      {homeTeam && awayTeam ? (
        <TeamRadar teams={radarTeams} season={season} loading={radarLoading} showTable showRawValues />
      ) : (
        <div className="rounded-md border border-[var(--border-light)] bg-[var(--bg-surface)] px-4 py-6 text-[13px] text-tertiary">
          Select two teams to render the radar comparison.
        </div>
      )}
    </main>
  );
}
