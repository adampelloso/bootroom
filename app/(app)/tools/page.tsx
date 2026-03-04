import { requireActiveSubscription } from "@/lib/auth-guard";
import Link from "next/link";

export default async function ToolsPage() {
  await requireActiveSubscription();

  const tools = [
    { href: "/tools/value-finder", title: "Value Finder", desc: "Every model edge across today's fixtures, ranked by size." },
    { href: "/tools/parlay-builder", title: "Multi-Leg Builder", desc: "Combine legs across matches with combined probability projections." },
  ];

  return (
    <main className="min-h-screen bg-[var(--bg-body)]" style={{ maxWidth: "720px", margin: "0 auto", padding: "0 var(--space-md)" }}>
      <header className="flex items-center" style={{ paddingTop: "var(--space-lg)", paddingBottom: "var(--space-sm)" }}>
        <h1 className="font-bold uppercase" style={{ fontSize: "20px", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
          Tools
        </h1>
      </header>
      <div className="grid grid-cols-1 gap-3 pb-20" style={{ gap: "var(--space-sm)" }}>
        {tools.map((t) => (
          <Link key={t.href} href={t.href} className="block transition-colors hover:bg-[var(--bg-card)]" style={{ background: "var(--bg-panel)", padding: "var(--space-md)", borderLeft: "3px solid var(--color-accent)" }}>
            <h2 className="font-semibold uppercase text-[14px] mb-1" style={{ color: "var(--text-main)" }}>{t.title}</h2>
            <p className="font-mono text-[12px]" style={{ color: "var(--text-sec)" }}>{t.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
