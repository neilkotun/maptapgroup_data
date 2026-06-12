import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Upload, Plus, CheckCircle, AlertCircle, Trash2, Edit3 } from 'lucide-react'

export const Route = createFileRoute('/submit')({
  component: SubmitScores,
})

interface ParsedScore {
  playerName: string
  gameDate: string
  city1: number | null
  city2: number | null
  city3: number | null
  city4: number | null
  city5: number | null
  total: number
}

interface ManualEntry {
  playerName: string
  gameDate: string
  city1: string
  city2: string
  city3: string
  city4: string
  city5: string
  total: string
}

const emptyManual = (): ManualEntry => ({
  playerName: '',
  gameDate: new Date().toISOString().split('T')[0],
  city1: '', city2: '', city3: '', city4: '', city5: '',
  total: '',
})

type Mode = 'paste' | 'manual'

function SubmitScores() {
  const [mode, setMode] = useState<Mode>('paste')

  // Paste mode
  const [chatText, setChatText] = useState('')
  const [defaultDate, setDefaultDate] = useState(new Date().toISOString().split('T')[0])
  const [parsed, setParsed] = useState<ParsedScore[] | null>(null)
  const [parseError, setParseError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null)

  // Manual mode
  const [manualEntry, setManualEntry] = useState<ManualEntry>(emptyManual())
  const [manualError, setManualError] = useState('')
  const [manualSuccess, setManualSuccess] = useState('')

  async function handleParse() {
    setParseError('')
    setParsed(null)
    setSubmitStatus(null)
    const res = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: chatText, defaultDate }),
    })
    const data = await res.json()
    if (!res.ok) { setParseError(data.error || 'Parse error'); return }
    if (data.parsed.length === 0) {
      setParseError("No scores could be parsed from the text. Make sure it matches a supported format (see examples below).")
      return
    }
    setParsed(data.parsed)
  }

  function removeParsed(idx: number) {
    setParsed(prev => prev ? prev.filter((_, i) => i !== idx) : null)
  }

  function editParsedField(idx: number, field: keyof ParsedScore, value: string) {
    setParsed(prev => {
      if (!prev) return prev
      const updated = [...prev]
      const entry = { ...updated[idx] }
      if (field === 'playerName' || field === 'gameDate') {
        entry[field] = value
      } else {
        ;(entry as any)[field] = value === '' ? null : parseInt(value)
      }
      // Recompute total if city scores changed
      if (['city1', 'city2', 'city3', 'city4', 'city5'].includes(field)) {
        const cities = [entry.city1, entry.city2, entry.city3, entry.city4, entry.city5]
        const all = cities.every(c => c !== null)
        if (all) entry.total = cities.reduce((a, b) => a! + b!, 0)!
      }
      updated[idx] = entry
      return updated
    })
  }

  async function handleSubmitParsed() {
    if (!parsed || parsed.length === 0) return
    setSubmitting(true)
    setSubmitStatus(null)
    let successCount = 0
    let errorCount = 0
    for (const score of parsed) {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(score),
      })
      if (res.ok) successCount++
      else errorCount++
    }
    setSubmitting(false)
    if (errorCount === 0) {
      setSubmitStatus({ success: true, message: `${successCount} score(s) submitted successfully!` })
      setChatText('')
      setParsed(null)
    } else {
      setSubmitStatus({ success: false, message: `${successCount} submitted, ${errorCount} failed.` })
    }
  }

  function computeManualTotal(entry: ManualEntry) {
    const vals = [entry.city1, entry.city2, entry.city3, entry.city4, entry.city5].map(v => parseInt(v) || 0)
    return vals.reduce((a, b) => a + b, 0)
  }

  function handleManualCityChange(field: keyof ManualEntry, value: string) {
    setManualEntry(prev => {
      const updated = { ...prev, [field]: value }
      if (['city1', 'city2', 'city3', 'city4', 'city5'].includes(field)) {
        const total = computeManualTotal(updated)
        updated.total = total > 0 ? String(total) : updated.total
      }
      return updated
    })
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setManualError('')
    setManualSuccess('')
    const { playerName, gameDate, total } = manualEntry
    if (!playerName.trim() || !gameDate || !total) {
      setManualError('Player name, date, and total are required.')
      return
    }
    const payload = {
      playerName: playerName.trim(),
      gameDate,
      city1: manualEntry.city1 ? parseInt(manualEntry.city1) : null,
      city2: manualEntry.city2 ? parseInt(manualEntry.city2) : null,
      city3: manualEntry.city3 ? parseInt(manualEntry.city3) : null,
      city4: manualEntry.city4 ? parseInt(manualEntry.city4) : null,
      city5: manualEntry.city5 ? parseInt(manualEntry.city5) : null,
      total: parseInt(total),
    }
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      setManualSuccess('Score submitted!')
      setManualEntry(emptyManual())
    } else {
      const data = await res.json()
      setManualError(data.error || 'Submission failed.')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Submit Scores</h1>
        <p className="text-slate-400 mt-1">Add daily MapTap scores from your group chat or enter them manually.</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setMode('paste')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'paste' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Upload className="w-4 h-4" /> Paste Chat
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'manual' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Plus className="w-4 h-4" /> Manual Entry
        </button>
      </div>

      {/* Paste mode */}
      {mode === 'paste' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-slate-400 mb-1.5">Default Game Date</label>
                <input
                  type="date"
                  value={defaultDate}
                  onChange={e => setDefaultDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-500 mt-1">Used if no date is detected in the text</p>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Paste Group Chat Text</label>
              <textarea
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                rows={10}
                placeholder={`Paste your group chat messages here. Examples:\n\nAlice\nMapTap 2024-01-15\nCity 1: 85\nCity 2: 92\nCity 3: 78\nCity 4: 95\nCity 5: 88\nTotal: 438\n\nBob: 85 / 72 / 90 / 65 / 80\nTotal: 392\n\nCarla: 420`}
                value={chatText}
                onChange={e => setChatText(e.target.value)}
              />
            </div>

            <button
              onClick={handleParse}
              disabled={!chatText.trim()}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              Parse Scores
            </button>

            {parseError && (
              <div className="flex items-start gap-2 text-red-400 bg-red-950/40 border border-red-800 rounded-xl p-4 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{parseError}</span>
              </div>
            )}
          </div>

          {/* Parsed preview */}
          {parsed && parsed.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-slate-400" />
                  <h2 className="font-semibold text-white">Review & Edit Parsed Scores</h2>
                </div>
                <span className="text-sm text-slate-400">{parsed.length} score(s)</span>
              </div>
              <div className="divide-y divide-slate-800">
                {parsed.map((score, idx) => (
                  <div key={idx} className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex gap-3 flex-wrap flex-1">
                        <div className="flex-1 min-w-[140px]">
                          <label className="block text-xs text-slate-500 mb-1">Player Name</label>
                          <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={score.playerName}
                            onChange={e => editParsedField(idx, 'playerName', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Game Date</label>
                          <input
                            type="date"
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={score.gameDate}
                            onChange={e => editParsedField(idx, 'gameDate', e.target.value)}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeParsed(idx)}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(['city1', 'city2', 'city3', 'city4', 'city5'] as const).map((city, ci) => (
                        <div key={city}>
                          <label className="block text-xs text-slate-500 mb-1">City {ci + 1}</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={score[city] ?? ''}
                            onChange={e => editParsedField(idx, city, e.target.value)}
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Total</label>
                        <div className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-emerald-400 font-bold text-sm text-center">
                          {score.total}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-slate-800 flex items-center gap-4">
                <button
                  onClick={handleSubmitParsed}
                  disabled={submitting || parsed.length === 0}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
                >
                  {submitting ? 'Submitting…' : `Submit ${parsed.length} Score(s)`}
                </button>
                {submitStatus && (
                  <div className={`flex items-center gap-2 text-sm ${submitStatus.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {submitStatus.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {submitStatus.message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Format guide */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-3">Supported Chat Formats</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="bg-slate-800 rounded-xl p-4 space-y-1">
                <div className="text-slate-400 mb-2 font-sans font-medium text-xs not-italic">Format A — Full details</div>
                <div className="text-slate-300">Alice</div>
                <div className="text-slate-300">MapTap 2024-01-15</div>
                <div className="text-slate-300">City 1: 85</div>
                <div className="text-slate-300">City 2: 92</div>
                <div className="text-slate-300">City 3: 78</div>
                <div className="text-slate-300">City 4: 95</div>
                <div className="text-slate-300">City 5: 88</div>
                <div className="text-emerald-400">Total: 438</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 space-y-1">
                <div className="text-slate-400 mb-2 font-sans font-medium text-xs not-italic">Format B — Slash-separated</div>
                <div className="text-slate-300">Bob:</div>
                <div className="text-slate-300">85 / 72 / 90 / 65 / 80</div>
                <div className="text-emerald-400">Total: 392</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 space-y-1">
                <div className="text-slate-400 mb-2 font-sans font-medium text-xs not-italic">Format C — Total only</div>
                <div className="text-slate-300">Alice: 438</div>
                <div className="text-slate-300">Bob: 392</div>
                <div className="text-slate-300">Carla: 420</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual mode */}
      {mode === 'manual' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <form onSubmit={handleManualSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Player Name *</label>
                <input
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Alice"
                  value={manualEntry.playerName}
                  onChange={e => setManualEntry(prev => ({ ...prev, playerName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Game Date *</label>
                <input
                  type="date"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={manualEntry.gameDate}
                  onChange={e => setManualEntry(prev => ({ ...prev, gameDate: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">City Scores (0–100 each)</label>
              <div className="flex gap-3 flex-wrap">
                {(['city1', 'city2', 'city3', 'city4', 'city5'] as const).map((field, i) => (
                  <div key={field}>
                    <label className="block text-xs text-slate-500 mb-1">City {i + 1}</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={manualEntry[field]}
                      onChange={e => handleManualCityChange(field, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="w-32">
              <label className="block text-sm text-slate-400 mb-1.5">Total Score *</label>
              <input
                type="number"
                min={0}
                max={500}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0–500"
                value={manualEntry.total}
                onChange={e => setManualEntry(prev => ({ ...prev, total: e.target.value }))}
              />
            </div>

            {manualError && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" /> {manualError}
              </div>
            )}
            {manualSuccess && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle className="w-4 h-4" /> {manualSuccess}
              </div>
            )}

            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              Submit Score
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
