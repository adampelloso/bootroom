"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: "var(--font-mono)",
  fontSize: "13px",
  color: "#fff",
  background: "#141414",
  border: "1px solid #333",
  padding: "10px 14px",
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: "var(--font-mono)",
  fontSize: "13px",
  fontWeight: 600,
  color: "#000",
  background: "#fff",
  border: "1px solid #fff",
  padding: "12px 20px",
  cursor: "pointer",
  letterSpacing: "0.02em",
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/feed",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0],
        });
        if (res.error) {
          setError(res.error.message || "Signup failed");
          setLoading(false);
          return;
        }
        // Redirect to feed — auth guard will send non-admin users
        // to /subscribe if they don't have an active subscription
        router.push("/feed");
      } else {
        const res = await authClient.signIn.email({
          email,
          password,
        });
        if (res.error) {
          setError(res.error.message || "Invalid credentials");
          setLoading(false);
          return;
        }
        router.push("/feed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "100%",
        maxWidth: "340px",
      }}
    >
      <button
        type="button"
        onClick={handleGoogle}
        style={{
          ...buttonStyle,
          background: "none",
          color: "#fff",
          border: "1px solid #333",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}>
        <div style={{ flex: 1, height: "1px", background: "#333" }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#525252" }}>or</span>
        <div style={{ flex: 1, height: "1px", background: "#333" }} />
      </div>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={inputStyle}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        style={inputStyle}
      />

      {error && (
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "#EF4444",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          ...buttonStyle,
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "..." : mode === "signup" ? "Create account" : "Sign in"}
      </button>

      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          color: "#737373",
          textAlign: "center",
          margin: 0,
        }}
      >
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <a
              href="/login"
              style={{ color: "#A3A3A3", textDecoration: "underline", textUnderlineOffset: "3px" }}
            >
              Sign in
            </a>
          </>
        ) : (
          <>
            No account?{" "}
            <a
              href="/signup"
              style={{ color: "#A3A3A3", textDecoration: "underline", textUnderlineOffset: "3px" }}
            >
              Create one
            </a>
          </>
        )}
      </p>
    </form>
  );
}
