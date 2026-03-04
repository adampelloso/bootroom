import type { SignalCategory } from "@/lib/signals/taxonomy";
import { CATEGORY_COLORS } from "@/lib/signals/taxonomy";

type Props = {
  label: string;
  category: SignalCategory;
};

export function SignalTag({ label, category }: Props) {
  const color = CATEGORY_COLORS[category];
  return (
    <span
      className="inline-flex items-center font-mono text-[10px] uppercase font-semibold px-1.5 py-0.5 whitespace-nowrap"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </span>
  );
}
