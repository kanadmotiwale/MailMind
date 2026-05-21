import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { DropZone } from '../components/DropZone'
import { ProgressBar } from '../components/ProgressBar'
import { uploadCSV } from '../lib/api'
import { useAgentRun } from '../hooks/useAgentRun'
import { useEmails } from '../hooks/useEmails'

export function UploadPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { phase, status, error: agentError, startRun } = useAgentRun()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [_rowCount, setRowCount] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: emailsData } = useEmails()
  const totalToolCalls =
    emailsData?.emails.reduce((a, e) => a + e.toolCalls.length, 0) ?? 0

  const handleFile = useCallback((file: File, count: number) => {
    setSelectedFile(file)
    setRowCount(count)
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
      queryClient.invalidateQueries({ queryKey: ['emails'] })
    } catch (err) {
      setUploading(false)
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  const isProcessing = phase === 'uploading' || phase === 'analyzing'
  const isDone = phase === 'done'

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

          {isProcessing && status && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1.5 text-green-600 font-medium">
                  <span>✓</span> Uploaded
                </span>
                <span className="text-gray-300">→</span>
                <span className="flex items-center gap-1.5 text-indigo-600 font-medium animate-pulse">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  AI Analyzing...
                </span>
                <span className="text-gray-300">→</span>
                <span className="text-gray-400">Complete</span>
              </div>

              <ProgressBar value={status.processed} max={status.total} />

              <p className="text-gray-600 text-sm text-center">
                Analyzing email {status.processed} of {status.total}...
              </p>

              {status.errors > 0 && (
                <p className="text-amber-600 text-xs text-center">
                  {status.errors} error(s) encountered — processing continues.
                </p>
              )}
            </div>
          )}

          {isProcessing && !status && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 text-sm">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Starting analysis...
              </div>
              <ProgressBar value={0} max={1} />
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
                <p className="text-2xl font-bold text-indigo-700">
                  {status.total} emails processed · {totalToolCalls} tool calls suggested
                </p>
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
    </div>
  )
}
