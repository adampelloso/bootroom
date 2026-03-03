import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/lib/db";
import { getEnvVar } from "@/lib/env";
import * as schema from "@/lib/db-schema";

function createAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), { provider: "sqlite", schema }),
    baseURL: getEnvVar("BETTER_AUTH_URL"),
    secret: getEnvVar("BETTER_AUTH_SECRET"),
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    advanced: {
      cookiePrefix: "bootroom",
      defaultCookieAttributes: {
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      google: {
        clientId: getEnvVar("GOOGLE_CLIENT_ID")!,
        clientSecret: getEnvVar("GOOGLE_CLIENT_SECRET")!,
      },
    },
  });
}

type AuthInstance = ReturnType<typeof createAuth>;
let _auth: AuthInstance | undefined;

export function getAuth(): AuthInstance {
  if (!_auth) _auth = createAuth();
  return _auth;
}
