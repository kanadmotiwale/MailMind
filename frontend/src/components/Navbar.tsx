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
    `px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
      pathname === path
        ? 'bg-slate-100 text-slate-900'
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
    }`

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-screen-xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-slate-900 font-semibold text-base tracking-tight">MailMind</span>
            </Link>
            <div className="flex gap-1">
              <Link to="/upload" className={linkClass('/upload')}>Upload</Link>
              <Link to="/inbox" className={linkClass('/inbox')}>Inbox</Link>
            </div>
          </div>
          {totalEmails > 0 && (
            <span className="text-xs text-slate-400 font-mono">
              {totalEmails} emails · {totalToolCalls} tool calls
            </span>
          )}
        </div>
      </div>
    </nav>
  )
}
