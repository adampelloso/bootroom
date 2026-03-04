import Link from "next/link";

export function AccountButton() {
  return (
    <Link
      href="/profile"
      className="w-9 h-9 flex items-center justify-center border border-[var(--border-light)] transition-colors hover:bg-[var(--bg-surface)]"
      style={{ background: "var(--bg-body)" }}
      aria-label="Profile"
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
    </Link>
  );
}
