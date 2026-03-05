"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  match: (path: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Today",
    href: "/today",
    match: (p) => p === "/today",
  },
  {
    label: "Matches",
    href: "/matches",
    match: (p) => p === "/feed" || p === "/matches" || p.startsWith("/match/"),
  },
  {
    label: "Profile",
    href: "/profile",
    match: (p) => p === "/profile",
  },
];

export function GlobalNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: top horizontal bar */}
      <nav
        className="hidden sm:block fixed top-0 left-0 right-0 z-50"
        style={{
          background: "var(--bg-panel)",
          borderBottom: "1px solid var(--border-light)",
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ height: "48px", maxWidth: "1280px", margin: "0 auto", padding: "0 var(--space-md)" }}
        >
          <div className="flex items-center gap-2">
            <img src="/images/logo.png" alt="" style={{ width: "32px", height: "32px", objectFit: "contain" }} />
            <span
              className="font-mono font-bold uppercase"
              style={{ fontSize: "13px", letterSpacing: "0.06em", color: "var(--text-main)" }}
            >
              Bootroom
            </span>
          </div>
          <div className="flex items-center" style={{ gap: "var(--space-xs)" }}>
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="transition-colors"
                  style={{
                    color: active ? "var(--color-accent)" : "var(--text-tertiary)",
                    textDecoration: "none",
                    padding: "6px 12px",
                  }}
                >
                  <span
                    className="font-mono uppercase"
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.04em",
                      lineHeight: 1,
                      fontWeight: active ? 700 : 400,
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile: fixed bottom bar */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: "var(--bg-panel)",
          borderTop: "1px solid var(--border-light)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-center justify-around" style={{ height: "48px" }}>
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-center flex-1 h-full transition-colors"
                style={{
                  color: active ? "var(--color-accent)" : "var(--text-tertiary)",
                  textDecoration: "none",
                }}
              >
                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.04em",
                    lineHeight: 1,
                    fontWeight: active ? 700 : 400,
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
