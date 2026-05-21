import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getEmailsWithoutToolCalls, insertToolCall, countEmails } from '../services/db'
import { processEmail } from '../services/agentService'

const router = Router()

interface AgentStatus {
  processed: number
  total: number
  done: boolean
  errors: number
}

const status: AgentStatus = { processed: 0, total: 0, done: true, errors: 0 }

async function runAgentBackground(): Promise<void> {
  const emails = getEmailsWithoutToolCalls()
  status.total = countEmails()
  status.processed = status.total - emails.length
  status.done = false
  status.errors = 0

  const BATCH_SIZE = 5

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async email => {
        const results = await processEmail(email)
        for (const result of results) {
          insertToolCall({
            id: uuidv4(),
            email_id: email.id,
            tool_name: result.toolName,
            arguments: JSON.stringify(result.arguments),
            rationale: result.rationale,
            mock_result: null,
          })
        }
        status.processed++
      })
    )

    if (i + BATCH_SIZE < emails.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  status.done = true
}

router.post('/run', (_req: Request, res: Response) => {
  if (!status.done) {
    res.status(409).json({ error: 'Agent is already running.' })
    return
  }

  runAgentBackground().catch(err => {
    console.error('Agent run error:', err)
    status.done = true
    status.errors++
  })

  res.json({ success: true, message: 'Agent run started.' })
})

router.get('/status', (_req: Request, res: Response) => {
  res.json(status)
})

export default router
