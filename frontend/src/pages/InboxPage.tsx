import { useState, useEffect, useRef, useCallback } from 'react'
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

const MIN_WIDTH = 20  // % minimum for either panel
const MAX_WIDTH = 75  // % maximum for left panel

export function InboxPage() {
  const [search, setSearch] = useState('')
  const [toolFilter, setToolFilter] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [leftWidth, setLeftWidth] = useState(38) // percent
  const [dragging, setDragging] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, error, refetch } = useEmails(
    toolFilter ?? undefined,
    debouncedSearch || undefined
  )

  const emails = data?.emails ?? []
  const totalAll = data?.totalAll ?? 0

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  useEffect(() => {
    if (!dragging) return

    function onMouseMove(e: MouseEvent) {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setLeftWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, pct)))
    }

    function onMouseUp() {
      setDragging(false)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [dragging])

  return (
    <div
      ref={containerRef}
      className={`flex flex-1 overflow-hidden ${dragging ? 'select-none cursor-col-resize' : ''}`}
    >
      {/* Left panel */}
      <div className="flex flex-col min-w-0 overflow-hidden" style={{ width: `${leftWidth}%` }}>
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

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className={`w-1 shrink-0 cursor-col-resize group relative flex items-center justify-center transition-colors ${
          dragging ? 'bg-blue-400' : 'bg-slate-200 hover:bg-blue-400'
        }`}
      >
        {/* Visual grip dots */}
        <div className={`absolute flex flex-col gap-1 transition-opacity ${dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {[0,1,2].map(i => (
            <div key={i} className="w-1 h-1 rounded-full bg-white" />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <EmailDetailPanel emailId={selectedId} />
      </div>
    </div>
  )
}
