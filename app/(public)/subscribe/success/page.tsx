"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 15;

  useEffect(() => {
    const timer = setInterval(async () => {
      setAttempts((a) => a + 1);
      try {
        const url = sessionId
          ? `/api/subscription/status?session_id=${encodeURIComponent(sessionId)}`
          : "/api/subscription/status";
        const res = await fetch(url, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (!data.active) return;
          clearInterval(timer);
          router.replace("/matches");
          return;
        }
      } catch {
        // keep polling
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [router, sessionId]);

  if (attempts >= maxAttempts) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-body)",
          fontFamily: "var(--font-mono)",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "16px", color: "var(--text-main)", marginBottom: "12px" }}>
          Payment received — your subscription is being activated.
        </p>
        <p style={{ fontSize: "14px", color: "var(--text-sec)", marginBottom: "24px" }}>
          This is taking longer than expected. Try refreshing.
        </p>
        <button
          onClick={() => router.replace("/matches")}
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#000",
            background: "#fff",
            padding: "10px 24px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Continue to matches
        </button>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-body)",
        fontFamily: "var(--font-mono)",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: "16px", color: "var(--text-main)", marginBottom: "8px" }}>
        Activating your subscription...
      </p>
      <p style={{ fontSize: "14px", color: "var(--text-sec)" }}>
        This usually takes a few seconds.
      </p>
    </main>
  );
}

export default function SubscribeSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
