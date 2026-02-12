import { SignUpForm } from "./components/SignUpForm";

export default function LandingPage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
        gap: "0",
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.3em",
          color: "#525252",
          textTransform: "uppercase",
          marginBottom: "20px",
        }}
      >
        Bootroom
      </div>

      {/* H1 */}
      <h1
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "28px",
          fontWeight: 700,
          color: "#fff",
          textAlign: "center",
          lineHeight: 1.2,
          letterSpacing: "-0.03em",
          marginBottom: "8px",
          maxWidth: "360px",
        }}
      >
        Match intelligence,
        <br />
        not noise.
      </h1>

      {/* Subline */}
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          color: "#737373",
          textAlign: "center",
          lineHeight: 1.5,
          marginBottom: "32px",
          maxWidth: "320px",
        }}
      >
        Stats-driven insights for every fixture.
        <br />
        Early access coming soon.
      </p>

      {/* Email capture */}
      <SignUpForm />
    </main>
  );
}
