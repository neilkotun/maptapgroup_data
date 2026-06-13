import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import { Calendar } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler)

export const Route = createFileRoute('/')({
  component: Dashboard,
})

interface LeaderboardEntry {
  playerId: number
  playerName: string
  gamesPlayed: number
  avgScore: number
  maxScore: number
  minScore: number
  totalPoints: number
}

interface ScoreRow {
  gameDate: string
  playerName: string
  total: number
  city1: number | null
  city2: number | null
  city3: number | null
  city4: number | null
  city5: number | null
}

interface DailyWinner {
  game_date: string
  player_name: string
  total: number
}

interface StatsData {
  leaderboard: LeaderboardEntry[]
  recentByDate: ScoreRow[]
  dailyWinners: DailyWinner[]
  cityAverages: {
    playerName: string
    avgCity1: number | null
    avgCity2: number | null
    avgCity3: number | null
    avgCity4: number | null
    avgCity5: number | null
  }[]
}

const PLAYER_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
]

const MEDAL_ICONS = ['🥇', '🥈', '🥉']

function getRank(index: number) {
  return MEDAL_ICONS[index] ?? `#${index + 1}`
}

function Dashboard() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetchStats()
  }, [])

  async function fetchStats() {
    setLoading(true)
    try {
      const res = await fetch('/api/stats')
      if (res.ok) setStats(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const allDates = stats
    ? [...new Set(stats.recentByDate.map(s => s.gameDate))].sort((a, b) => b.localeCompare(a))
    : []

  const displayDate = selectedDate ?? allDates[0] ?? null

  const todayScores = displayDate
    ? stats?.recentByDate.filter(s => s.gameDate === displayDate).sort((a, b) => b.total - a.total)
    : []

  // Build line chart: score over time per player (last 10 days)
  const playerNames = stats?.leaderboard.map(l => l.playerName) ?? []
  const datesSorted = [...allDates].reverse().slice(-10)

  const lineData = {
    labels: datesSorted.map(d => d.slice(5)), // MM-DD
    datasets: playerNames.map((name, idx) => ({
      label: name,
      data: datesSorted.map(date => {
        const row = stats?.recentByDate.find(s => s.gameDate === date && s.playerName === name)
        return row?.total ?? null
      }),
      borderColor: PLAYER_COLORS[idx % PLAYER_COLORS.length],
      backgroundColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] + '33',
      tension: 0.3,
      spanGaps: true,
      pointRadius: 4,
    })),
  }

  // Tighten the y-axis: start just below the lowest plotted score
  const plottedTotals = lineData.datasets.flatMap(d => d.data).filter((v): v is number => v !== null)
  const trendYMin = plottedTotals.length
    ? Math.max(0, Math.floor((Math.min(...plottedTotals) - 25) / 50) * 50)
    : 0
  const trendYMax = plottedTotals.length
    ? Math.min(1000, Math.ceil((Math.max(...plottedTotals) + 25) / 50) * 50)
    : 1000

  // Doughnut chart: daily win distribution (ties split evenly)
  const winCounts: Record<string, number> = Object.fromEntries(playerNames.map(n => [n, 0]))
  for (const date of allDates) {
    const dayScores = stats?.recentByDate.filter(s => s.gameDate === date) ?? []
    if (dayScores.length === 0) continue
    const best = Math.max(...dayScores.map(s => s.total))
    const winners = dayScores.filter(s => s.total === best)
    for (const w of winners) {
      if (w.playerName in winCounts) winCounts[w.playerName] += 1 / winners.length
    }
  }
  const winsData = {
    labels: playerNames,
    datasets: [
      {
        data: playerNames.map(n => Math.round(winCounts[n] * 10) / 10),
        backgroundColor: playerNames.map((_, i) => PLAYER_COLORS[i % PLAYER_COLORS.length]),
        borderWidth: 0,
      },
    ],
  }

  // Grouped bar chart: average score per city round per player
  const cityBarData = {
    labels: ['City 1', 'City 2', 'City 3', 'City 4', 'City 5'],
    datasets: (stats?.cityAverages ?? []).map(row => ({
      label: row.playerName,
      data: [row.avgCity1, row.avgCity2, row.avgCity3, row.avgCity4, row.avgCity5].map(v => v !== null ? Number(v) : null),
      backgroundColor: PLAYER_COLORS[playerNames.indexOf(row.playerName) % PLAYER_COLORS.length] + 'cc',
      borderRadius: 4,
    })),
  }

  // Bar chart: average scores
  const avgBarData = {
    labels: stats?.leaderboard.map(l => l.playerName) ?? [],
    datasets: [
      {
        label: 'Average Score',
        data: stats?.leaderboard.map(l => l.avgScore) ?? [],
        backgroundColor: playerNames.map((_, i) => PLAYER_COLORS[i % PLAYER_COLORS.length] + 'cc'),
        borderRadius: 6,
      },
    ],
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 animate-pulse text-lg">Loading stats…</div>
      </div>
    )
  }

  if (!stats || stats.leaderboard.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🌍</div>
        <h1 className="text-3xl font-bold mb-3 text-white">No scores yet!</h1>
        <p className="text-slate-400">
          Scores will appear here once they're uploaded.
        </p>
      </div>
    )
  }

  const totalGames = allDates.length
  const totalEntries = stats.recentByDate.length

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">MapTap Leaderboard</h1>
        <p className="text-slate-400 mt-1">{totalGames} game days · {totalEntries} scores submitted</p>
      </div>

      {/* Daily scores */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-white">Daily Scores</h2>
          </div>
          <select
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={displayDate ?? ''}
            onChange={e => setSelectedDate(e.target.value)}
          >
            {allDates.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        {todayScores && todayScores.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="px-6 py-3 text-left">Rank</th>
                  <th className="px-6 py-3 text-left">Player</th>
                  <th className="px-6 py-3 text-right">City 1</th>
                  <th className="px-6 py-3 text-right">City 2</th>
                  <th className="px-6 py-3 text-right">City 3</th>
                  <th className="px-6 py-3 text-right">City 4</th>
                  <th className="px-6 py-3 text-right">City 5</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {todayScores.map((row, idx) => (
                  <tr key={row.playerName} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-3 text-lg">{getRank(idx)}</td>
                    <td className="px-6 py-3 font-medium text-white">{row.playerName}</td>
                    {[row.city1, row.city2, row.city3, row.city4, row.city5].map((c, ci) => (
                      <td key={ci} className="px-6 py-3 text-right">
                        {c !== null ? (
                          <span className={`font-medium ${c >= 180 ? 'text-emerald-400' : c >= 140 ? 'text-blue-400' : c >= 100 ? 'text-amber-400' : 'text-red-400'}`}>
                            {c}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-3 text-right">
                      <span className="font-bold text-white">{row.total}</span>
                      <span className="text-slate-500 text-xs ml-1">/1000</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-slate-500">No scores for this date</div>
        )}
      </div>

      {/* Leaderboard table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Overall Rankings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="px-6 py-3 text-left">Rank</th>
                <th className="px-6 py-3 text-left">Player</th>
                <th className="px-6 py-3 text-right">Games</th>
                <th className="px-6 py-3 text-right">Avg Score</th>
                <th className="px-6 py-3 text-right">Best</th>
                <th className="px-6 py-3 text-right">Worst</th>
                <th className="px-6 py-3 text-right">Total Pts</th>
              </tr>
            </thead>
            <tbody>
              {stats.leaderboard.map((entry, idx) => (
                <tr
                  key={entry.playerId}
                  className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-6 py-4 text-xl">{getRank(idx)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
                      />
                      <span className="font-medium text-white">{entry.playerName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-300">{entry.gamesPlayed ?? 0}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-bold text-emerald-400">{entry.avgScore ?? '—'}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-300">{entry.maxScore ?? '—'}</td>
                  <td className="px-6 py-4 text-right text-slate-300">{entry.minScore ?? '—'}</td>
                  <td className="px-6 py-4 text-right text-slate-300">{entry.totalPoints ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score trends — full width */}
      {mounted && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Score Trends (last 10 days)</h2>
          <Line
            data={lineData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12 } },
              },
              scales: {
                x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
                y: { min: trendYMin, max: trendYMax, ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
              },
            }}
          />
        </div>
      )}

      {/* Charts */}
      {mounted && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Average Score Comparison</h2>
            <Bar
              data={avgBarData}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
                  y: { min: 0, max: 1000, ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
                },
              }}
            />
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Daily Win Distribution</h2>
            <div className="max-w-xs mx-auto">
              <Doughnut
                data={winsData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'right', labels: { color: '#94a3b8', boxWidth: 12 } },
                    tooltip: {
                      callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.parsed} win${ctx.parsed !== 1 ? 's' : ''}`,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4">Avg Score by City Round</h2>
            <Bar
              data={cityBarData}
              options={{
                responsive: true,
                plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12 } } },
                scales: {
                  x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
                  y: { min: 0, max: 200, ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* City performance */}
      {stats.cityAverages.length > 0 && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white">City Performance Averages</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="px-6 py-3 text-left">Player</th>
                  {['City 1', 'City 2', 'City 3', 'City 4', 'City 5'].map(c => (
                    <th key={c} className="px-6 py-3 text-right">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.cityAverages.map(row => (
                  <tr key={row.playerName} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-3 font-medium text-white">{row.playerName}</td>
                    {[row.avgCity1, row.avgCity2, row.avgCity3, row.avgCity4, row.avgCity5].map((v, i) => (
                      <td key={i} className="px-6 py-3 text-right">
                        {v !== null ? (
                          <span className={`font-medium ${Number(v) >= 160 ? 'text-emerald-400' : Number(v) >= 120 ? 'text-blue-400' : Number(v) >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                            {v}
                          </span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Win history */}
      {stats.dailyWinners.length > 0 && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white">Recent Daily Winners</h2>
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
                {stats.dailyWinners.map((w: DailyWinner) => (
                  <tr key={w.game_date} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-3 text-slate-300">{w.game_date}</td>
                    <td className="px-6 py-3 font-medium text-amber-400">🏆 {w.player_name}</td>
                    <td className="px-6 py-3 text-right font-bold text-white">{w.total}<span className="text-slate-500 text-xs ml-1">/1000</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
