"use client";

import { useEffect, useState } from "react";
import type { OddsFormat } from "@/lib/modeling/odds-display";

const DEFAULT_FORMAT: OddsFormat = "decimal";

function parseOddsFormat(value: string | null): OddsFormat {
  if (value === "american" || value === "fractional" || value === "decimal") return value;
  return DEFAULT_FORMAT;
}

export function useOddsFormat(): OddsFormat {
  const [format, setFormat] = useState<OddsFormat>(DEFAULT_FORMAT);

  useEffect(() => {
    setFormat(parseOddsFormat(localStorage.getItem("oddsFormat")));
    const onLocalChange = () => setFormat(parseOddsFormat(localStorage.getItem("oddsFormat")));
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "oddsFormat") return;
      setFormat(parseOddsFormat(e.newValue));
    };
    window.addEventListener("oddsFormatChanged", onLocalChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("oddsFormatChanged", onLocalChange);
    };
  }, []);

  return format;
}
