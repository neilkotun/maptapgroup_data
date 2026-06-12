CREATE TABLE "daily_scores" (
	"id" serial PRIMARY KEY,
	"player_id" integer NOT NULL,
	"game_date" date NOT NULL,
	"city1" integer,
	"city2" integer,
	"city3" integer,
	"city4" integer,
	"city5" integer,
	"total" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "daily_scores_player_id_game_date_unique" UNIQUE("player_id","game_date")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "daily_scores" ADD CONSTRAINT "daily_scores_player_id_players_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id");