import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Avatar } from '../shared'

export const Route = createFileRoute('/players/')({
  component: PlayersIndex,
})

interface PlayerSummary {
  id: number
  name: string
  gamesPlayed: number
  avgTotal: number | null
  maxTotal: number | null
  totalSum: number | null
}

function PlayersIndex() {
  const [players, setPlayers] = useState<PlayerSummary[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/players')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))))
      .then(setPlayers)
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 animate-pulse text-lg">Loading players…</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Players</h1>
        <p className="text-slate-400 mt-1">Tap a player to see their full stats.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(players ?? []).map(p => (
          <Link
            key={p.id}
            to="/players/$playerId"
            params={{ playerId: String(p.id) }}
            className="bg-slate-900 rounded-2xl border border-slate-800 p-5 flex items-center gap-4 hover:border-slate-600 transition-colors"
          >
            <Avatar name={p.name} size={56} />
            <div>
              <div className="font-semibold text-white text-lg">{p.name}</div>
              <div className="text-sm text-slate-400">
                {p.gamesPlayed} games · avg {p.avgTotal ?? '—'}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
