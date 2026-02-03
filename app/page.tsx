import { MatchCard } from "./components/MatchCard";
import { DateNavigator } from "./components/DateNavigator";
import { getFeedMatches } from "@/lib/build-feed";
import type { FeedMatch } from "@/lib/feed";

async function getFeed() {
  return getFeedMatches();
}

export default async function FeedPage() {
  const matches = await getFeed();

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
          <DateNavigator />
        </header>

        <div
          className="flex gap-3 pb-8 px-5 filters-scroll"
          style={{ gap: "var(--space-sm)", paddingBottom: "var(--space-lg)", paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
        >
          <button
            type="button"
            className="py-2.5 px-5 rounded-full font-mono text-[11px] uppercase whitespace-nowrap border-none cursor-pointer transition-all duration-200 shrink-0"
            style={{ background: "var(--bg-accent)", color: "var(--text-on-accent)", padding: "10px 20px" }}
          >
            EPL
          </button>
          <button
            type="button"
            className="py-2.5 px-5 rounded-full font-mono text-[11px] uppercase whitespace-nowrap cursor-pointer transition-all duration-200 bg-transparent border shrink-0"
            style={{ color: "var(--text-main)", borderColor: "var(--border-light)", padding: "10px 20px" }}
          >
            Bundesliga
          </button>
          <button
            type="button"
            className="py-2.5 px-5 rounded-full font-mono text-[11px] uppercase whitespace-nowrap cursor-pointer transition-all duration-200 bg-transparent border shrink-0"
            style={{ color: "var(--text-main)", borderColor: "var(--border-light)", padding: "10px 20px" }}
          >
            Serie A
          </button>
          <button
            type="button"
            className="py-2.5 px-5 rounded-full font-mono text-[11px] uppercase whitespace-nowrap cursor-pointer transition-all duration-200 bg-transparent border shrink-0"
            style={{ color: "var(--text-main)", borderColor: "var(--border-light)", padding: "10px 20px" }}
          >
            La Liga
          </button>
          <button
            type="button"
            className="py-2.5 px-5 rounded-full font-mono text-[11px] uppercase whitespace-nowrap cursor-pointer transition-all duration-200 bg-transparent border shrink-0"
            style={{ color: "var(--text-main)", borderColor: "var(--border-light)", padding: "10px 20px" }}
          >
            Ligue 1
          </button>
        </div>
      </div>

      <section
        className="flex flex-col gap-5 px-5 border-t border-black pt-5 overflow-y-auto"
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
