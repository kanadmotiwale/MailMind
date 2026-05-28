import { formatDistanceToNow } from 'date-fns'
import { ToolBadge } from './ToolBadge'
import type { Email, ToolName } from '../types'

const FILTER_CHIPS: { label: string; value: string | null }[] = [
  { label: 'All', value: null },
  { label: 'Meeting', value: 'schedule_meeting' },
  { label: 'Draft', value: 'draft_response' },
  { label: 'Escalate', value: 'escalate_to_manager' },
  { label: 'Task', value: 'create_task' },
  { label: 'Urgent', value: 'flag_urgent' },
  { label: 'Archive', value: 'archive_no_action' },
]

function Skeleton() {
  return (
    <div className="px-4 py-3 border-b border-slate-100 animate-pulse">
      <div className="h-3.5 bg-slate-100 rounded w-1/3 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-2/3 mb-2.5" />
      <div className="flex gap-1.5">
        <div className="h-4 bg-slate-100 rounded w-14" />
        <div className="h-4 bg-slate-100 rounded w-12" />
      </div>
    </div>
  )
}

function relativeDate(dateStr: string) {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return dateStr
  }
}

function senderName(from: string) {
  return from.replace(/<.*?>/, '').replace(/"/g, '').trim() || from
}

interface Props {
  emails: Email[]
  totalAll: number
  loading: boolean
  error: Error | null
  selectedId: string | null
  onSelect: (id: string) => void
  search: string
  onSearch: (v: string) => void
  toolFilter: string | null
  onToolFilter: (v: string | null) => void
  onRetry: () => void
}

export function EmailList({
  emails,
  totalAll,
  loading,
  error,
  selectedId,
  onSelect,
  search,
  onSearch,
  toolFilter,
  onToolFilter,
  onRetry,
}: Props) {
  return (
    <div className="flex flex-col h-full border-r border-slate-200 bg-white">
      {/* Search */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-100">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search"
            value={search}
            onChange={e => onSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-4 py-2 flex gap-1.5 flex-wrap border-b border-slate-100">
        {FILTER_CHIPS.map(chip => (
          <button
            key={chip.value ?? 'all'}
            onClick={() => onToolFilter(chip.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              toolFilter === chip.value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Count */}
      <div className="px-4 py-1.5">
        <p className="text-xs text-slate-400">
          Showing {emails.length} of {totalAll} emails
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} />)}

        {error && (
          <div className="p-8 text-center">
            <p className="text-slate-500 text-sm mb-3">Failed to load emails.</p>
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && emails.length === 0 && (
          <div className="p-10 text-center text-slate-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium">No emails match your filters</p>
          </div>
        )}

        {!loading && !error && emails.map(email => (
          <button
            key={email.id}
            onClick={() => onSelect(email.id)}
            className={`w-full text-left px-4 py-3 border-b border-slate-100 transition-colors ${
              selectedId === email.id
                ? 'bg-blue-50 border-l-2 border-l-blue-500'
                : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex justify-between items-baseline mb-0.5">
              <span className="text-sm font-semibold text-slate-800 truncate max-w-[160px]">
                {senderName(email.from_addr)}
              </span>
              <span className="text-xs text-slate-400 ml-2 shrink-0">
                {relativeDate(email.date)}
              </span>
            </div>
            <p className="text-sm text-slate-600 truncate mb-1.5">
              {email.subject || '(no subject)'}
            </p>
            <div className="flex gap-1 flex-wrap">
              {email.toolCalls.map(tc => (
                <ToolBadge key={tc.id} toolName={tc.tool_name as ToolName} />
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
