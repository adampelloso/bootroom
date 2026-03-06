import { requireActiveSubscription } from "@/lib/auth-guard";
import { TodayClient } from "./today-client";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  await requireActiveSubscription();

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="app-shell app-shell--wide min-h-screen flex flex-col bg-[var(--bg-body)] pb-20">
      <header
        style={{
          paddingTop: "var(--space-lg)",
          paddingBottom: "var(--space-md)",
        }}
      >
        <h1
          className="font-bold uppercase"
          style={{
            fontSize: "20px",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          Today&apos;s Best Bets
        </h1>
      </header>

      <TodayClient date={today} />
    </main>
  );
}
