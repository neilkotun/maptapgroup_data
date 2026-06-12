import { createFileRoute } from '@tanstack/react-router'
import { db } from '../../../db/index.js'
import { players, dailyScores } from '../../../db/schema.js'
import { eq, desc, sql, max, min, count } from 'drizzle-orm'

export const Route = createFileRoute('/api/stats')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const playerId = url.searchParams.get('playerId')

        // Overall leaderboard
        const leaderboard = await db
          .select({
            playerId: players.id,
            playerName: players.name,
            gamesPlayed: count(dailyScores.id).as('games_played'),
            avgScore: sql<number>`round(avg(${dailyScores.total}), 1)`.as('avg_score'),
            maxScore: max(dailyScores.total).as('max_score'),
            minScore: min(dailyScores.total).as('min_score'),
            totalPoints: sql<number>`sum(${dailyScores.total})`.as('total_points'),
          })
          .from(players)
          .leftJoin(dailyScores, eq(players.id, dailyScores.playerId))
          .groupBy(players.id, players.name)
          .orderBy(desc(sql`avg(${dailyScores.total})`))

        // Recent scores by date (last 30 days)
        const recentByDate = await db
          .select({
            gameDate: dailyScores.gameDate,
            playerName: players.name,
            total: dailyScores.total,
            city1: dailyScores.city1,
            city2: dailyScores.city2,
            city3: dailyScores.city3,
            city4: dailyScores.city4,
            city5: dailyScores.city5,
          })
          .from(dailyScores)
          .innerJoin(players, eq(dailyScores.playerId, players.id))
          .orderBy(desc(dailyScores.gameDate), desc(dailyScores.total))
          .limit(200)

        // Daily winners
        const dailyWinners = await db.execute(sql`
          SELECT DISTINCT ON (ds.game_date)
            ds.game_date,
            p.name as player_name,
            ds.total
          FROM daily_scores ds
          JOIN players p ON ds.player_id = p.id
          ORDER BY ds.game_date DESC, ds.total DESC
          LIMIT 30
        `)

        // City averages per player (optional per player filter)
        let cityQuery = db
          .select({
            playerName: players.name,
            avgCity1: sql<number>`round(avg(${dailyScores.city1}), 1)`.as('avg_city1'),
            avgCity2: sql<number>`round(avg(${dailyScores.city2}), 1)`.as('avg_city2'),
            avgCity3: sql<number>`round(avg(${dailyScores.city3}), 1)`.as('avg_city3'),
            avgCity4: sql<number>`round(avg(${dailyScores.city4}), 1)`.as('avg_city4'),
            avgCity5: sql<number>`round(avg(${dailyScores.city5}), 1)`.as('avg_city5'),
          })
          .from(dailyScores)
          .innerJoin(players, eq(dailyScores.playerId, players.id))
          .$dynamic()

        if (playerId) {
          cityQuery = cityQuery.where(eq(players.id, parseInt(playerId)))
        }

        const cityAverages = await cityQuery.groupBy(players.name)

        return Response.json({ leaderboard, recentByDate, dailyWinners: dailyWinners.rows, cityAverages })
      },
    },
  },
})
