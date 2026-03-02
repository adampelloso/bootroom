"use client";

import { authClient } from "@/lib/auth-client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export function AccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-9 h-9 flex items-center justify-center border border-[var(--border-light)] transition-colors hover:bg-[var(--bg-surface)]"
        style={{ background: "var(--bg-body)" }}
        aria-label="Account menu"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-light)",
            minWidth: "160px",
            zIndex: 50,
          }}
        >
          <a
            href="/api/stripe/portal"
            style={{
              display: "block",
              padding: "10px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--text-sec)",
              textDecoration: "none",
              borderBottom: "1px solid var(--border-light)",
            }}
          >
            Manage subscription
          </a>
          <button
            onClick={handleSignOut}
            style={{
              display: "block",
              width: "100%",
              padding: "10px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--text-sec)",
              background: "none",
              border: "none",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
