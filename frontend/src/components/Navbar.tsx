import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getEmails } from '../lib/api'

export function Navbar() {
  const { pathname } = useLocation()
  const { data } = useQuery({
    queryKey: ['emails'],
    queryFn: () => getEmails(),
    staleTime: 30_000,
    refetchInterval: 10_000,
  })

  const totalEmails = data?.total ?? 0
  const totalToolCalls = data?.emails.reduce((acc, e) => acc + e.toolCalls.length, 0) ?? 0

  const linkClass = (path: string) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      pathname === path
        ? 'bg-indigo-700 text-white'
        : 'text-indigo-100 hover:bg-indigo-700 hover:text-white'
    }`

  return (
    <nav className="bg-indigo-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl">✉️</span>
              <span className="text-white font-bold text-lg tracking-tight">MailMind</span>
            </Link>
            <div className="flex gap-1">
              <Link to="/upload" className={linkClass('/upload')}>
                Upload
              </Link>
              <Link to="/inbox" className={linkClass('/inbox')}>
                Inbox
              </Link>
            </div>
          </div>
          {totalEmails > 0 && (
            <div className="text-indigo-200 text-xs font-mono bg-indigo-900 px-3 py-1 rounded-full">
              {totalEmails} emails · {totalToolCalls} tool calls
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
