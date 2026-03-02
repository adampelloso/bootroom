import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db-schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,       // refresh session every 24h
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 min cache to avoid DB lookup every request
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
