import { formatDistanceToNow } from 'date-fns'
import { ToolBadge } from './ToolBadge'
import type { Email, ToolName } from '../types'

const FILTER_CHIPS: { label: string; icon: string; value: string | null }[] = [
  { label: 'All', icon: '', value: null },
  { label: 'Meeting', icon: '📅', value: 'schedule_meeting' },
  { label: 'Draft', icon: '✉️', value: 'draft_response' },
  { label: 'Escalate', icon: '⚠️', value: 'escalate_to_manager' },
  { label: 'Task', icon: '✅', value: 'create_task' },
  { label: 'Urgent', icon: '🚨', value: 'flag_urgent' },
  { label: 'Archive', icon: '📁', value: 'archive_no_action' },
]

function Skeleton() {
  return (
    <div className="p-4 border-b border-gray-100 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
      <div className="flex gap-2">
        <div className="h-5 bg-gray-200 rounded-full w-16" />
        <div className="h-5 bg-gray-200 rounded-full w-14" />
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
    <div className="flex flex-col h-full border-r border-gray-200">
      <div className="p-3 border-b border-gray-200 space-y-2 flex-shrink-0">
        <input
          type="search"
          placeholder="Search sender or subject..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip.value ?? 'all'}
              onClick={() => onToolFilter(chip.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                toolFilter === chip.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {chip.icon} {chip.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          Showing {emails.length} of {totalAll} emails
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} />
            ))}
          </>
        )}

        {error && (
          <div className="p-6 text-center">
            <p className="text-red-500 text-sm mb-3">Failed to load emails.</p>
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && emails.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm font-medium">No emails match your filters.</p>
          </div>
        )}

        {!loading &&
          !error &&
          emails.map(email => (
            <button
              key={email.id}
              onClick={() => onSelect(email.id)}
              className={`w-full text-left p-4 border-b border-gray-100 transition-colors ${
                selectedId === email.id
                  ? 'bg-indigo-50 border-l-4 border-l-indigo-500'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-sm text-gray-900 truncate max-w-[180px]">
                  {email.from_addr.replace(/<.*?>/, '').trim() || email.from_addr}
                </span>
                <span className="text-xs text-gray-400 shrink-0 ml-2">
                  {relativeDate(email.date)}
                </span>
              </div>
              <p className="text-sm text-gray-600 truncate mb-2">{email.subject || '(no subject)'}</p>
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
