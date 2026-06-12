import { pgTable, serial, text, timestamp, integer, date, unique } from "drizzle-orm/pg-core";

export const players = pgTable("players", {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyScores = pgTable("daily_scores", {
  id: serial().primaryKey(),
  playerId: integer("player_id").notNull().references(() => players.id),
  gameDate: date("game_date").notNull(),
  city1: integer("city1"),
  city2: integer("city2"),
  city3: integer("city3"),
  city4: integer("city4"),
  city5: integer("city5"),
  total: integer("total").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  unique().on(t.playerId, t.gameDate),
]);
