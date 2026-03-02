"use client";

import { useState } from "react";

const MONTHLY_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!;
const YEARLY_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY!;

export default function SubscribePage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (priceId: string) => {
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
        setLoading(null);
      }
    } catch {
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
            <span style={{ fontSize: "28px", fontWeight: 700, color: "#fff" }}>$10</span>
            <span style={{ fontSize: "13px", color: "#737373" }}>/mo</span>
          </div>
          <button
            onClick={() => handleCheckout(MONTHLY_PRICE)}
            disabled={loading !== null}
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#000",
              background: "#fff",
              border: "1px solid #fff",
              padding: "12px",
              cursor: loading ? "wait" : "pointer",
              opacity: loading === MONTHLY_PRICE ? 0.7 : 1,
              letterSpacing: "0.02em",
              marginTop: "auto",
            }}
          >
            {loading === MONTHLY_PRICE ? "..." : "Start free trial"}
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
            <span style={{ fontSize: "28px", fontWeight: 700, color: "#fff" }}>$50</span>
            <span style={{ fontSize: "13px", color: "#737373" }}>/yr</span>
          </div>
          <button
            onClick={() => handleCheckout(YEARLY_PRICE)}
            disabled={loading !== null}
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#000",
              background: "#fff",
              border: "1px solid #fff",
              padding: "12px",
              cursor: loading ? "wait" : "pointer",
              opacity: loading === YEARLY_PRICE ? 0.7 : 1,
              letterSpacing: "0.02em",
              marginTop: "auto",
            }}
          >
            {loading === YEARLY_PRICE ? "..." : "Start free trial"}
          </button>
        </div>
      </div>

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
