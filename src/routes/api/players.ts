import { createFileRoute } from '@tanstack/react-router'
import { db } from '../../../db/index.js'
import { players, dailyScores } from '../../../db/schema.js'
import { eq, desc, sql } from 'drizzle-orm'

export const Route = createFileRoute('/api/players')({
  server: {
    handlers: {
      GET: async () => {
        const rows = await db
          .select({
            id: players.id,
            name: players.name,
            createdAt: players.createdAt,
            gamesPlayed: sql<number>`count(${dailyScores.id})`.as('games_played'),
            avgTotal: sql<number>`round(avg(${dailyScores.total}), 1)`.as('avg_total'),
            maxTotal: sql<number>`max(${dailyScores.total})`.as('max_total'),
            totalSum: sql<number>`sum(${dailyScores.total})`.as('total_sum'),
          })
          .from(players)
          .leftJoin(dailyScores, eq(players.id, dailyScores.playerId))
          .groupBy(players.id, players.name, players.createdAt)
          .orderBy(desc(sql`avg(${dailyScores.total})`))
        return Response.json(rows)
      },

      POST: async ({ request }) => {
        const { name } = await request.json()
        if (!name?.trim()) {
          return Response.json({ error: 'Name is required' }, { status: 400 })
        }
        const [player] = await db
          .insert(players)
          .values({ name: name.trim() })
          .onConflictDoNothing()
          .returning()
        if (!player) {
          return Response.json({ error: 'Player already exists' }, { status: 409 })
        }
        return Response.json(player, { status: 201 })
      },
    },
  },
})
