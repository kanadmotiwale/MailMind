import Anthropic from '@anthropic-ai/sdk'
import { Email, ToolCallResult, ToolName } from '../types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are an intelligent email triage assistant. For every email you receive, you MUST call at least one tool to handle it. You may call multiple tools if the email warrants multiple actions.

Rules:
1. ALWAYS call at least one tool per email — never return without a tool call.
2. Include a "rationale" field in every tool call explaining in 1-2 sentences why you chose this tool.
3. If an email needs both a response AND escalation, call both tools.
4. Be precise with arguments — extract real values from the email (actual recipient addresses, actual subjects, etc).
5. For draft_response, write a complete, realistic reply body — not a placeholder.
6. Analyze the full email body carefully before deciding on tools.`

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'schedule_meeting',
    description:
      'Book a meeting when the email proposes one, requests a time, or needs scheduling coordination.',
    input_schema: {
      type: 'object',
      properties: {
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Email addresses of attendees',
        },
        proposed_time: {
          type: 'string',
          description: 'Proposed meeting time in ISO 8601 or natural language',
        },
        duration_minutes: {
          type: 'number',
          description: 'Expected duration in minutes',
        },
        subject: {
          type: 'string',
          description: 'Meeting title/subject',
        },
        rationale: {
          type: 'string',
          description: '1-2 sentence explanation of why this tool was chosen',
        },
      },
      required: ['attendees', 'subject', 'rationale'],
    },
  },
  {
    name: 'draft_response',
    description:
      'Draft a reply when the email asks a question, requests information, or expects a response.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject with Re: prefix' },
        body: {
          type: 'string',
          description: 'Full drafted reply body (professional tone)',
        },
        tone: {
          type: 'string',
          enum: ['professional', 'apologetic_professional', 'friendly', 'formal'],
          description: 'Tone of the reply',
        },
        rationale: {
          type: 'string',
          description: '1-2 sentence explanation of why this tool was chosen',
        },
      },
      required: ['to', 'subject', 'body', 'tone', 'rationale'],
    },
  },
  {
    name: 'escalate_to_manager',
    description:
      'Flag emails showing client dissatisfaction, complaints, legal risk, financial concerns, or situations requiring management attention.',
    input_schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Detailed reason for escalation',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Escalation priority level',
        },
        original_email_id: {
          type: 'string',
          description: 'ID of the email being escalated',
        },
        suggested_owner: {
          type: 'string',
          description: 'Suggested manager or owner email',
        },
        rationale: {
          type: 'string',
          description: '1-2 sentence explanation of why this tool was chosen',
        },
      },
      required: ['reason', 'priority', 'original_email_id', 'rationale'],
    },
  },
  {
    name: 'create_task',
    description:
      'Create a follow-up task when the email contains action items, deliverables, or things that need to be done.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short task title' },
        due_date: {
          type: 'string',
          description: 'Due date in ISO 8601 or natural language',
        },
        assignee: {
          type: 'string',
          description: 'Person responsible for the task',
        },
        notes: {
          type: 'string',
          description: 'Additional context or details for the task',
        },
        rationale: {
          type: 'string',
          description: '1-2 sentence explanation of why this tool was chosen',
        },
      },
      required: ['title', 'rationale'],
    },
  },
  {
    name: 'flag_urgent',
    description:
      'Mark emails that are time-sensitive, have deadlines, or need attention soon but do not require an immediate reply.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Why this email is urgent' },
        deadline: {
          type: 'string',
          description: 'The deadline or time constraint mentioned',
        },
        rationale: {
          type: 'string',
          description: '1-2 sentence explanation of why this tool was chosen',
        },
      },
      required: ['reason', 'rationale'],
    },
  },
  {
    name: 'archive_no_action',
    description:
      'Archive newsletters, FYI emails, auto-generated notifications, announcements, or any email that requires no action.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: [
            'newsletter',
            'fyi',
            'auto_generated',
            'announcement',
            'internal_update',
            'other',
          ],
          description: 'Email category',
        },
        reason: { type: 'string', description: 'Why no action is needed' },
        rationale: {
          type: 'string',
          description: '1-2 sentence explanation of why this tool was chosen',
        },
      },
      required: ['category', 'reason', 'rationale'],
    },
  },
]

export async function processEmail(email: Email): Promise<ToolCallResult[]> {
  try {
    const emailText = [
      `From: ${email.from_addr}`,
      `To: ${email.to_addr}`,
      `Subject: ${email.subject}`,
      `Date: ${email.date}`,
      '',
      email.body.slice(0, 4000),
    ].join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: TOOLS,
      tool_choice: { type: 'any' },
      messages: [{ role: 'user', content: emailText }],
    })

    const results: ToolCallResult[] = []
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const args = block.input as Record<string, unknown>
        const rationale = typeof args.rationale === 'string' ? args.rationale : ''
        results.push({
          toolName: block.name as ToolName,
          arguments: args,
          rationale,
        })
      }
    }

    return results.length > 0
      ? results
      : [
          {
            toolName: 'agent_error',
            arguments: {},
            rationale: 'No tool calls returned by model despite tool_choice: any',
          },
        ]
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return [
      {
        toolName: 'agent_error',
        arguments: {},
        rationale: message,
      },
    ]
  }
}
