import Image from "next/image";
import { SignUpForm } from "./components/SignUpForm";

export default function LandingPage() {
  return (
    <main
      data-theme="dark"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
        background: "#0A0A0A",
      }}
    >
      {/* Logo */}
      <Image
        src="/images/bootroom.svg"
        alt="Bootroom"
        width={40}
        height={50}
        style={{ marginBottom: "24px" }}
      />

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
