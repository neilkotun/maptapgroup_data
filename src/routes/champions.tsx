import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Trophy } from 'lucide-react'

export const Route = createFileRoute('/champions')({
  component: Champions,
})

interface ScoreRow {
  id: number
  playerId: number
  playerName: string
  gameDate: string
  total: number
}

interface PeriodStanding {
  playerName: string
  wins: number
}

interface Period {
  index: number
  startDate: string
  endDate: string
  dates: string[]
  standings: PeriodStanding[]
  champions: string[]
  winnersByDate: { date: string; winners: string[]; total: number }[]
}

const PERIOD_LENGTH = 10

function buildPeriods(scores: ScoreRow[]): Period[] {
  const allDates = [...new Set(scores.map(s => s.gameDate))].sort()
  const periods: Period[] = []

  for (let p = 0; p * PERIOD_LENGTH < allDates.length; p++) {
    const dates = allDates.slice(p * PERIOD_LENGTH, (p + 1) * PERIOD_LENGTH)
    const winCounts: Record<string, number> = {}
    const winnersByDate: Period['winnersByDate'] = []

    for (const date of dates) {
      const dayScores = scores.filter(s => s.gameDate === date)
      if (dayScores.length === 0) continue
      const best = Math.max(...dayScores.map(s => s.total))
      const winners = dayScores.filter(s => s.total === best).map(s => s.playerName)
      winnersByDate.push({ date, winners, total: best })
      for (const w of winners) {
        winCounts[w] = (winCounts[w] ?? 0) + 1 / winners.length
      }
    }

    const standings = Object.entries(winCounts)
      .map(([playerName, wins]) => ({ playerName, wins: Math.round(wins * 10) / 10 }))
      .sort((a, b) => b.wins - a.wins)

    const topWins = standings[0]?.wins ?? 0
    const champions = standings.filter(s => s.wins === topWins).map(s => s.playerName)

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

function Champions() {
  const [scores, setScores] = useState<ScoreRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(0)

  useEffect(() => {
    fetch('/api/scores?limit=10000')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))))
      .then(setScores)
      .catch(() => setScores([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 animate-pulse text-lg">Loading champions…</div>
      </div>
    )
  }

  const periods = scores ? buildPeriods(scores) : []

  if (periods.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-bold mb-3 text-white">No champions yet!</h1>
        <p className="text-slate-400">Champions will appear here once games have been played.</p>
      </div>
    )
  }

  const period = periods[Math.min(selectedPeriod, periods.length - 1)]
  const isCurrentPeriod = selectedPeriod === 0 && period.dates.length < PERIOD_LENGTH

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">10-Day Champions</h1>
        <p className="text-slate-400 mt-1">
          Every {PERIOD_LENGTH} game days, the player with the most daily wins is crowned champion.
        </p>
      </div>

      {/* Period tabs */}
      <div className="flex flex-wrap gap-2">
        {periods.map((p, i) => (
          <button
            key={p.index}
            onClick={() => setSelectedPeriod(i)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              i === selectedPeriod
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
            }`}
          >
            {p.startDate.slice(5)} → {p.endDate.slice(5)}
          </button>
        ))}
      </div>

      {/* Champion banner */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center">
        <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
          {isCurrentPeriod
            ? `Current Leader (${period.dates.length}/${PERIOD_LENGTH} days played)`
            : `Champion · ${period.startDate} → ${period.endDate}`}
        </div>
        <div className="text-3xl font-bold text-amber-400">
          {period.champions.join(' & ')}
        </div>
        <div className="text-slate-400 mt-2 text-sm">
          {period.standings[0]?.wins ?? 0} daily win{(period.standings[0]?.wins ?? 0) !== 1 ? 's' : ''}
          {period.champions.length > 1 ? ' each (tie)' : ''}
        </div>
      </div>

      {/* Standings */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Period Standings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="px-6 py-3 text-left">Rank</th>
                <th className="px-6 py-3 text-left">Player</th>
                <th className="px-6 py-3 text-right">Daily Wins</th>
              </tr>
            </thead>
            <tbody>
              {period.standings.map((s, idx) => (
                <tr key={s.playerName} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-3 text-lg">{['🥇', '🥈', '🥉'][idx] ?? `#${idx + 1}`}</td>
                  <td className="px-6 py-3 font-medium text-white">{s.playerName}</td>
                  <td className="px-6 py-3 text-right font-bold text-emerald-400">{s.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily winners within period */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Daily Winners This Period</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Winner</th>
                <th className="px-6 py-3 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {[...period.winnersByDate].reverse().map(w => (
                <tr key={w.date} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-3 text-slate-300">{w.date}</td>
                  <td className="px-6 py-3 font-medium text-amber-400">🏆 {w.winners.join(' & ')}</td>
                  <td className="px-6 py-3 text-right font-bold text-white">{w.total}<span className="text-slate-500 text-xs ml-1">/1000</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
