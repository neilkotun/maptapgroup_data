import { createFileRoute } from '@tanstack/react-router'

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

/**
 * Parses maptap score messages from group chat text.
 *
 * Supported formats:
 *
 * Format A (explicit label + date):
 *   [Name]
 *   MapTap YYYY-MM-DD
 *   City 1: 85
 *   City 2: 92
 *   ...
 *   Total: 438
 *
 * Format B (name on same line as score block marker):
 *   [Name]: MapTap YYYY-MM-DD
 *   85 / 92 / 78 / 95 / 88
 *   Total: 438
 *
 * Format C (condensed, just totals):
 *   [Name]: 438
 *   [Name2]: 425
 *   (Date defaults to today if not detected)
 */
function parseChatText(text: string, defaultDate: string): ParsedScore[] {
  const results: ParsedScore[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Detect a YYYY-MM-DD date anywhere in the text
  const globalDateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  const globalDate = globalDateMatch ? globalDateMatch[1] : defaultDate

  // State machine parser
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Look for a player block: a line that is just a name (no digits) or "Name:" pattern
    // followed by score lines

    // Pattern: "Name\nMaptap <date>\nCity 1: N\n..."
    // or "Name: Maptap <date>"
    const nameOnly = /^([A-Za-z][A-Za-z '._-]{0,30})$/.test(line) && !/^\d/.test(line)
    const nameWithColon = line.match(/^([A-Za-z][A-Za-z '._-]{0,30}):\s*(.*)$/)

    // Simple "Name: total" line  e.g. "Alice: 438"
    const simpleLine = line.match(/^([A-Za-z][A-Za-z '._-]{0,30}):\s*(\d{1,3})\s*$/)
    if (simpleLine) {
      const total = parseInt(simpleLine[2])
      if (total >= 0 && total <= 500) {
        results.push({
          playerName: simpleLine[1].trim(),
          gameDate: globalDate,
          city1: null, city2: null, city3: null, city4: null, city5: null,
          total,
        })
      }
      i++
      continue
    }

    // Look for 5 city scores on consecutive lines after a name
    if (nameOnly || nameWithColon) {
      const playerName = nameOnly ? line : nameWithColon![1].trim()
      let dateStr = globalDate

      // Check if next line has a date
      if (i + 1 < lines.length) {
        const dateMatch = lines[i + 1].match(/\b(\d{4}-\d{2}-\d{2})\b/)
        if (dateMatch) {
          dateStr = dateMatch[1]
          i++ // skip date line
        }
      }

      // Collect city scores
      const cityScores: number[] = []
      let total: number | null = null
      let j = i + 1

      while (j < lines.length && cityScores.length < 5) {
        const cityLine = lines[j]

        // "City N: 85" or just "85"
        const cityMatch = cityLine.match(/(?:city\s*\d+\s*:?\s*)?(\d{1,3})(?:\s*\/\s*(\d{1,3}))?/i)

        // Slash-separated scores on one line: "85 / 92 / 78 / 95 / 88"
        const slashLine = cityLine.match(/(\d{1,3})\s*[\/|]\s*(\d{1,3})\s*[\/|]\s*(\d{1,3})\s*[\/|]\s*(\d{1,3})\s*[\/|]\s*(\d{1,3})/)
        if (slashLine) {
          for (let k = 1; k <= 5; k++) cityScores.push(parseInt(slashLine[k]))
          j++
          continue
        }

        // "Total: N"
        const totalMatch = cityLine.match(/total\s*:?\s*(\d{1,3})/i)
        if (totalMatch) {
          total = parseInt(totalMatch[1])
          j++
          break
        }

        if (cityMatch) {
          const val = parseInt(cityMatch[1])
          if (val >= 0 && val <= 100) {
            cityScores.push(val)
            j++
            continue
          }
        }

        // Non-matching line that isn't a score — stop collecting for this player
        break
      }

      if (cityScores.length === 5) {
        const computedTotal = cityScores.reduce((a, b) => a + b, 0)
        results.push({
          playerName,
          gameDate: dateStr,
          city1: cityScores[0],
          city2: cityScores[1],
          city3: cityScores[2],
          city4: cityScores[3],
          city5: cityScores[4],
          total: total ?? computedTotal,
        })
        i = j
        continue
      }

      // Didn't find 5 cities — still try total if we found one
      if (total !== null) {
        results.push({
          playerName,
          gameDate: dateStr,
          city1: cityScores[0] ?? null,
          city2: cityScores[1] ?? null,
          city3: cityScores[2] ?? null,
          city4: cityScores[3] ?? null,
          city5: cityScores[4] ?? null,
          total,
        })
        i = j
        continue
      }
    }

    i++
  }

  return results
}

export const Route = createFileRoute('/api/parse')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { text, defaultDate } = await request.json()
        if (!text?.trim()) {
          return Response.json({ error: 'text is required' }, { status: 400 })
        }
        const today = new Date().toISOString().split('T')[0]
        const parsed = parseChatText(text, defaultDate || today)
        return Response.json({ parsed })
      },
    },
  },
})
