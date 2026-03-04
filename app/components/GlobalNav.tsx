"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  match: (path: string) => boolean;
  icon: (active: boolean) => React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Today",
    href: "/today",
    match: (p) => p === "/today",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        {active && <rect x="7" y="14" width="4" height="4" rx="0.5" fill="currentColor" stroke="none" />}
      </svg>
    ),
  },
  {
    label: "Matches",
    href: "/matches",
    match: (p) => p === "/feed" || p === "/matches" || p.startsWith("/match/"),
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2 L14.5 8 L12 12 L9.5 8 Z" fill={active ? "currentColor" : "none"} />
        <path d="M12 12 L17 9.5 L19 14 L14.5 15 Z" fill={active ? "currentColor" : "none"} />
        <path d="M12 12 L7 9.5 L5 14 L9.5 15 Z" fill={active ? "currentColor" : "none"} />
        <path d="M12 12 L9.5 15 L10.5 20 L13.5 20 L14.5 15 Z" fill={active ? "currentColor" : "none"} />
      </svg>
    ),
  },
  {
    label: "Leagues",
    href: "/leagues",
    match: (p) => p === "/leagues" || p.startsWith("/leagues/"),
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 22V14.5a.5.5 0 0 0-.5-.5H8a1 1 0 0 1-1-1V4h10v9a1 1 0 0 1-1 1h-1.5a.5.5 0 0 0-.5.5V22" fill={active ? "currentColor" : "none"} />
      </svg>
    ),
  },
  {
    label: "Tools",
    href: "/tools",
    match: (p) => p === "/tools" || p.startsWith("/tools/"),
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill={active ? "currentColor" : "none"} />
      </svg>
    ),
  },
  {
    label: "Account",
    href: "/profile",
    match: (p) => p === "/profile",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" fill={active ? "currentColor" : "none"} />
        <path d="M20 21a8 8 0 1 0-16 0" fill={active ? "currentColor" : "none"} />
      </svg>
    ),
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
          style={{ height: "48px", maxWidth: "960px", margin: "0 auto", padding: "0 var(--space-md)" }}
        >
          <span
            className="font-mono font-bold uppercase"
            style={{ fontSize: "13px", letterSpacing: "0.06em", color: "var(--text-main)" }}
          >
            Bootroom
          </span>
          <div className="flex items-center" style={{ gap: "var(--space-xs)" }}>
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 transition-colors"
                  style={{
                    color: active ? "var(--color-accent)" : "var(--text-tertiary)",
                    textDecoration: "none",
                    padding: "6px 12px",
                  }}
                >
                  {item.icon(active)}
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
        <div className="flex items-center justify-around" style={{ height: "60px" }}>
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors"
                style={{
                  color: active ? "var(--color-accent)" : "var(--text-tertiary)",
                  textDecoration: "none",
                }}
              >
                {item.icon(active)}
                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.04em",
                    lineHeight: 1,
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
