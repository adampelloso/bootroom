export default function MatchesLoading() {
  return (
    <main className="app-shell app-shell--wide min-h-screen flex flex-col bg-[var(--bg-body)] pb-20">
      <header
        className="flex justify-between items-center"
        style={{ paddingTop: "var(--space-lg)", paddingBottom: "var(--space-sm)" }}
      >
        <h1
          className="font-bold uppercase"
          style={{ fontSize: "20px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          Matches
        </h1>
      </header>

      <section className="pt-5 pb-8">
        <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
          Loading matches...
        </p>
      </section>
    </main>
  );
}
