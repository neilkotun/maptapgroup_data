// Shared types, constants, and helpers used across dashboard pages.

export interface ScoreRow {
  id: number
  playerId: number
  playerName: string
  gameDate: string
  city1: number | null
  city2: number | null
  city3: number | null
  city4: number | null
  city5: number | null
  total: number
}

export const PERIOD_LENGTH = 10

export const PLAYER_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
]

const MEDAL_ICONS = ['🥇', '🥈', '🥉']

export function getRank(index: number) {
  return MEDAL_ICONS[index] ?? `#${index + 1}`
}

// Deterministic color per player name (stable regardless of sort order).
export function colorForPlayer(name: string, allNames: string[]) {
  const idx = allNames.indexOf(name)
  return PLAYER_COLORS[(idx < 0 ? 0 : idx) % PLAYER_COLORS.length]
}

// DiceBear generated avatar, seeded by the player's name so it stays consistent.
export function avatarUrl(name: string) {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(name)}&backgroundColor=transparent`
}

export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  return (
    <img
      src={avatarUrl(name)}
      alt={name}
      width={size}
      height={size}
      className="rounded-full bg-slate-800 border border-slate-700 shrink-0"
      style={{ width: size, height: size }}
    />
  )
}

export interface PeriodStanding {
  playerId: number
  playerName: string
  wins: number
  gamesPlayed: number
  avgScore: number
}

export interface Period {
  index: number
  startDate: string
  endDate: string
  dates: string[]
  standings: PeriodStanding[]
  champions: string[]
  winnersByDate: { date: string; winners: string[]; total: number }[]
}

// Split all game days into 10-day periods. Returns newest period first.
export function buildPeriods(scores: ScoreRow[]): Period[] {
  const allDates = [...new Set(scores.map(s => s.gameDate))].sort()
  const periods: Period[] = []

  for (let p = 0; p * PERIOD_LENGTH < allDates.length; p++) {
    const dates = allDates.slice(p * PERIOD_LENGTH, (p + 1) * PERIOD_LENGTH)
    const periodScores = scores.filter(s => dates.includes(s.gameDate))

    const winCounts: Record<string, number> = {}
    const winnersByDate: Period['winnersByDate'] = []

    for (const date of dates) {
      const dayScores = periodScores.filter(s => s.gameDate === date)
      if (dayScores.length === 0) continue
      const best = Math.max(...dayScores.map(s => s.total))
      const winners = dayScores.filter(s => s.total === best).map(s => s.playerName)
      winnersByDate.push({ date, winners, total: best })
      for (const w of winners) {
        winCounts[w] = (winCounts[w] ?? 0) + 1 / winners.length
      }
    }

    // Include every player who played in the period, even with 0 wins.
    const byPlayer: Record<string, ScoreRow[]> = {}
    for (const s of periodScores) {
      ;(byPlayer[s.playerName] ??= []).push(s)
    }

    const standings: PeriodStanding[] = Object.entries(byPlayer)
      .map(([playerName, rows]) => ({
        playerId: rows[0].playerId,
        playerName,
        wins: Math.round((winCounts[playerName] ?? 0) * 10) / 10,
        gamesPlayed: rows.length,
        avgScore: Math.round(rows.reduce((a, b) => a + b.total, 0) / rows.length),
      }))
      .sort((a, b) => b.wins - a.wins || b.avgScore - a.avgScore)

    const topWins = standings[0]?.wins ?? 0
    const champions = standings.filter(s => s.wins === topWins && topWins > 0).map(s => s.playerName)

    periods.push({
      index: p,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      dates,
      standings,
      champions,
      winnersByDate,
    })
  }

  return periods.reverse() // newest period first
}
