import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { ArrowLeft, Trophy, Target, TrendingUp, Star } from 'lucide-react'
import { Avatar, type ScoreRow } from '../shared'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler)

export const Route = createFileRoute('/players/$playerId')({
  component: PlayerStats,
})

function PlayerStats() {
  const { playerId } = Route.useParams()
  const [scores, setScores] = useState<ScoreRow[] | null>(null)
  const [loading, setLoading] = useState(true)

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
        <div className="text-slate-400 animate-pulse text-lg">Loading player…</div>
      </div>
    )
  }

  const pid = parseInt(playerId)
  const all = scores ?? []
  const playerScores = all.filter(s => s.playerId === pid).sort((a, b) => a.gameDate.localeCompare(b.gameDate))

  if (playerScores.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🤷</div>
        <h1 className="text-3xl font-bold mb-3 text-white">No data for this player</h1>
        <Link to="/players" className="text-emerald-400 hover:text-emerald-300">← Back to players</Link>
      </div>
    )
  }

  const name = playerScores[0].playerName
  const totals = playerScores.map(s => s.total)
  const games = playerScores.length
  const avg = Math.round(totals.reduce((a, b) => a + b, 0) / games)
  const best = Math.max(...totals)
  const worst = Math.min(...totals)

  // Daily wins: compare against all players on each of the player's game dates
  let wins = 0
  for (const s of playerScores) {
    const dayScores = all.filter(x => x.gameDate === s.gameDate)
    const dayBest = Math.max(...dayScores.map(x => x.total))
    if (s.total === dayBest) {
      const winnerCount = dayScores.filter(x => x.total === dayBest).length
      wins += 1 / winnerCount
    }
  }
  wins = Math.round(wins * 10) / 10

  const lineData = {
    labels: playerScores.map(s => s.gameDate.slice(5)),
    datasets: [{
      label: 'Total',
      data: totals,
      borderColor: '#10b981',
      backgroundColor: '#10b98133',
      tension: 0.3,
      fill: true,
      pointRadius: 3,
    }],
  }
  const yMin = Math.max(0, Math.floor((worst - 25) / 50) * 50)
  const yMax = Math.min(1000, Math.ceil((best + 25) / 50) * 50)

  const cityAvg = (key: keyof ScoreRow) => {
    const vals = playerScores.map(r => r[key]).filter((v): v is number => typeof v === 'number')
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  }
  const cityData = {
    labels: ['City 1', 'City 2', 'City 3', 'City 4', 'City 5'],
    datasets: [{
      label: 'Avg score',
      data: [cityAvg('city1'), cityAvg('city2'), cityAvg('city3'), cityAvg('city4'), cityAvg('city5')],
      backgroundColor: '#3b82f6cc',
      borderRadius: 4,
    }],
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <Link to="/players" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm">
        <ArrowLeft className="w-4 h-4" /> All players
      </Link>

      {/* Header */}
      <div className="flex items-center gap-5">
        <Avatar name={name} size={80} />
        <div>
          <h1 className="text-3xl font-bold text-white">{name}</h1>
          <p className="text-slate-400 mt-1">{games} games played</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Target className="w-5 h-5" />} label="Avg Score" value={`${avg}/1000`} color="text-emerald-400" />
        <StatCard icon={<Star className="w-5 h-5" />} label="Best Score" value={`${best}`} color="text-amber-400" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Worst Score" value={`${worst}`} color="text-blue-400" />
        <StatCard icon={<Trophy className="w-5 h-5" />} label="Daily Wins" value={`${wins}`} color="text-violet-400" />
      </div>

      {/* Score trend */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Score History</h2>
        <Line
          data={lineData}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
              y: { min: yMin, max: yMax, ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
            },
          }}
        />
      </div>

      {/* City averages */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Average by City Round</h2>
        <Bar
          data={cityData}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
              y: { min: 0, max: 200, ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
            },
          }}
        />
      </div>

      {/* Game log */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Game Log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-right">City 1</th>
                <th className="px-6 py-3 text-right">City 2</th>
                <th className="px-6 py-3 text-right">City 3</th>
                <th className="px-6 py-3 text-right">City 4</th>
                <th className="px-6 py-3 text-right">City 5</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...playerScores].reverse().map(s => (
                <tr key={s.gameDate} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-3 text-slate-300">{s.gameDate}</td>
                  {[s.city1, s.city2, s.city3, s.city4, s.city5].map((c, ci) => (
                    <td key={ci} className="px-6 py-3 text-right text-slate-300">{c ?? '—'}</td>
                  ))}
                  <td className="px-6 py-3 text-right font-bold text-white">{s.total}<span className="text-slate-500 text-xs ml-1">/1000</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
      <div className={`${color} mb-2`}>{icon}</div>
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-lg font-bold text-white truncate">{value}</div>
    </div>
  )
}
