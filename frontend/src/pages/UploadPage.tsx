import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { DropZone } from '../components/DropZone'
import { ProgressBar } from '../components/ProgressBar'
import { uploadCSV, getEmails } from '../lib/api'
import { useAgentRun } from '../hooks/useAgentRun'
import type { ToolName } from '../types'

const TOOL_LABELS: Record<ToolName, string> = {
  schedule_meeting: '📅 Meetings',
  draft_response: '✉️ Drafts',
  escalate_to_manager: '⚠️ Escalations',
  create_task: '✅ Tasks',
  flag_urgent: '🚨 Urgent',
  archive_no_action: '📁 Archived',
  agent_error: '❌ Errors',
}

interface Toast {
  id: number
  subject: string
  from: string
}

export function UploadPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { phase, status, error: agentError, startRun } = useAgentRun()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [toolBreakdown, setToolBreakdown] = useState<Partial<Record<ToolName, number>>>({})
  const toastCounter = useRef(0)
  const prevProcessed = useRef(0)

  // Toast: fire when lastProcessed changes
  useEffect(() => {
    if (!status?.lastProcessed) return
    if (status.processed === prevProcessed.current) return
    prevProcessed.current = status.processed

    const id = ++toastCounter.current
    setToasts(t => [...t.slice(-4), { id, ...status.lastProcessed! }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [status?.processed, status?.lastProcessed])

  // Fetch breakdown when done
  useEffect(() => {
    if (phase !== 'done') return
    getEmails().then(res => {
      const counts: Partial<Record<ToolName, number>> = {}
      for (const email of res.emails) {
        for (const tc of email.toolCalls) {
          const k = tc.tool_name as ToolName
          counts[k] = (counts[k] ?? 0) + 1
        }
      }
      setToolBreakdown(counts)
      queryClient.invalidateQueries({ queryKey: ['emails'] })
    })
  }, [phase, queryClient])

  const handleFile = useCallback((file: File) => {
    setSelectedFile(file)
    setUploadError(null)
  }, [])

  async function handleSubmit() {
    if (!selectedFile) return
    setUploadError(null)
    setUploading(true)
    try {
      await uploadCSV(selectedFile)
      setUploading(false)
      await startRun()
    } catch (err) {
      setUploading(false)
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  const isProcessing = phase === 'uploading' || phase === 'analyzing'
  const isDone = phase === 'done'
  const totalToolCalls = Object.values(toolBreakdown).reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">✉️</div>
          <h1 className="text-3xl font-bold text-gray-900">MailMind</h1>
          <p className="text-gray-500 mt-2">AI-powered email triage — upload your CSV to get started</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          {!isProcessing && !isDone && (
            <>
              <DropZone onFile={handleFile} />

              {(uploadError || agentError) && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm">
                  {uploadError || agentError}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!selectedFile || uploading}
                className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Uploading...' : 'Upload & Analyze Emails'}
              </button>
            </>
          )}

          {isProcessing && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 text-sm justify-center">
                <span className="flex items-center gap-1.5 text-green-600 font-medium">
                  <span>✓</span> Uploaded
                </span>
                <span className="text-gray-300">→</span>
                <span className="flex items-center gap-1.5 text-indigo-600 font-medium">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  AI Analyzing...
                </span>
                <span className="text-gray-300">→</span>
                <span className="text-gray-400">Complete</span>
              </div>

              <ProgressBar value={status?.processed ?? 0} max={status?.total ?? 1} />

              <p className="text-gray-600 text-sm text-center">
                {status
                  ? `Analyzing email ${status.processed} of ${status.total}...`
                  : 'Starting analysis...'}
              </p>

              {status && status.errors > 0 && (
                <p className="text-amber-600 text-xs text-center">
                  {status.errors} error(s) encountered — processing continues.
                </p>
              )}
            </div>
          )}

          {isDone && status && (
            <div className="space-y-5 text-center">
              <div className="flex items-center gap-3 text-sm justify-center">
                <span className="text-green-600 font-medium">✓ Uploaded</span>
                <span className="text-gray-300">→</span>
                <span className="text-green-600 font-medium">✓ Analyzed</span>
                <span className="text-gray-300">→</span>
                <span className="text-green-600 font-medium">✓ Complete</span>
              </div>

              <div className="bg-indigo-50 rounded-xl p-5">
                <p className="text-xl font-bold text-indigo-700">
                  {status.total} emails processed · {totalToolCalls} tool calls suggested
                </p>

                {Object.keys(toolBreakdown).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 justify-center">
                    {(Object.entries(toolBreakdown) as [ToolName, number][])
                      .filter(([k]) => k !== 'agent_error')
                      .sort((a, b) => b[1] - a[1])
                      .map(([tool, count]) => (
                        <span
                          key={tool}
                          className="bg-white border border-indigo-100 text-indigo-700 text-xs font-medium px-3 py-1 rounded-full"
                        >
                          {TOOL_LABELS[tool]}: {count}
                        </span>
                      ))}
                  </div>
                )}

                {status.errors > 0 && (
                  <p className="text-amber-600 text-sm mt-2">{status.errors} emails had errors</p>
                )}
              </div>

              <button
                onClick={() => navigate('/inbox')}
                className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                View Inbox →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 space-y-2 z-50 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="bg-gray-900 text-white text-xs rounded-lg px-4 py-2.5 shadow-lg max-w-xs animate-pulse"
          >
            <p className="font-medium truncate">✓ {toast.subject}</p>
            <p className="text-gray-400 truncate">{toast.from}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
