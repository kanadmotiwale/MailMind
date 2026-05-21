import { useState } from 'react'
import { executeTool } from '../lib/api'
import { getToolConfig } from './ToolBadge'
import type { ToolCall, ToolName } from '../types'

const TOOL_HEADER_COLORS: Record<ToolName, string> = {
  schedule_meeting: 'bg-blue-600',
  draft_response: 'bg-purple-600',
  escalate_to_manager: 'bg-red-600',
  create_task: 'bg-green-600',
  flag_urgent: 'bg-amber-500',
  archive_no_action: 'bg-gray-500',
  agent_error: 'bg-red-900',
}

function ArgRow({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === '') return null
  const display = Array.isArray(value) ? value.join(', ') : String(value)
  if (!display) return null
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-500 min-w-[110px] capitalize">{label.replace(/_/g, ' ')}:</span>
      <span className="text-gray-800 break-words">{display}</span>
    </div>
  )
}

function ResultDisplay({ result }: { result: Record<string, unknown> }) {
  const skip = new Set(['rationale'])
  const entries = Object.entries(result).filter(([k]) => !skip.has(k))
  return (
    <div className="bg-gray-50 rounded-lg p-3 mt-3 space-y-1">
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
  const headerColor = TOOL_HEADER_COLORS[toolCall.tool_name]

  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(toolCall.mock_result)
  const [execError, setExecError] = useState<string | null>(null)

  const SKIP_ARG_KEYS = new Set(['rationale'])

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
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className={`${headerColor} px-4 py-2.5 flex items-center gap-2`}>
        <span className="text-lg">{config.icon}</span>
        <span className="text-white font-semibold text-sm">{config.label}</span>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-gray-600 text-sm italic leading-relaxed">{toolCall.rationale}</p>

        <div className="space-y-1">
          {Object.entries(toolCall.arguments)
            .filter(([k]) => !SKIP_ARG_KEYS.has(k))
            .map(([key, val]) => (
              <ArgRow key={key} label={key} value={val} />
            ))}
        </div>

        {execError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-xs">
            {execError}
          </div>
        )}

        {result ? (
          <div>
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <span>✓ Executed</span>
            </div>
            <ResultDisplay result={result} />
          </div>
        ) : (
          <button
            onClick={handleExecute}
            disabled={executing}
            className="w-full mt-1 py-2 px-4 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {executing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-indigo-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Executing...
              </>
            ) : (
              'Execute'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
