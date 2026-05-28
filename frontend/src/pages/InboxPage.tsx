import { useState, useEffect } from 'react'
import { EmailList } from '../components/EmailList'
import { EmailDetailPanel } from '../components/EmailDetailPanel'
import { useEmails } from '../hooks/useEmails'
import type { ToolName } from '../types'

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function InboxPage() {
  const [search, setSearch] = useState('')
  const [toolFilter, setToolFilter] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, error, refetch } = useEmails(
    toolFilter ?? undefined,
    debouncedSearch || undefined
  )

  const emails = data?.emails ?? []
  const totalAll = data?.totalAll ?? 0

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      <div className="w-2/5 flex flex-col min-w-0">
        <EmailList
          emails={emails}
          totalAll={totalAll}
          loading={isLoading}
          error={error as Error | null}
          selectedId={selectedId}
          onSelect={setSelectedId}
          search={search}
          onSearch={setSearch}
          toolFilter={toolFilter}
          onToolFilter={v => {
            setToolFilter(v as ToolName | null)
            setSelectedId(null)
          }}
          onRetry={refetch}
        />
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <EmailDetailPanel emailId={selectedId} />
      </div>
    </div>
  )
}
