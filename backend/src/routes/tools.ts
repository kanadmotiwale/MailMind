import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { getToolCallById, updateToolCallMockResult } from '../services/db'
import { executeMockTool } from '../services/toolMocks'
import { ToolName } from '../types'

const router = Router()

const ExecuteSchema = z.object({
  toolCallId: z.string().min(1),
  arguments: z.record(z.unknown()),
})

router.post('/:toolName/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ExecuteSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body.', details: parsed.error.flatten() })
      return
    }

    const { toolCallId, arguments: args } = parsed.data
    const toolName = req.params.toolName as ToolName

    const toolCall = getToolCallById(toolCallId)
    if (!toolCall) {
      res.status(404).json({ error: 'Tool call not found.' })
      return
    }

    const mockResult = executeMockTool(toolName, toolCallId, args)
    updateToolCallMockResult(toolCallId, mockResult)

    res.json(mockResult)
  } catch (err) {
    next(err)
  }
})

export default router
