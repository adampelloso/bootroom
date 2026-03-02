import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Read an environment variable. Works in both Cloudflare Workers
 * (via worker bindings) and local dev (via process.env).
 */
export function getEnvVar(name: string): string | undefined {
  try {
    const { env } = getCloudflareContext();
    return (env as Record<string, string>)[name];
  } catch {
    return process.env[name];
  }
}
