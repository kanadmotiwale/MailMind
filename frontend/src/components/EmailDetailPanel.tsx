import { useEmail } from '../hooks/useEmails'
import { ToolCallCard } from './ToolCallCard'
import type { ToolName } from '../types'

function Skeleton() {
  return (
    <div className="p-6 animate-pulse space-y-4">
      <div className="h-6 bg-gray-200 rounded w-2/3" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="h-32 bg-gray-100 rounded mt-6" />
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
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
        <div className="text-5xl mb-4">📬</div>
        <p className="font-medium">Select an email to view details</p>
        <p className="text-sm mt-1">Click any email from the list on the left</p>
      </div>
    )
  }

  if (isLoading) return <Skeleton />

  if (error || !email) {
    return (
      <div className="p-6 text-center text-red-500">
        <p className="mb-3">Failed to load email.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">
          {email.subject || '(no subject)'}
        </h2>
        <div className="space-y-1 text-sm text-gray-600">
          <div>
            <span className="text-gray-400 w-14 inline-block">From</span>
            <span>{email.from_addr}</span>
          </div>
          <div>
            <span className="text-gray-400 w-14 inline-block">To</span>
            <span>{email.to_addr || '—'}</span>
          </div>
          {email.cc && (
            <div>
              <span className="text-gray-400 w-14 inline-block">CC</span>
              <span>{email.cc}</span>
            </div>
          )}
          <div>
            <span className="text-gray-400 w-14 inline-block">Date</span>
            <span>{email.date}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Body
          </h3>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto">
            {email.body || '(empty body)'}
          </pre>
        </div>

        {email.toolCalls.length > 0 && (
          <div className="px-6 pb-6">
            <div className="border-t border-gray-200 pt-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                AI Recommendations
              </h3>
              <div className="space-y-4">
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
