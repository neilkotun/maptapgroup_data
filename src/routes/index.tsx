import { createFileRoute, Link } from '@tanstack/react-router'
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
import {
  buildPeriods,
  getRank,
  PERIOD_LENGTH,
  colorForPlayer,
  type ScoreRow,
} from '../shared'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler)

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const [scores, setScores] = useState<ScoreRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch('/api/scores?limit=10000')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))))
      .then(setScores)
      .catch(() => setScores([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 animate-pulse text-lg">Loading stats…</div>
      </div>
    )
  }

  const periods = scores ? buildPeriods(scores) : []
  const period = periods[0]

  if (!period) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🌍</div>
        <h1 className="text-3xl font-bold mb-3 text-white">No scores yet!</h1>
        <p className="text-slate-400">Scores will appear here once they're uploaded.</p>
      </div>
    )
  }

  // Everything below is scoped to the current 10-day period.
  const periodScores = (scores ?? []).filter(s => period.dates.includes(s.gameDate))
  const standings = period.standings
  const orderedNames = standings.map(s => s.playerName) // ranked order
  const periodDatesDesc = [...period.dates].sort((a, b) => b.localeCompare(a))
  const periodDatesAsc = [...period.dates].sort()

  const displayDate = selectedDate && period.dates.includes(selectedDate)
    ? selectedDate
    : periodDatesDesc[0] ?? null

  const dayScores = displayDate
    ? periodScores.filter(s => s.gameDate === displayDate).sort((a, b) => b.total - a.total)
    : []

  // Score trends across the period
  const lineData = {
    labels: periodDatesAsc.map(d => d.slice(5)),
    datasets: orderedNames.map(name => ({
      label: name,
      data: periodDatesAsc.map(date => {
        const row = periodScores.find(s => s.gameDate === date && s.playerName === name)
        return row?.total ?? null
      }),
      borderColor: colorForPlayer(name, orderedNames),
      backgroundColor: colorForPlayer(name, orderedNames) + '33',
      tension: 0.3,
      spanGaps: true,
      pointRadius: 4,
    })),
  }
  const plotted = lineData.datasets.flatMap(d => d.data).filter((v): v is number => v !== null)
  const trendYMin = plotted.length ? Math.max(0, Math.floor((Math.min(...plotted) - 25) / 50) * 50) : 0
  const trendYMax = plotted.length ? Math.min(1000, Math.ceil((Math.max(...plotted) + 25) / 50) * 50) : 1000

  // Win distribution doughnut
  const winsData = {
    labels: orderedNames,
    datasets: [{
      data: standings.map(s => s.wins),
      backgroundColor: orderedNames.map(n => colorForPlayer(n, orderedNames)),
      borderWidth: 0,
    }],
  }

  // Avg score per city round per player, for the period
  const cityBarData = {
    labels: ['City 1', 'City 2', 'City 3', 'City 4', 'City 5'],
    datasets: orderedNames.map(name => {
      const rows = periodScores.filter(s => s.playerName === name)
      const cityAvg = (key: keyof ScoreRow) => {
        const vals = rows.map(r => r[key]).filter((v): v is number => typeof v === 'number')
        return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
      }
      return {
        label: name,
        data: [cityAvg('city1'), cityAvg('city2'), cityAvg('city3'), cityAvg('city4'), cityAvg('city5')],
        backgroundColor: colorForPlayer(name, orderedNames) + 'cc',
        borderRadius: 4,
      }
    }),
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">MapTap Leaderboard</h1>
        <p className="text-slate-400 mt-1">
          Current 10-day period · {period.startDate} → {period.endDate} · {period.dates.length}/{PERIOD_LENGTH} days played
        </p>
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
            {periodDatesDesc.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        {dayScores.length > 0 ? (
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
                {dayScores.map((row, idx) => (
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

      {/* Period standings */}
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
                <th className="px-6 py-3 text-right">Games</th>
                <th className="px-6 py-3 text-right">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, idx) => (
                <tr key={s.playerName} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 text-xl">{getRank(idx)}</td>
                  <td className="px-6 py-4">
                    <Link
                      to="/players/$playerId"
                      params={{ playerId: String(s.playerId) }}
                      className="font-medium text-white hover:text-emerald-400"
                    >
                      {s.playerName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-400">{s.wins}</td>
                  <td className="px-6 py-4 text-right text-slate-300">{s.gamesPlayed}</td>
                  <td className="px-6 py-4 text-right text-slate-300">{s.avgScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score trends — full width */}
      {mounted && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Score Trends (this period)</h2>
          <Line
            data={lineData}
            options={{
              responsive: true,
              plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12 } } },
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

          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
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
    </div>
  )
}
