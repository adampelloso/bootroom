import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Read an environment variable. Works in both Cloudflare Workers
 * (via worker bindings) and local dev (via process.env).
 */
export function getEnvVar(name: string): string | undefined {
  try {
    const { env } = getCloudflareContext();
    const val = (env as Record<string, string>)[name];
    if (val !== undefined) return val;
  } catch {
    // getCloudflareContext() not available — fall through to process.env
  }
  return process.env[name];
}
