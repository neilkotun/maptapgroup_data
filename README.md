# MapTap Leaderboard

A web dashboard for tracking and visualizing daily [MapTap](https://maptap.app) geography game scores from a group chat.

## What it does

- **Paste chat text** from your RCS/SMS group chat and automatically parse out each player's scores
- **Manual score entry** for adding individual scores
- **Live leaderboard** with rankings by average score, best score, games played, and total points
- **Daily results** — browse scores by date, with per-city breakdowns
- **Charts** — score trends over time and average comparison bar chart
- **City performance table** — see which cities each player struggles with most

## Key technologies

- [TanStack Start](https://tanstack.com/start) — full-stack React framework with file-based routing
- [Netlify Database](https://docs.netlify.com/database/overview/) — managed Postgres via `@netlify/database`
- [Drizzle ORM](https://orm.drizzle.team/) — type-safe SQL query builder
- [Chart.js](https://www.chartjs.org/) + [react-chartjs-2](https://react-chartjs-2.js.org/) — charts
- [Tailwind CSS v4](https://tailwindcss.com/) — utility-first styling

## Running locally

```bash
npm install
netlify dev
```

The app will be available at `http://localhost:8888`. The Netlify CLI handles local database emulation automatically.

## Score format parsing

When pasting group chat text, the parser supports three formats:

**Format A** — Full city breakdown:
```
Alice
MapTap 2024-01-15
City 1: 85
City 2: 92
City 3: 78
City 4: 95
City 5: 88
Total: 438
```

**Format B** — Slash-separated cities:
```
Bob:
85 / 72 / 90 / 65 / 80
Total: 392
```

**Format C** — Total only:
```
Alice: 438
Bob: 392
```
