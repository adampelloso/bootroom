const RESERVED_SLUGS = new Set([
  "today", "matches", "match", "leagues", "league", "tools", "account", "profile",
  "ref", "api", "login", "logout", "signup", "register", "subscribe", "subscription",
  "admin", "support", "help", "terms", "privacy", "pricing", "about", "contact",
  "bootroom", "verify", "confirm", "reset", "password", "invite",
]);

export type ReferralSlugValidationResult =
  | { ok: true; slug: string | null }
  | { ok: false; message: string };

export function normalizeReferralSlug(input: string): string {
  return input.trim().toLowerCase();
}

export function validateReferralSlug(input: string): ReferralSlugValidationResult {
  const normalized = normalizeReferralSlug(input);
  if (!normalized) return { ok: true, slug: null };
  if (normalized.length < 3 || normalized.length > 20) {
    return { ok: false, message: "URL must be 3-20 characters" };
  }
  if (!/^[a-z0-9-]+$/.test(normalized)) {
    return { ok: false, message: "Use only letters, numbers, and hyphens" };
  }
  if (normalized.startsWith("-") || normalized.endsWith("-")) {
    return { ok: false, message: "URL cannot start or end with a hyphen" };
  }
  if (normalized.includes("--")) {
    return { ok: false, message: "URL cannot include consecutive hyphens" };
  }
  if (RESERVED_SLUGS.has(normalized)) {
    return { ok: false, message: "This URL is not available" };
  }
  return { ok: true, slug: normalized };
}
