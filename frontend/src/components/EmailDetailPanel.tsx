import { useEmail } from '../hooks/useEmails'
import { ToolCallCard } from './ToolCallCard'
import type { ToolName } from '../types'

function Skeleton() {
  return (
    <div className="p-6 animate-pulse space-y-4">
      <div className="h-5 bg-slate-100 rounded w-2/3" />
      <div className="h-3.5 bg-slate-100 rounded w-1/2" />
      <div className="h-3.5 bg-slate-100 rounded w-1/3" />
      <div className="h-40 bg-slate-50 rounded mt-6" />
    </div>
  )
}

interface Props {
  emailId: string | null
}

export function EmailDetailPanel({ emailId }: Props) {
  const { data: email, isLoading, error, refetch } = useEmail(emailId)

  if (!emailId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <svg className="w-12 h-12 mb-4 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="text-sm font-medium text-slate-500">Select an email to view details</p>
        <p className="text-sm text-slate-400 mt-1">Click any email from the list</p>
      </div>
    )
  }

  if (isLoading) return <Skeleton />

  if (error || !email) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 text-sm mb-3">Failed to load email.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex-shrink-0">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 leading-snug">
          {email.subject || '(no subject)'}
        </h2>
        <div className="space-y-1">
          {[
            { label: 'From', value: email.from_addr },
            { label: 'To', value: email.to_addr || '—' },
            ...(email.cc ? [{ label: 'CC', value: email.cc }] : []),
            { label: 'Date', value: email.date },
          ].map(({ label, value }) => (
            <div key={label} className="flex gap-3 text-sm">
              <span className="text-slate-400 w-10 shrink-0">{label}</span>
              <span className="text-slate-700 truncate">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Body */}
        <div className="px-6 py-5">
          <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans leading-relaxed bg-slate-50 rounded-lg p-4 max-h-56 overflow-y-auto border border-slate-100">
            {email.body || '(empty body)'}
          </pre>
        </div>

        {/* AI Recommendations */}
        {email.toolCalls.length > 0 && (
          <div className="px-6 pb-6">
            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                AI Recommendations
              </h3>
              <div className="space-y-3">
                {email.toolCalls.map(tc => (
                  <ToolCallCard
                    key={tc.id}
                    toolCall={{ ...tc, tool_name: tc.tool_name as ToolName }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
