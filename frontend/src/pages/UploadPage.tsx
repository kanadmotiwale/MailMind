import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { DropZone } from '../components/DropZone'
import { ProgressBar } from '../components/ProgressBar'
import { uploadCSV, getEmails } from '../lib/api'
import { useAgentRun } from '../hooks/useAgentRun'
import type { ToolName } from '../types'

const TOOL_LABELS: Record<ToolName, string> = {
  schedule_meeting: 'Meetings',
  draft_response: 'Drafts',
  escalate_to_manager: 'Escalations',
  create_task: 'Tasks',
  flag_urgent: 'Urgent',
  archive_no_action: 'Archived',
  agent_error: 'Errors',
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

  useEffect(() => {
    if (!status?.lastProcessed) return
    if (status.processed === prevProcessed.current) return
    prevProcessed.current = status.processed
    const id = ++toastCounter.current
    setToasts(t => [...t.slice(-3), { id, ...status.lastProcessed! }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [status?.processed, status?.lastProcessed])

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
    <div className="flex-1 bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header text */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Triage your inbox with AI</h1>
          <p className="text-slate-500 text-base">
            Upload a CSV of emails and let the AI agent analyze each one —<br />
            recommending the right action in seconds.
          </p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { step: '1', title: 'Upload CSV', desc: 'Drop your exported email CSV with subject, sender, and body.' },
            { step: '2', title: 'AI Analyzes', desc: 'Claude reads each email and picks the best action to take.' },
            { step: '3', title: 'Review & Act', desc: 'Browse suggestions, execute actions, and clear your inbox.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="bg-slate-50 rounded-lg p-4 border border-slate-100 text-center">
              <div className="w-7 h-7 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center mx-auto mb-2">
                {step}
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-1">{title}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-5">
          {!isProcessing && !isDone && (
            <>
              <DropZone onFile={handleFile} />

              {(uploadError || agentError) && (
                <div className="bg-red-50 border border-red-200 rounded-md px-4 py-2.5 text-red-600 text-sm">
                  {uploadError || agentError}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!selectedFile || uploading}
                className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {uploading ? 'Uploading...' : 'Upload & Analyze Emails'}
              </button>
            </>
          )}

          {isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm justify-center">
                <span className="text-emerald-600 font-medium">Uploaded</span>
                <span className="text-slate-300">→</span>
                <span className="text-blue-600 font-medium flex items-center gap-1.5">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Analyzing
                </span>
                <span className="text-slate-300">→</span>
                <span className="text-slate-400">Complete</span>
              </div>
              <ProgressBar value={status?.processed ?? 0} max={status?.total ?? 1} />
              <p className="text-slate-500 text-sm text-center">
                {status ? `Analyzing email ${status.processed} of ${status.total}...` : 'Starting...'}
              </p>
            </div>
          )}

          {isDone && status && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm justify-center">
                {['Uploaded', 'Analyzed', 'Complete'].map((s, i) => (
                  <span key={s} className="flex items-center gap-2">
                    {i > 0 && <span className="text-slate-300">→</span>}
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {s}
                    </span>
                  </span>
                ))}
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 text-center">
                <p className="text-slate-800 font-semibold">
                  {status.total} emails · {totalToolCalls} actions suggested
                </p>
                {Object.keys(toolBreakdown).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                    {(Object.entries(toolBreakdown) as [ToolName, number][])
                      .filter(([k]) => k !== 'agent_error')
                      .sort((a, b) => b[1] - a[1])
                      .map(([tool, count]) => (
                        <span key={tool} className="bg-white border border-slate-200 text-slate-600 text-xs px-2.5 py-1 rounded-md">
                          {TOOL_LABELS[tool]}: {count}
                        </span>
                      ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate('/inbox')}
                className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
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
          <div key={toast.id} className="bg-slate-800 text-white text-xs rounded-lg px-4 py-2.5 shadow-lg max-w-xs">
            <p className="font-medium truncate">{toast.subject}</p>
            <p className="text-slate-400 truncate mt-0.5">{toast.from}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
