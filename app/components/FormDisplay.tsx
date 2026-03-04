"use client";

import type { FormResult } from "@/lib/feed";

const FORM_OPACITY: Record<FormResult, number> = {
  W: 1.0,
  D: 0.5,
  L: 0.2,
};

const FORM_LABEL: Record<FormResult, string> = {
  W: "Win",
  D: "Draw",
  L: "Loss",
};

type Props = {
  form: FormResult[];
  label: "Home form" | "Away form";
};

export function FormDisplay({ form, label }: Props) {
  if (!form.length) return null;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-mono text-[12px] uppercase text-tertiary">{label}</span>
      <div className="flex items-center gap-0.5" aria-label={`${label}: ${form.join("-")}`}>
        {form.map((r, i) => (
          <div
            key={i}
            className="relative group shrink-0"
            style={{ width: 8, height: 8 }}
            title={`${FORM_LABEL[r]} (match ${i + 1})`}
          >
            <span
              className="block rounded-full"
              style={{
                width: 8,
                height: 8,
                background: "var(--text-main)",
                opacity: FORM_OPACITY[r],
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
