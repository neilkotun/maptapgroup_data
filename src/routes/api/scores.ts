import { createFileRoute } from '@tanstack/react-router'
import { db } from '../../../db/index.js'
import { players, dailyScores } from '../../../db/schema.js'
import { eq, desc, and } from 'drizzle-orm'

export const Route = createFileRoute('/api/scores')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const playerId = url.searchParams.get('playerId')
        const date = url.searchParams.get('date')
        const limit = parseInt(url.searchParams.get('limit') || '100')

        let query = db
          .select({
            id: dailyScores.id,
            playerId: dailyScores.playerId,
            playerName: players.name,
            gameDate: dailyScores.gameDate,
            city1: dailyScores.city1,
            city2: dailyScores.city2,
            city3: dailyScores.city3,
            city4: dailyScores.city4,
            city5: dailyScores.city5,
            total: dailyScores.total,
            createdAt: dailyScores.createdAt,
          })
          .from(dailyScores)
          .innerJoin(players, eq(dailyScores.playerId, players.id))
          .$dynamic()

        const conditions = []
        if (playerId) conditions.push(eq(dailyScores.playerId, parseInt(playerId)))
        if (date) conditions.push(eq(dailyScores.gameDate, date))

        if (conditions.length > 0) {
          query = query.where(and(...conditions))
        }

        const rows = await query
          .orderBy(desc(dailyScores.gameDate), desc(dailyScores.total))
          .limit(limit)

        return Response.json(rows)
      },

      POST: async ({ request }) => {
        const body = await request.json()
        const { playerName, gameDate, city1, city2, city3, city4, city5, total } = body

        if (!playerName?.trim() || !gameDate || total === undefined) {
          return Response.json({ error: 'playerName, gameDate, and total are required' }, { status: 400 })
        }

        // Upsert player
        let [player] = await db
          .select()
          .from(players)
          .where(eq(players.name, playerName.trim()))
          .limit(1)

        if (!player) {
          ;[player] = await db
            .insert(players)
            .values({ name: playerName.trim() })
            .returning()
        }

        const [score] = await db
          .insert(dailyScores)
          .values({
            playerId: player.id,
            gameDate,
            city1: city1 ?? null,
            city2: city2 ?? null,
            city3: city3 ?? null,
            city4: city4 ?? null,
            city5: city5 ?? null,
            total,
          })
          .onConflictDoUpdate({
            target: [dailyScores.playerId, dailyScores.gameDate],
            set: { city1, city2, city3, city4, city5, total },
          })
          .returning()

        return Response.json(score, { status: 201 })
      },

      DELETE: async ({ request }) => {
        const url = new URL(request.url)
        const scoreId = url.searchParams.get('id')
        if (!scoreId) {
          return Response.json({ error: 'Score id required' }, { status: 400 })
        }
        await db.delete(dailyScores).where(eq(dailyScores.id, parseInt(scoreId)))
        return new Response(null, { status: 204 })
      },
    },
  },
})
