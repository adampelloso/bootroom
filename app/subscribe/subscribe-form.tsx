"use client";

import { useState } from "react";

type Props = {
  monthlyPriceId: string;
  yearlyPriceId: string;
};

export function SubscribeForm({ monthlyPriceId, yearlyPriceId }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (priceId: string) => {
    setError(null);
    setLoading(priceId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || `No checkout URL returned (status ${res.status})`);
        setLoading(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setLoading(null);
    }
  };

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
        fontFamily: "var(--font-mono)",
      }}
    >
      <h1
        style={{
          fontSize: "20px",
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "-0.03em",
          marginBottom: "8px",
        }}
      >
        Subscribe to continue
      </h1>
      <p
        style={{
          fontSize: "13px",
          color: "#737373",
          textAlign: "center",
          lineHeight: 1.5,
          marginBottom: "40px",
          maxWidth: "320px",
        }}
      >
        Start your 7-day free trial to access Bootroom.
      </p>

      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: "600px",
          width: "100%",
        }}
      >
        {/* Monthly */}
        <div
          style={{
            flex: "1 1 240px",
            maxWidth: "280px",
            border: "1px solid #333",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#737373",
              marginBottom: "12px",
            }}
          >
            MONTHLY
          </div>
          <div style={{ marginBottom: "20px" }}>
            <span style={{ fontSize: "28px", fontWeight: 700, color: "#fff" }}>$5</span>
            <span style={{ fontSize: "13px", color: "#737373" }}>/mo</span>
          </div>
          <button
            onClick={() => handleCheckout(monthlyPriceId)}
            disabled={loading !== null}
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#000",
              background: "#fff",
              border: "1px solid #fff",
              padding: "12px",
              cursor: loading ? "wait" : "pointer",
              opacity: loading === monthlyPriceId ? 0.7 : 1,
              letterSpacing: "0.02em",
              marginTop: "auto",
            }}
          >
            {loading === monthlyPriceId ? "..." : "Start free trial"}
          </button>
        </div>

        {/* Yearly */}
        <div
          style={{
            flex: "1 1 240px",
            maxWidth: "280px",
            border: "2px solid #E5E5E5",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#737373",
              }}
            >
              YEARLY
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#22C55E",
                letterSpacing: "0.04em",
              }}
            >
              SAVE 60%
            </span>
          </div>
          <div style={{ marginBottom: "20px" }}>
            <span style={{ fontSize: "28px", fontWeight: 700, color: "#fff" }}>$25</span>
            <span style={{ fontSize: "13px", color: "#737373" }}>/yr</span>
          </div>
          <button
            onClick={() => handleCheckout(yearlyPriceId)}
            disabled={loading !== null}
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#000",
              background: "#fff",
              border: "1px solid #fff",
              padding: "12px",
              cursor: loading ? "wait" : "pointer",
              opacity: loading === yearlyPriceId ? 0.7 : 1,
              letterSpacing: "0.02em",
              marginTop: "auto",
            }}
          >
            {loading === yearlyPriceId ? "..." : "Start free trial"}
          </button>
        </div>
      </div>

      {error && (
        <p style={{ fontSize: "12px", color: "#EF4444", marginTop: "16px", textAlign: "center", maxWidth: "400px" }}>
          {error}
        </p>
      )}

      <p
        style={{
          fontSize: "12px",
          color: "#525252",
          marginTop: "20px",
        }}
      >
        Cancel anytime. No commitment.
      </p>

      <a
        href="/"
        style={{
          fontSize: "12px",
          color: "#525252",
          marginTop: "12px",
          textDecoration: "underline",
          textUnderlineOffset: "3px",
        }}
      >
        Back to home
      </a>
    </main>
  );
}
