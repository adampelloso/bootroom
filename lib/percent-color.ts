/**
 * Chromatic color scale for percentages.
 * 0-24 = reds, 25-49 = oranges, 50-74 = yellows, 75-100 = greens.
 * Darker at the extremes, lighter in the middle of each band.
 */

const SCALE: [number, string][] = [
  [0, "#b91c1c"],   // red-700
  [10, "#dc2626"],  // red-600
  [20, "#ef4444"],  // red-500
  [30, "#ea580c"],  // orange-600
  [40, "#f97316"],  // orange-500
  [50, "#eab308"],  // yellow-500
  [60, "#a3e635"],  // lime-400
  [70, "#84cc16"],  // lime-500
  [80, "#22c55e"],  // green-500
  [90, "#16a34a"],  // green-600
  [100, "#15803d"], // green-700
];

/**
 * Return a CSS color for a 0-100 percentage value.
 * Interpolates linearly between the two nearest stops.
 */
export function percentColor(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));

  for (let i = 0; i < SCALE.length - 1; i++) {
    const [lo, loColor] = SCALE[i];
    const [hi, hiColor] = SCALE[i + 1];
    if (clamped >= lo && clamped <= hi) {
      if (clamped === lo) return loColor;
      if (clamped === hi) return hiColor;
      const t = (clamped - lo) / (hi - lo);
      return lerpHex(loColor, hiColor, t);
    }
  }
  return SCALE[SCALE.length - 1][1];
}

/**
 * Return { bg, text } for a percentage pill.
 * Background uses the chromatic scale; text is white or black
 * based on relative luminance contrast (WCAG formula).
 */
export function percentPill(pct: number): { bg: string; text: string } {
  const bg = percentColor(pct);
  const r = parseInt(bg.slice(1, 3), 16);
  const g = parseInt(bg.slice(3, 5), 16);
  const b = parseInt(bg.slice(5, 7), 16);
  // Relative luminance (sRGB linearized, simplified)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return { bg, text: luminance > 0.55 ? "#000000" : "#ffffff" };
}

function lerpHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}
