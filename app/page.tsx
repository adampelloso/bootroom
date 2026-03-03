export default function LandingPage() {
  const section: React.CSSProperties = {
    maxWidth: "1080px",
    margin: "0 auto",
    padding: "0 24px",
  };

  return (
    <main
      data-theme="dark"
      style={{
        background: "#0A0A0A",
        minHeight: "100vh",
        fontFamily: "var(--font-mono)",
        color: "#E5E5E5",
      }}
    >
      {/* ─── NAV ─── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#0A0A0A",
          borderBottom: "1px solid #262626",
        }}
      >
        <div
          style={{
            ...section,
            height: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color: "#fff",
            }}
          >
            BOOTROOM
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <a
              href="/login"
              style={{
                fontSize: "13px",
                color: "#737373",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Sign in
            </a>
            <a
              href="/signup"
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#000",
                background: "#fff",
                padding: "8px 20px",
                textDecoration: "none",
                letterSpacing: "0.02em",
              }}
            >
              Get started
            </a>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section style={{ ...section, paddingTop: "80px", paddingBottom: "64px", textAlign: "center" }}>
        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "#fff",
            margin: "0 auto 16px",
          }}
        >
          The beautiful game deserves beautiful data
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#737373",
            lineHeight: 1.7,
            maxWidth: "520px",
            margin: "0 auto 40px",
          }}
        >
          100K simulations per match powered by 2K+ data points
        </p>
        <a
          href="/signup"
          style={{
            display: "inline-block",
            fontSize: "14px",
            fontWeight: 600,
            color: "#000",
            background: "#fff",
            padding: "14px 36px",
            textDecoration: "none",
            letterSpacing: "0.02em",
          }}
        >
          {"Start free trial \u2192"}
        </a>

        {/* ─── PRODUCT PREVIEW ─── */}
        <div style={{ marginTop: "64px" }}>
          {/* Mock feed — 2 column grid */}
          <div
            style={{
              background: "#0A0A0A",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <PreviewCard
              league="PREMIER LEAGUE"
              time="16:30"
              homeCode="LIV"
              homeLogo="https://media.api-sports.io/football/teams/40.png"
              awayCode="MUN"
              awayLogo="https://media.api-sports.io/football/teams/33.png"
              homeXg="1.9"
              awayXg="1.1"
              totalXg="3.0"
              homeCorners="6.1"
              awayCorners="3.9"
              totalCorners="10.0"
              over25={74}
              btts={66}
              scorelines={[
                { score: "2-1", prob: 15 },
                { score: "2-0", prob: 12 },
                { score: "1-1", prob: 10 },
              ]}
              h2h="12-5-8"
            />

            <PreviewCard
              league="LA LIGA"
              time="21:00"
              homeCode="BAR"
              homeLogo="https://media.api-sports.io/football/teams/529.png"
              awayCode="RMA"
              awayLogo="https://media.api-sports.io/football/teams/541.png"
              homeXg="2.2"
              awayXg="1.4"
              totalXg="3.6"
              homeCorners="6.8"
              awayCorners="4.5"
              totalCorners="11.3"
              over25={79}
              btts={71}
              scorelines={[
                { score: "2-1", prob: 16 },
                { score: "3-1", prob: 11 },
                { score: "1-1", prob: 9 },
              ]}
              h2h="10-7-10"
            />
          </div>

          {/* Fade overlay */}
          <div
            style={{
              height: "80px",
              background: "linear-gradient(to bottom, transparent, #0A0A0A)",
              marginTop: "-80px",
              position: "relative",
              zIndex: 1,
            }}
          />
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section style={{ ...section, paddingTop: "64px", paddingBottom: "64px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0" }}>
          <FeatureCard title="MATCH FEED" bullets={["Every fixture across 10+ leagues", "BTTS, Over 2.5, corners, xG", "Ranked by model confidence", "Best signals surface first"]} />
          <FeatureCard title="SIMULATION ENGINE" bullets={["100,000 Monte Carlo runs per match", "Full scoreline distributions", "Probability breakdowns for every market", "Model vs. bookmaker edge detection"]} />
          <FeatureCard title="DEEP ANALYSIS" bullets={["Head-to-head records", "Corner and xG trends over time", "Player-level projections", "Filtered by venue, competition, and form"]} />
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section style={{ ...section, paddingTop: "64px", paddingBottom: "80px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#525252", marginBottom: "32px", textAlign: "center" }}>
          PRICING
        </div>

        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <PricingCard label="MONTHLY" price="$5" period="/mo" />
          <PricingCard label="YEARLY" price="$25" period="/yr" badge="SAVE 60%" featured />
        </div>

        <p style={{ fontSize: "12px", color: "#525252", textAlign: "center", marginTop: "20px" }}>
          7 day free trial. Cancel anytime.
        </p>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ padding: "24px", textAlign: "center" }}>
        <span style={{ fontSize: "11px", color: "#333", letterSpacing: "0.04em" }}>
          BOOTROOM &middot; 2026
        </span>
      </footer>
    </main>
  );
}

/* ─── SUBCOMPONENTS ─── */

function FeatureCard({ title, bullets }: { title: string; bullets: string[] }) {
  return (
    <div style={{ border: "1px solid #262626", padding: "28px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#E5E5E5" }}>{title}</span>
      <ul style={{ listStyle: "disc", paddingLeft: "16px", margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
        {bullets.map((b) => (
          <li key={b} style={{ fontSize: "13px", color: "#737373", lineHeight: 1.5 }}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

function pillColor(pct: number): { bg: string; text: string } {
  if (pct >= 75) return { bg: "#22c55e", text: "#000" };
  if (pct >= 60) return { bg: "#84cc16", text: "#000" };
  if (pct >= 50) return { bg: "#eab308", text: "#000" };
  if (pct >= 40) return { bg: "#f97316", text: "#000" };
  return { bg: "#ef4444", text: "#fff" };
}

function PreviewCard({
  league, time, homeCode, homeLogo, awayCode, awayLogo,
  homeXg, awayXg, totalXg, homeCorners, awayCorners, totalCorners,
  over25, btts, scorelines, h2h,
}: {
  league: string; time: string; homeCode: string; homeLogo: string; awayCode: string; awayLogo: string;
  homeXg: string; awayXg: string; totalXg: string; homeCorners: string; awayCorners: string; totalCorners: string;
  over25: number; btts: number; scorelines: { score: string; prob: number }[]; h2h: string;
}) {
  const btnStyle: React.CSSProperties = {
    border: "2px solid #E5E5E5", color: "#E5E5E5", background: "transparent",
    fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-mono)",
    textTransform: "uppercase", letterSpacing: "0.04em", padding: "2px 8px",
  };
  const thStyle: React.CSSProperties = {
    fontSize: "10px", fontWeight: 700, color: "#525252", padding: "6px 8px",
    textTransform: "uppercase" as const, letterSpacing: "0.06em",
  };
  const labelStyle: React.CSSProperties = {
    padding: "6px 8px", fontSize: "12px", fontWeight: 600, color: "#A3A3A3",
    textTransform: "uppercase" as const, textAlign: "left" as const,
  };
  const valStyle: React.CSSProperties = {
    padding: "6px 8px", fontSize: "13px", fontWeight: 700, color: "#E5E5E5",
  };
  const o25Pill = pillColor(over25);
  const bttsPill = pillColor(btts);

  return (
    <div style={{ border: "2px solid #E5E5E5", padding: "12px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#A3A3A3", textTransform: "uppercase" as const }}>{league}</span>
          <span style={{ fontSize: "11px", color: "#525252" }}>{time}</span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <span style={btnStyle}>H2H</span>
          <span style={btnStyle}>SIM</span>
        </div>
      </div>

      {/* Teams */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img src={homeLogo} alt="" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
          <span style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, textTransform: "uppercase" as const, color: "#E5E5E5" }}>{homeCode}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img src={awayLogo} alt="" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
          <span style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, textTransform: "uppercase" as const, color: "#E5E5E5" }}>{awayCode}</span>
        </div>
      </div>

      {/* Stats table */}
      <table style={{ width: "100%", borderCollapse: "collapse" as const, fontFamily: "var(--font-mono)" }}>
        <thead>
          <tr style={{ background: "#141414" }}>
            <th style={{ ...thStyle, textAlign: "left" as const, width: "40%" }}>Stat</th>
            <th style={{ ...thStyle, textAlign: "center" as const, width: "20%" }}>Home</th>
            <th style={{ ...thStyle, textAlign: "center" as const, width: "20%" }}>Away</th>
            <th style={{ ...thStyle, textAlign: "right" as const, width: "20%" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #1A1A1A" }}>
            <td style={labelStyle}>xG</td>
            <td style={{ ...valStyle, textAlign: "center" as const }}>{homeXg}</td>
            <td style={{ ...valStyle, textAlign: "center" as const }}>{awayXg}</td>
            <td style={{ ...valStyle, textAlign: "right" as const }}>{totalXg}</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #1A1A1A" }}>
            <td style={labelStyle}>xCorners</td>
            <td style={{ ...valStyle, textAlign: "center" as const }}>{homeCorners}</td>
            <td style={{ ...valStyle, textAlign: "center" as const }}>{awayCorners}</td>
            <td style={{ ...valStyle, textAlign: "right" as const }}>{totalCorners}</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #1A1A1A" }}>
            <td style={labelStyle}>Over 2.5</td>
            <td colSpan={3} style={{ padding: "6px 8px", textAlign: "right" as const }}>
              <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700, background: o25Pill.bg, color: o25Pill.text }}>{over25}%</span>
            </td>
          </tr>
          <tr>
            <td style={labelStyle}>BTTS</td>
            <td colSpan={3} style={{ padding: "6px 8px", textAlign: "right" as const }}>
              <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700, background: bttsPill.bg, color: bttsPill.text }}>{btts}%</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Top scorelines */}
      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
        {scorelines.map((s) => (
          <div key={s.score} style={{ flex: 1, background: "#141414", padding: "8px 0", textAlign: "center" as const }}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#E5E5E5" }}>{s.score}</div>
            <div style={{ fontSize: "11px", color: "#525252" }}>{s.prob}%</div>
          </div>
        ))}
      </div>

      {/* H2H */}
      <div style={{ paddingTop: "8px", marginTop: "8px", borderTop: "1px solid #262626", fontSize: "11px", color: "#525252", textTransform: "uppercase" as const }}>
        H2H: {h2h}
      </div>
    </div>
  );
}

function PricingCard({ label, price, period, badge, featured }: {
  label: string; price: string; period: string; badge?: string; featured?: boolean;
}) {
  return (
    <div style={{ flex: "1 1 280px", maxWidth: "300px", border: featured ? "2px solid #E5E5E5" : "1px solid #333", padding: "28px 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#737373" }}>{label}</span>
        {badge && <span style={{ fontSize: "11px", fontWeight: 600, color: "#22C55E", letterSpacing: "0.04em" }}>{badge}</span>}
      </div>
      <div style={{ marginBottom: "24px" }}>
        <span style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.03em", color: "#fff" }}>{price}</span>
        <span style={{ fontSize: "14px", color: "#737373", marginLeft: "4px" }}>{period}</span>
      </div>
      <a
        href="/signup"
        style={{ display: "block", width: "100%", textAlign: "center", fontSize: "13px", fontWeight: 600, color: "#000", background: "#fff", padding: "12px", textDecoration: "none", letterSpacing: "0.02em" }}
      >
        Try it for free
      </a>
    </div>
  );
}
