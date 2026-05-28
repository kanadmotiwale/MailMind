import { useState } from 'react'
import { executeTool } from '../lib/api'
import { getToolConfig } from './ToolBadge'
import type { ToolCall, ToolName } from '../types'

const TOOL_BORDER: Record<ToolName, string> = {
  schedule_meeting: 'border-l-blue-500',
  draft_response: 'border-l-violet-500',
  escalate_to_manager: 'border-l-rose-500',
  create_task: 'border-l-emerald-500',
  flag_urgent: 'border-l-amber-500',
  archive_no_action: 'border-l-slate-400',
  agent_error: 'border-l-red-500',
}

const TOOL_LABEL_COLOR: Record<ToolName, string> = {
  schedule_meeting: 'text-blue-700',
  draft_response: 'text-violet-700',
  escalate_to_manager: 'text-rose-700',
  create_task: 'text-emerald-700',
  flag_urgent: 'text-amber-700',
  archive_no_action: 'text-slate-600',
  agent_error: 'text-red-700',
}

function ArgRow({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === '') return null
  const display = Array.isArray(value) ? value.join(', ') : String(value)
  if (!display) return null
  return (
    <div className="flex gap-3 text-sm leading-relaxed">
      <span className="text-slate-400 shrink-0 w-28 capitalize">{label.replace(/_/g, ' ')}</span>
      <span className="text-slate-700">{display}</span>
    </div>
  )
}

function ResultDisplay({ result }: { result: Record<string, unknown> }) {
  const skip = new Set(['rationale'])
  const entries = Object.entries(result).filter(([k]) => !skip.has(k))
  return (
    <div className="mt-3 bg-slate-50 rounded-lg p-3 space-y-1.5 border border-slate-100">
      {entries.map(([key, val]) => (
        <ArgRow key={key} label={key} value={val} />
      ))}
    </div>
  )
}

interface Props {
  toolCall: ToolCall
}

export function ToolCallCard({ toolCall }: Props) {
  const config = getToolConfig(toolCall.tool_name)
  const borderColor = TOOL_BORDER[toolCall.tool_name]
  const labelColor = TOOL_LABEL_COLOR[toolCall.tool_name]
  const SKIP_ARG_KEYS = new Set(['rationale'])

  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(toolCall.mock_result)
  const [execError, setExecError] = useState<string | null>(null)

  async function handleExecute() {
    setExecuting(true)
    setExecError(null)
    try {
      const res = await executeTool(toolCall.id, toolCall.tool_name, toolCall.arguments)
      setResult(res)
    } catch (err) {
      setExecError(err instanceof Error ? err.message : 'Execution failed')
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className={`bg-white rounded-lg border border-slate-200 border-l-4 ${borderColor} shadow-sm`}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-semibold ${labelColor}`}>{config.label}</span>
          {result ? (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Executed
            </span>
          ) : null}
        </div>

        <p className="text-slate-500 text-sm italic mb-3 leading-relaxed">{toolCall.rationale}</p>

        <div className="space-y-1">
          {Object.entries(toolCall.arguments)
            .filter(([k]) => !SKIP_ARG_KEYS.has(k))
            .map(([key, val]) => (
              <ArgRow key={key} label={key} value={val} />
            ))}
        </div>

        {execError && (
          <div className="mt-3 bg-red-50 border border-red-100 rounded px-3 py-2 text-red-600 text-xs">
            {execError}
          </div>
        )}

        {result ? (
          <ResultDisplay result={result} />
        ) : (
          <button
            onClick={handleExecute}
            disabled={executing}
            className="mt-3 w-full py-1.5 px-3 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {executing ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Running...
              </>
            ) : 'Execute'}
          </button>
        )}
      </div>
    </div>
  )
}
