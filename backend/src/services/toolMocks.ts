import { ToolName } from '../types'

function hash(toolCallId: string): string {
  return toolCallId.slice(-6).toUpperCase()
}

function slaDueDate(): string {
  const d = new Date()
  d.setHours(d.getHours() + 24)
  return d.toISOString()
}

export function executeMockTool(
  toolName: ToolName,
  toolCallId: string,
  args: Record<string, unknown>
): Record<string, unknown> {
  const h = hash(toolCallId)

  switch (toolName) {
    case 'schedule_meeting':
      return {
        meetingId: `MTG-${h}`,
        calendarLink: `https://calendar.example.com/mtg/${h}`,
        status: 'scheduled',
        confirmationSent: true,
        ...args,
      }

    case 'draft_response': {
      const body = typeof args.body === 'string' ? args.body : ''
      return {
        draftId: `DFT-${h}`,
        status: 'draft_saved',
        preview: body.slice(0, 150),
        ...args,
      }
    }

    case 'escalate_to_manager':
      return {
        ticketId: `ESC-${h}`,
        status: 'escalated',
        assignedTo: (args.suggested_owner as string) || 'manager@company.com',
        slaDueDate: slaDueDate(),
        ...args,
      }

    case 'create_task':
      return {
        taskId: `TSK-${h}`,
        status: 'created',
        projectBoard: 'Inbox Actions',
        ...args,
      }

    case 'flag_urgent':
      return {
        flagId: `URG-${h}`,
        status: 'flagged',
        notifiedUsers: ['user@company.com'],
        ...args,
      }

    case 'archive_no_action':
      return {
        archiveId: `ARC-${h}`,
        status: 'archived',
        folder: (args.category as string) || 'other',
        ...args,
      }

    default:
      return {
        status: 'error',
        message: `Unknown tool: ${toolName}`,
      }
  }
}
