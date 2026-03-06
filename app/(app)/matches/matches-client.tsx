"use client";

import { FeedView } from "@/app/components/FeedView";
import type { FeedMatch } from "@/lib/feed";
import type { DateRange } from "@/app/components/DateSelector";
import { useCachedApi } from "@/app/hooks/useCachedApi";
import { getLeagueStrength } from "@/lib/leagues";

type Props = {
  from: string;
  to: string;
  range: DateRange;
  leagueIds: number[];
};

type FeedResponse = {
  matches: FeedMatch[];
};

export function MatchesClient({ from, to, range, leagueIds }: Props) {
  const league = leagueIds.join(",");
  const url = `/api/feed?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&league=${encodeURIComponent(league)}`;
  const { data, loading, error } = useCachedApi<FeedResponse>(url, 60_000);
  const matches = (data?.matches ?? []).toSorted((a, b) => {
    const strengthDiff = getLeagueStrength(b.leagueId ?? 0) - getLeagueStrength(a.leagueId ?? 0);
    if (strengthDiff !== 0) return strengthDiff;
    return a.kickoffUtc.localeCompare(b.kickoffUtc);
  });

  if (loading && !data) {
    return (
      <section className="pt-5 pb-8">
        <p className="text-[13px] text-secondary">Loading matches...</p>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="pt-5 pb-8">
        <p className="text-[13px] text-red-500">Failed to load matches.</p>
      </section>
    );
  }

  return <FeedView matches={matches} currentRange={range} />;
}
