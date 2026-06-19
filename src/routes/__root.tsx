import { createRootRoute, HeadContent, Link, Scripts } from '@tanstack/react-router'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'MapTap Leaderboard' },
    ],
  }),
  shellComponent: RootDocument,
})

const NAV_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/champions', label: 'Champions' },
  { to: '/players', label: 'Players' },
]

function NavBar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-emerald-400 hover:text-emerald-300">
          🌍 MapTap
        </Link>
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-800 bg-slate-900">
          <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="px-2 py-3 text-slate-300 hover:text-white border-b border-slate-800/60 last:border-0 [&.active]:text-emerald-400 [&.active]:font-semibold"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <NavBar />
        {children}
        <Scripts />
      </body>
    </html>
  )
}
