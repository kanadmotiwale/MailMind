import { useState, useEffect, useRef } from 'react'
import { getAgentStatus, runAgent } from '../lib/api'
import type { AgentStatus } from '../types'

interface AgentRunState {
  phase: 'idle' | 'uploading' | 'analyzing' | 'done' | 'error'
  status: AgentStatus | null
  error: string | null
}

export function useAgentRun() {
  const [state, setState] = useState<AgentRunState>({
    phase: 'idle',
    status: null,
    error: null,
  })
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => {
    return () => stopPolling()
  }, [])

  async function startRun() {
    setState({ phase: 'uploading', status: null, error: null })
    try {
      await runAgent()
      setState(s => ({ ...s, phase: 'analyzing' }))

      pollRef.current = setInterval(async () => {
        try {
          const status = await getAgentStatus()
          setState(s => ({ ...s, status }))
          if (status.done) {
            stopPolling()
            setState(s => ({ ...s, phase: 'done', status }))
          }
        } catch {
          // keep polling on transient errors
        }
      }, 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setState({ phase: 'error', status: null, error: message })
    }
  }

  function reset() {
    stopPolling()
    setState({ phase: 'idle', status: null, error: null })
  }

  return { ...state, startRun, reset }
}
