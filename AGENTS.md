# AGENTS.md — MapTap Leaderboard

## Project Overview

Full-stack dashboard for tracking daily MapTap geography game scores from a group chat. Built with TanStack Start (React SSR), Netlify Database (Postgres), and Tailwind CSS.

## Architecture

```
/
├── db/
│   ├── schema.ts          # Drizzle ORM table definitions (source of truth for DB schema)
│   └── index.ts           # Drizzle client initialized with @netlify/database adapter
├── drizzle.config.ts      # Drizzle Kit config — migrations output to netlify/database/migrations/
├── netlify/database/
│   └── migrations/        # Auto-generated SQL migrations (applied automatically by Netlify)
└── src/
    └── routes/
        ├── __root.tsx     # Root layout with nav bar
        ├── index.tsx      # Main dashboard (leaderboard, charts, daily scores)
        ├── submit.tsx     # Score submission (paste chat or manual entry)
        └── api/
            ├── players.ts # GET/POST players
            ├── scores.ts  # GET/POST/DELETE daily scores
            ├── stats.ts   # GET aggregated stats for the dashboard
            └── parse.ts   # POST to parse raw chat text into structured scores
```

## Key Design Decisions

### No RCS scraping
RCS group chats can't be scraped server-side — they live on users' phones. Instead, users paste chat text into a textarea and a server route (`/api/parse`) parses it into structured score objects using a regex state machine. Users can review/edit before confirming.

### Chat parser (`src/routes/api/parse.ts`)
The parser supports three formats (see README). It uses a line-by-line state machine: detect a player name line, then look ahead for city scores (individual lines, slash-separated, or just a total). All parsing is in `parseChatText()`.

### Upsert semantics
Score submission (`POST /api/scores`) upserts on `(player_id, game_date)`. Submitting scores for the same player+date again overwrites them. Players are also upserted by name — a new player row is created automatically on first score submission.

### Database schema
Two tables:
- `players` — id, name (unique), created_at
- `daily_scores` — id, player_id (FK), game_date (date), city1–city5 (nullable int), total (int), created_at; unique on (player_id, game_date)

### API routes
All API routes use TanStack Start's `server.handlers` pattern (not Netlify Functions). Files in `src/routes/api/` are server-only routes.

### Stats endpoint
`GET /api/stats` returns everything the dashboard needs in one request: leaderboard with aggregates, all recent scores for the line chart, daily winners via raw SQL `DISTINCT ON`, and city averages.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start (React 19) |
| Routing | TanStack Router v1 (file-based) |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Database | Netlify Database (Postgres) via `@netlify/database` |
| ORM | Drizzle ORM `@beta` + Drizzle Kit `@beta` |
| Charts | Chart.js + react-chartjs-2 |
| Deployment | Netlify |

## Coding Conventions

- TypeScript strict mode throughout
- All imports from `db/` use `.js` extension (ESM bundler mode)
- Tailwind CSS v4 (no config file — uses `@import "tailwindcss"` in `styles.css`)
- Route files in `src/routes/` are auto-discovered by TanStack Router's Vite plugin
- Never modify migration files once generated — regenerate via `netlify db migrations reset` + `npx drizzle-kit generate`
- Always install drizzle with `@beta` tag: `drizzle-orm@beta`, `drizzle-kit@beta`

## Development Commands

```bash
npm install
netlify dev    # Starts app + database emulation on port 8888
```
