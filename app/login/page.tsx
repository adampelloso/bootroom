import { AuthForm } from "@/app/components/AuthForm";

export default function LoginPage() {
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
          marginBottom: "32px",
        }}
      >
        Enter the Bootroom
      </h1>

      <AuthForm mode="login" />
    </main>
  );
}
