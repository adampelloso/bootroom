import { AuthForm } from "@/app/components/AuthForm";

export default function SignupPage() {
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
      <h1
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "20px",
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "-0.03em",
          marginBottom: "8px",
        }}
      >
        Create your account
      </h1>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          color: "#737373",
          marginBottom: "32px",
        }}
      >
        7-day free trial, cancel anytime.
      </p>

      <AuthForm mode="signup" />
    </main>
  );
}
