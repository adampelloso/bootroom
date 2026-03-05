import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

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

// ── Sports data tables ─────────────────────────────────────────────

export const fixture = sqliteTable("fixture", {
  id: integer("id").primaryKey(),
  leagueId: integer("league_id").notNull(),
  season: integer("season").notNull(),
  round: text("round"),
  date: text("date").notNull(),
  kickoffUtc: text("kickoff_utc").notNull(),
  status: text("status").notNull(),
  homeTeamId: integer("home_team_id").notNull(),
  homeTeamName: text("home_team_name").notNull(),
  awayTeamId: integer("away_team_id").notNull(),
  awayTeamName: text("away_team_name").notNull(),
  homeGoals: integer("home_goals"),
  awayGoals: integer("away_goals"),
  htHomeGoals: integer("ht_home_goals"),
  htAwayGoals: integer("ht_away_goals"),
  venueName: text("venue_name"),
  referee: text("referee"),
  updatedAt: integer("updated_at").notNull(),
}, (t) => [
  index("idx_fixture_league_date").on(t.leagueId, t.date),
  index("idx_fixture_date").on(t.date),
  index("idx_fixture_home_team").on(t.homeTeamId),
  index("idx_fixture_away_team").on(t.awayTeamId),
]);

export const team = sqliteTable("team", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  logo: text("logo"),
});

export const fixtureOdds = sqliteTable("fixture_odds", {
  fixtureId: integer("fixture_id").primaryKey(),
  homeProb: real("home_prob").notNull(),
  drawProb: real("draw_prob").notNull(),
  awayProb: real("away_prob").notNull(),
  over25Prob: real("over25_prob"),
  under25Prob: real("under25_prob"),
  bttsProb: real("btts_prob"),
  updatedAt: integer("updated_at").notNull(),
});

export const h2h = sqliteTable("h2h", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamAId: integer("team_a_id").notNull(),
  teamBId: integer("team_b_id").notNull(),
  fixtureId: integer("fixture_id").notNull(),
}, (t) => [
  index("idx_h2h_pair").on(t.teamAId, t.teamBId),
]);

export const injury = sqliteTable("injury", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerId: integer("player_id").notNull(),
  playerName: text("player_name").notNull(),
  teamId: integer("team_id").notNull(),
  leagueId: integer("league_id").notNull(),
  type: text("type").notNull(),        // "Missing Fixture", "Questionable", "Doubtful"
  reason: text("reason"),               // "Knee Injury", "Muscle Injury", etc.
  fixtureId: integer("fixture_id"),     // specific fixture if available
  updatedAt: integer("updated_at").notNull(),
}, (t) => [
  index("idx_injury_team").on(t.teamId),
  index("idx_injury_player").on(t.playerId),
]);

export const fixtureLineup = sqliteTable("fixture_lineup", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fixtureId: integer("fixture_id").notNull(),
  teamId: integer("team_id").notNull(),
  playerId: integer("player_id").notNull(),
  playerName: text("player_name").notNull(),
  position: text("position"),              // G, D, M, F
  started: integer("started").notNull(),   // 1 = starter, 0 = sub
  minutes: integer("minutes"),
}, (t) => [
  index("idx_lineup_team").on(t.teamId),
  index("idx_lineup_fixture").on(t.fixtureId),
  uniqueIndex("idx_lineup_unique").on(t.fixtureId, t.playerId),
]);

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
