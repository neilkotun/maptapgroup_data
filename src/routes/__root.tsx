import { createRootRoute, HeadContent, Link, Scripts } from '@tanstack/react-router'
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

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 flex items-center gap-6 h-14">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg text-emerald-400 hover:text-emerald-300">
              🌍 MapTap
            </Link>
            <div className="flex gap-4 text-sm">
              <Link to="/" className="text-slate-300 hover:text-white [&.active]:text-emerald-400 [&.active]:font-semibold">
                Dashboard
              </Link>
              <Link to="/champions" className="text-slate-300 hover:text-white [&.active]:text-emerald-400 [&.active]:font-semibold">
                Champions
              </Link>
            </div>
          </div>
        </nav>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
