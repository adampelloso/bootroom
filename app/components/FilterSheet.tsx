"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { VenueCondition, SampleCondition, TimeCondition } from "./ConditionsRow";

const VENUE_OPTIONS: Array<{ key: VenueCondition; label: string }> = [
  { key: "Home", label: "Home" },
  { key: "Away", label: "Away" },
  { key: "Combined", label: "Combined" },
];

const SAMPLE_OPTIONS: Array<{ key: SampleCondition; label: string }> = [
  { key: "L5", label: "L5" },
  { key: "L10", label: "L10" },
  { key: "Season", label: "Season" },
];

export function FilterSheet({
  venue,
  sample,
  time,
}: {
  venue: VenueCondition;
  sample: SampleCondition;
  time: TimeCondition;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const buildUrl = useCallback(
    (updates: { venue?: VenueCondition; sample?: SampleCondition; time?: TimeCondition }) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (updates.venue != null) sp.set("venue", updates.venue);
      if (updates.sample != null) sp.set("sample", updates.sample);
      if (updates.time != null) sp.set("time", updates.time);
      return `${pathname}?${sp.toString()}`;
    },
    [pathname, searchParams],
  );

  // Close on escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-mono text-[12px] uppercase px-3 py-2 transition-colors"
        style={{
          border: "1px solid var(--border-light)",
          color: "var(--text-sec)",
          background: "transparent",
        }}
        aria-label="Open filters"
      >
        Filters: {venue} · {sample}
      </button>

      {/* Overlay + Sheet */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setOpen(false)}
          />
          {/* Bottom sheet */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{
              background: "var(--bg-panel)",
              borderTop: "1px solid var(--border-light)",
              padding: "var(--space-md)",
              paddingBottom: "max(var(--space-lg), env(safe-area-inset-bottom))",
              animation: "sheet-slide-up 200ms ease-out",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-semibold uppercase tracking-[0.08em]">Filters</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-tertiary text-[18px] leading-none px-2"
                aria-label="Close filters"
              >
                ×
              </button>
            </div>

            {/* Venue */}
            <div className="mb-4">
              <span className="text-mono text-[12px] uppercase text-tertiary block mb-2">Venue</span>
              <div className="flex gap-2">
                {VENUE_OPTIONS.map((opt) => {
                  const isSelected = venue === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        router.push(buildUrl({ venue: opt.key }), { scroll: false });
                        setOpen(false);
                      }}
                      className="flex-1 text-mono text-[12px] uppercase py-2 transition-colors"
                      style={{
                        background: isSelected ? "var(--bg-accent)" : "transparent",
                        color: isSelected ? "var(--text-on-accent)" : "var(--text-tertiary)",
                        border: isSelected ? "none" : "1px solid var(--border-light)",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sample */}
            <div className="mb-4">
              <span className="text-mono text-[12px] uppercase text-tertiary block mb-2">Sample</span>
              <div className="flex gap-2">
                {SAMPLE_OPTIONS.map((opt) => {
                  const isSelected = sample === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        router.push(buildUrl({ sample: opt.key }), { scroll: false });
                        setOpen(false);
                      }}
                      className="flex-1 text-mono text-[12px] uppercase py-2 transition-colors"
                      style={{
                        background: isSelected ? "var(--bg-accent)" : "transparent",
                        color: isSelected ? "var(--text-on-accent)" : "var(--text-tertiary)",
                        border: isSelected ? "none" : "1px solid var(--border-light)",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time */}
            <div>
              <span className="text-mono text-[12px] uppercase text-tertiary block mb-2">Time</span>
              <div className="flex gap-2">
                <span
                  className="flex-1 text-mono text-[12px] uppercase py-2 text-center"
                  style={{
                    background: "var(--bg-accent)",
                    color: "var(--text-on-accent)",
                  }}
                >
                  Full
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
