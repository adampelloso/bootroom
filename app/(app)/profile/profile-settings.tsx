"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LeagueSelector } from "@/app/components/LeagueSelector";

const sectionStyle: React.CSSProperties = {
  borderBottom: "1px solid var(--border-light)",
  paddingBottom: "var(--space-lg)",
  marginBottom: "var(--space-lg)",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "12px",
  color: "var(--text-sec)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "var(--space-xs)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontFamily: "var(--font-mono)",
  fontSize: "13px",
  background: "var(--bg-surface)",
  border: "1px solid var(--border-light)",
  color: "var(--text-main)",
  marginBottom: "var(--space-sm)",
};

const btnStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "12px",
  padding: "8px 16px",
  border: "1px solid var(--border-light)",
  background: "var(--bg-surface)",
  color: "var(--text-main)",
  cursor: "pointer",
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-bold uppercase"
      style={{
        fontSize: "13px",
        letterSpacing: "0.04em",
        marginBottom: "var(--space-md)",
      }}
    >
      {children}
    </h2>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    active: { bg: "rgba(34,197,94,0.15)", text: "rgb(34,197,94)" },
    trialing: { bg: "rgba(212,255,0,0.15)", text: "var(--color-accent)" },
    canceled: { bg: "rgba(239,68,68,0.15)", text: "rgb(239,68,68)" },
    past_due: { bg: "rgba(234,179,8,0.15)", text: "rgb(234,179,8)" },
    none: { bg: "rgba(107,114,128,0.15)", text: "rgb(107,114,128)" },
  };
  const c = colors[status] ?? colors.none;

  return (
    <span
      className="font-mono"
      style={{
        fontSize: "12px",
        padding: "3px 8px",
        background: c.bg,
        color: c.text,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {status === "none" ? "No subscription" : status.replace("_", " ")}
    </span>
  );
}

export function ProfileSettings({
  email,
  subscriptionStatus,
  currentPeriodEnd,
}: {
  email: string;
  subscriptionStatus: string;
  currentPeriodEnd: number | null;
}) {
  const router = useRouter();

  // Account – change email
  const [newEmail, setNewEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState("");

  // Account – change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  // Theme
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Display preferences
  const [oddsFormat, setOddsFormat] = useState<"decimal" | "fractional" | "american">("decimal");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial = stored ?? "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);

    setOddsFormat((localStorage.getItem("oddsFormat") as typeof oddsFormat) ?? "decimal");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const handleChangeEmail = async () => {
    setEmailMsg("");
    if (!newEmail) return;
    const { error } = await authClient.changeEmail({ newEmail });
    if (error) {
      setEmailMsg(error.message ?? "Failed to change email");
    } else {
      setEmailMsg("Verification email sent");
      setNewEmail("");
    }
  };

  const handleChangePassword = async () => {
    setPwMsg("");
    if (!currentPassword || !newPassword) return;
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
    });
    if (error) {
      setPwMsg(error.message ?? "Failed to change password");
    } else {
      setPwMsg("Password updated");
      setCurrentPassword("");
      setNewPassword("");
    }
  };

  const handleDeleteAccount = async () => {
    const ok = window.confirm(
      "Are you sure you want to delete your account? This cannot be undone."
    );
    if (!ok) return;
    await authClient.deleteUser();
    router.push("/");
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  const periodEndStr = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div>
      {/* Leagues */}
      <section style={sectionStyle}>
        <SectionHeading>Leagues</SectionHeading>
        <LeagueSelector />
      </section>

      {/* Account */}
      <section style={sectionStyle}>

        <div style={{ marginBottom: "var(--space-md)" }}>
          <div style={labelStyle}>Email</div>
          <div
            className="font-mono"
            style={{ fontSize: "13px", marginBottom: "var(--space-sm)" }}
          >
            {email}
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="New email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
            />
            <button type="button" onClick={handleChangeEmail} style={btnStyle}>
              Change
            </button>
          </div>
          {emailMsg && (
            <div className="font-mono" style={{ fontSize: "12px", color: "var(--text-sec)", marginTop: "var(--space-xs)" }}>
              {emailMsg}
            </div>
          )}
        </div>

        <div style={{ marginBottom: "var(--space-md)" }}>
          <div style={labelStyle}>Password</div>
          <div className="flex flex-col gap-2" style={{ marginBottom: "var(--space-xs)" }}>
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0 }}
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0 }}
            />
          </div>
          <button type="button" onClick={handleChangePassword} style={btnStyle}>
            Change password
          </button>
          {pwMsg && (
            <div className="font-mono" style={{ fontSize: "12px", color: "var(--text-sec)", marginTop: "var(--space-xs)" }}>
              {pwMsg}
            </div>
          )}
        </div>

      </section>

      {/* Subscription */}
      <section style={sectionStyle}>
        <SectionHeading>Subscription</SectionHeading>
        <div className="flex items-center gap-3" style={{ marginBottom: "var(--space-sm)" }}>
          <StatusBadge status={subscriptionStatus} />
          {periodEndStr && (
            <span className="font-mono" style={{ fontSize: "12px", color: "var(--text-sec)" }}>
              {subscriptionStatus === "canceled" ? "Expires" : "Renews"} {periodEndStr}
            </span>
          )}
        </div>
        <a href="/api/stripe/portal" style={{ ...btnStyle, textDecoration: "none", display: "inline-block" }}>
          Manage subscription
        </a>
      </section>

      {/* Display */}
      <section style={sectionStyle}>
        <SectionHeading>Display</SectionHeading>

        <div style={{ marginBottom: "var(--space-md)" }}>
          <button type="button" onClick={toggleTheme} style={btnStyle}>
            {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          </button>
        </div>

        {/* Odds format */}
        <div style={{ marginBottom: "var(--space-md)" }}>
          <div style={labelStyle}>Odds Format</div>
          <div className="flex" style={{ gap: "2px" }}>
            {(["decimal", "fractional", "american"] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => {
                  setOddsFormat(fmt);
                  localStorage.setItem("oddsFormat", fmt);
                }}
                style={{
                  ...btnStyle,
                  background: oddsFormat === fmt ? "var(--text-main)" : "var(--bg-surface)",
                  color: oddsFormat === fmt ? "var(--bg-body)" : "var(--text-main)",
                  textTransform: "capitalize",
                }}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

      </section>

      {/* Sign out */}
      <section style={{ marginBottom: "var(--space-lg)" }}>
        <button type="button" onClick={handleSignOut} style={btnStyle}>
          Sign out
        </button>
      </section>

      {/* Delete account */}
      <section style={{ paddingBottom: "72px" }}>
        <button
          type="button"
          onClick={handleDeleteAccount}
          style={{
            ...btnStyle,
            color: "rgb(239,68,68)",
            borderColor: "rgba(239,68,68,0.3)",
          }}
        >
          Delete account
        </button>
      </section>
    </div>
  );
}
