import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ── Better Auth tables ──────────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified").notNull().default(0),
  image: text("image"),
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt"),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt").notNull(),
  createdAt: integer("createdAt"),
  updatedAt: integer("updatedAt"),
});

// ── Stripe subscription ─────────────────────────────────────────────

export const subscription = sqliteTable("subscription", {
  id: text("id").primaryKey(),
  userId: text("user_id").unique().notNull(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull(),
  status: text("status", {
    enum: ["none", "trialing", "active", "past_due", "canceled"],
  }).notNull().default("none"),
  priceId: text("price_id"),
  currentPeriodEnd: integer("current_period_end"),
  cancelAtPeriodEnd: integer("cancel_at_period_end").default(0),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
});
