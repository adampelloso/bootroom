"use client";

import Link from "next/link";

type FormFilterValue = "all" | "same";

type Props = {
  matchId: string;
  currentForm: FormFilterValue;
  searchParams: Record<string, string | undefined>;
};

function buildUrl(matchId: string, form: FormFilterValue, search: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  if (form !== "all") sp.set("form", form);
  for (const [k, v] of Object.entries(search)) {
    if (k === "form") continue;
    if (v != null && v !== "") sp.set(k, v);
  }
  const q = sp.toString();
  return `/match/${matchId}${q ? `?${q}` : ""}`;
}

export function FormFilterLinks({ matchId, currentForm, searchParams }: Props) {
  return (
    <div className="flex items-center gap-2 text-mono text-[12px] uppercase text-tertiary">
      <span className="mr-1">Form:</span>
      <Link
        href={buildUrl(matchId, "all", searchParams)}
        className={currentForm === "all" ? "font-semibold text-[var(--text-main)]" : "hover:text-[var(--text-sec)]"}
      >
        All
      </Link>
      <span aria-hidden>|</span>
      <Link
        href={buildUrl(matchId, "same", searchParams)}
        className={currentForm === "same" ? "font-semibold text-[var(--text-main)]" : "hover:text-[var(--text-sec)]"}
      >
        This competition
      </Link>
    </div>
  );
}
