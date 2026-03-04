import { requireActiveSubscription } from "@/lib/auth-guard";

export default async function LeaguesPage() {
  await requireActiveSubscription();

  return (
    <main
      className="min-h-screen bg-[var(--bg-body)]"
      style={{ maxWidth: "720px", margin: "0 auto", padding: "0 var(--space-md)" }}
    >
      <header
        className="flex items-center"
        style={{ paddingTop: "var(--space-lg)", paddingBottom: "var(--space-sm)" }}
      >
        <h1
          className="font-bold uppercase"
          style={{ fontSize: "20px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          Leagues
        </h1>
      </header>
      <p className="font-mono text-sm pb-20" style={{ color: "var(--text-sec)" }}>
        Coming Soon
      </p>
    </main>
  );
}
