"use client";

import { authClient } from "@/lib/auth-client";
import { validateReferralSlug } from "@/lib/referral-slug";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LeagueSelector } from "@/app/components/LeagueSelector";

type ReferralEarningItem = {
  id: string;
  referredEmail: string;
  paymentAmount: number;
  commissionAmount: number;
  status: "pending" | "paid";
  createdAt: number;
  paidAt: number | null;
};

type ReferralSnapshot = {
  referralCode: string;
  referralSlug: string | null;
  activeReferrals: number;
  pendingEarnings: number;
  totalEarned: number;
  earnings: ReferralEarningItem[];
} | null;

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

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function ProfileSettings({
  email,
  subscriptionStatus,
  currentPeriodEnd,
  appBaseUrl,
  referral,
}: {
  email: string;
  subscriptionStatus: string;
  currentPeriodEnd: number | null;
  appBaseUrl: string;
  referral: ReferralSnapshot;
}) {
  const router = useRouter();

  const [newEmail, setNewEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const [oddsFormat, setOddsFormat] = useState<"decimal" | "fractional" | "american">("decimal");

  const [referralCode, setReferralCode] = useState(referral?.referralCode ?? "");
  const [referralSlugInput, setReferralSlugInput] = useState(referral?.referralSlug ?? "");
  const [activeSlug, setActiveSlug] = useState<string | null>(referral?.referralSlug ?? null);
  const [referralMsg, setReferralMsg] = useState("");
  const [referralMsgError, setReferralMsgError] = useState(false);
  const [savingReferral, setSavingReferral] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const activeReferrals = referral?.activeReferrals ?? 0;
  const pendingEarnings = referral?.pendingEarnings ?? 0;
  const totalEarned = referral?.totalEarned ?? 0;
  const earnings = referral?.earnings ?? [];

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial = stored ?? "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);

    setOddsFormat((localStorage.getItem("oddsFormat") as typeof oddsFormat) ?? "decimal");
  }, []);

  const activeReferralPath = activeSlug || referralCode;
  const activeReferralLink = useMemo(() => {
    if (!activeReferralPath) return "";
    return `${appBaseUrl}/ref/${activeReferralPath}`;
  }, [activeReferralPath, appBaseUrl]);

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

  const handleCopyReferralLink = async () => {
    if (!activeReferralLink) return;
    await navigator.clipboard.writeText(activeReferralLink);
    setCopyLabel("Copied!");
    window.setTimeout(() => setCopyLabel("Copy"), 2000);
  };

  const handleReferralBlur = () => {
    const validation = validateReferralSlug(referralSlugInput);
    if (!validation.ok) {
      setReferralMsg(validation.message);
      setReferralMsgError(true);
      return;
    }
    setReferralMsg("");
    setReferralMsgError(false);
  };

  const handleSaveReferralSlug = async () => {
    const validation = validateReferralSlug(referralSlugInput);
    if (!validation.ok) {
      setReferralMsg(validation.message);
      setReferralMsgError(true);
      return;
    }

    setSavingReferral(true);
    setReferralMsg("");
    setReferralMsgError(false);
    try {
      const res = await fetch("/api/referrals/slug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: validation.slug ?? "" }),
      });
      const data = await res.json().catch(() => ({} as { error?: string; slug?: string | null; referralCode?: string | null }));
      if (!res.ok) {
        if (data.error === "This URL is already taken") {
          setReferralMsg("Already taken");
        } else if (data.error === "This URL is not available") {
          setReferralMsg("Not available");
        } else {
          setReferralMsg(data.error ?? "Failed to save URL");
        }
        setReferralMsgError(true);
        return;
      }

      setActiveSlug(data.slug ?? null);
      setReferralSlugInput(data.slug ?? "");
      if (typeof data.referralCode === "string") setReferralCode(data.referralCode);
      setReferralMsg("Saved");
      setReferralMsgError(false);
    } catch {
      setReferralMsg("Failed to save URL");
      setReferralMsgError(true);
    } finally {
      setSavingReferral(false);
    }
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
      <section style={sectionStyle}>
        <SectionHeading>Leagues</SectionHeading>
        <LeagueSelector />
      </section>

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

      <section style={sectionStyle}>
        <SectionHeading>Referral Program</SectionHeading>
        <p
          className="font-mono"
          style={{ fontSize: "13px", color: "var(--text-sec)", marginBottom: "var(--space-md)" }}
        >
          Earn 10% of every payment from subscribers you refer, for life.
        </p>

        <div style={{ marginBottom: "var(--space-md)" }}>
          <div style={labelStyle}>Your referral link</div>
          <div className="flex gap-2">
            <input
              readOnly
              value={activeReferralLink}
              style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
            />
            <button type="button" onClick={handleCopyReferralLink} style={btnStyle}>
              {copyLabel}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "var(--space-sm)" }}>
          <div style={labelStyle}>Vanity URL (optional)</div>
          <div className="flex gap-2 items-center">
            <div
              className="font-mono"
              style={{
                fontSize: "13px",
                color: "var(--text-sec)",
                border: "1px solid var(--border-light)",
                borderRight: "none",
                padding: "8px 10px",
                background: "var(--bg-surface)",
              }}
            >
              {appBaseUrl}/ref/
            </div>
            <input
              value={referralSlugInput}
              onChange={(e) => setReferralSlugInput(e.target.value)}
              onBlur={handleReferralBlur}
              placeholder="your-custom-url"
              style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
            />
            <button type="button" onClick={handleSaveReferralSlug} style={btnStyle} disabled={savingReferral}>
              {savingReferral ? "..." : "Save"}
            </button>
          </div>
          {referralMsg && (
            <div
              className="font-mono"
              style={{
                fontSize: "12px",
                color: referralMsgError ? "#EF4444" : "var(--text-sec)",
                marginTop: "var(--space-xs)",
              }}
            >
              {referralMsg}
            </div>
          )}
        </div>

        <hr style={{ borderColor: "var(--border-light)", margin: "var(--space-md) 0" }} />

        <div style={{ marginBottom: "var(--space-sm)" }}>
          <div style={labelStyle}>Your earnings</div>
          <div className="font-mono" style={{ fontSize: "13px", display: "grid", gap: "8px" }}>
            <div className="flex justify-between">
              <span>Active referrals</span>
              <span>{activeReferrals}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending earnings</span>
              <span>{formatUsd(pendingEarnings)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total earned</span>
              <span>{formatUsd(totalEarned)}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowBreakdown((v) => !v)}
          style={{ ...btnStyle, border: "none", textDecoration: "underline", textUnderlineOffset: "3px", paddingLeft: 0 }}
        >
          {showBreakdown ? "Hide breakdown" : "View breakdown ->"}
        </button>

        {showBreakdown && (
          <div style={{ marginTop: "var(--space-sm)", display: "grid", gap: "8px" }}>
            {earnings.length === 0 ? (
              <p className="font-mono" style={{ fontSize: "12px", color: "var(--text-sec)", margin: 0 }}>
                No earnings yet.
              </p>
            ) : (
              earnings.map((item) => (
                <div
                  key={item.id}
                  className="font-mono"
                  style={{
                    fontSize: "12px",
                    border: "1px solid var(--border-light)",
                    padding: "8px 10px",
                    display: "grid",
                    gap: "4px",
                  }}
                >
                  <div className="flex justify-between">
                    <span>{item.referredEmail}</span>
                    <span>{formatUsd(item.commissionAmount)}</span>
                  </div>
                  <div style={{ color: "var(--text-sec)" }}>
                    Payment {formatUsd(item.paymentAmount)} | {item.status}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

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

      <section style={sectionStyle}>
        <SectionHeading>Display</SectionHeading>

        <div style={{ marginBottom: "var(--space-md)" }}>
          <button type="button" onClick={toggleTheme} style={btnStyle}>
            {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          </button>
        </div>

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
                  window.dispatchEvent(new Event("oddsFormatChanged"));
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

      <section style={{ marginBottom: "var(--space-lg)" }}>
        <button type="button" onClick={handleSignOut} style={btnStyle}>
          Sign out
        </button>
      </section>

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
