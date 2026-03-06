export default function TodayLoading() {
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

      <section>
        <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
          Loading best bets...
        </p>
      </section>
    </main>
  );
}
