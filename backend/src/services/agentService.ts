import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { Email, ToolCallResult, ToolName } from '../types'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

const SYSTEM_PROMPT = `You are an intelligent email triage assistant. For every email you receive, you MUST call at least one function to handle it. You may call multiple functions if the email warrants multiple actions.

Rules:
1. ALWAYS call at least one function per email — never return without a function call.
2. Include a "rationale" field in every function call explaining in 1-2 sentences why you chose this action.
3. If an email needs both a response AND escalation, call both functions.
4. Be precise with arguments — extract real values from the email (actual recipient addresses, actual subjects, etc).
5. For draft_response, write a complete, realistic reply body — not a placeholder.
6. Analyze the full email body carefully before deciding on functions.`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FUNCTION_DECLARATIONS: any[] = [
  {
    name: 'schedule_meeting',
    description:
      'Book a meeting when the email proposes one, requests a time, or needs scheduling coordination.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        attendees: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'Email addresses of attendees',
        },
        proposed_time: {
          type: SchemaType.STRING,
          description: 'Proposed meeting time in ISO 8601 or natural language',
        },
        duration_minutes: {
          type: SchemaType.NUMBER,
          description: 'Expected duration in minutes',
        },
        subject: {
          type: SchemaType.STRING,
          description: 'Meeting title/subject',
        },
        rationale: {
          type: SchemaType.STRING,
          description: '1-2 sentence explanation of why this function was chosen',
        },
      },
      required: ['attendees', 'subject', 'rationale'],
    },
  },
  {
    name: 'draft_response',
    description:
      'Draft a reply when the email asks a question, requests information, or expects a response.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        to: { type: SchemaType.STRING, description: 'Recipient email address' },
        subject: { type: SchemaType.STRING, description: 'Email subject with Re: prefix' },
        body: {
          type: SchemaType.STRING,
          description: 'Full drafted reply body (professional tone)',
        },
        tone: {
          type: SchemaType.STRING,
          description: 'Tone of the reply: professional, apologetic_professional, friendly, or formal',
        },
        rationale: {
          type: SchemaType.STRING,
          description: '1-2 sentence explanation of why this function was chosen',
        },
      },
      required: ['to', 'subject', 'body', 'tone', 'rationale'],
    },
  },
  {
    name: 'escalate_to_manager',
    description:
      'Flag emails showing client dissatisfaction, complaints, legal risk, financial concerns, or situations requiring management attention.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        reason: {
          type: SchemaType.STRING,
          description: 'Detailed reason for escalation',
        },
        priority: {
          type: SchemaType.STRING,
          description: 'Escalation priority level: low, medium, high, or critical',
        },
        original_email_id: {
          type: SchemaType.STRING,
          description: 'ID of the email being escalated',
        },
        suggested_owner: {
          type: SchemaType.STRING,
          description: 'Suggested manager or owner email',
        },
        rationale: {
          type: SchemaType.STRING,
          description: '1-2 sentence explanation of why this function was chosen',
        },
      },
      required: ['reason', 'priority', 'original_email_id', 'rationale'],
    },
  },
  {
    name: 'create_task',
    description:
      'Create a follow-up task when the email contains action items, deliverables, or things that need to be done.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: 'Short task title' },
        due_date: {
          type: SchemaType.STRING,
          description: 'Due date in ISO 8601 or natural language',
        },
        assignee: {
          type: SchemaType.STRING,
          description: 'Person responsible for the task',
        },
        notes: {
          type: SchemaType.STRING,
          description: 'Additional context or details for the task',
        },
        rationale: {
          type: SchemaType.STRING,
          description: '1-2 sentence explanation of why this function was chosen',
        },
      },
      required: ['title', 'rationale'],
    },
  },
  {
    name: 'flag_urgent',
    description:
      'Mark emails that are time-sensitive, have deadlines, or need attention soon but do not require an immediate reply.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        reason: { type: SchemaType.STRING, description: 'Why this email is urgent' },
        deadline: {
          type: SchemaType.STRING,
          description: 'The deadline or time constraint mentioned',
        },
        rationale: {
          type: SchemaType.STRING,
          description: '1-2 sentence explanation of why this function was chosen',
        },
      },
      required: ['reason', 'rationale'],
    },
  },
  {
    name: 'archive_no_action',
    description:
      'Archive newsletters, FYI emails, auto-generated notifications, announcements, or any email that requires no action.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        category: {
          type: SchemaType.STRING,
          description: 'Email category: newsletter, fyi, auto_generated, announcement, internal_update, or other',
        },
        reason: { type: SchemaType.STRING, description: 'Why no action is needed' },
        rationale: {
          type: SchemaType.STRING,
          description: '1-2 sentence explanation of why this function was chosen',
        },
      },
      required: ['category', 'reason', 'rationale'],
    },
  },
]

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-lite',
  systemInstruction: SYSTEM_PROMPT,
  tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolConfig: { functionCallingConfig: { mode: 'ANY' as any } },
})

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function callWithRetry(emailText: string, maxRetries = 4): Promise<ReturnType<typeof model.generateContent>> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await model.generateContent(emailText)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const is429 = msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('quota')
      if (is429 && attempt < maxRetries - 1) {
        // Extract retry delay from error message if present, otherwise use exponential backoff
        const retryMatch = msg.match(/retry in ([\d.]+)s/i)
        const waitMs = retryMatch ? Math.ceil(parseFloat(retryMatch[1]) * 1000) + 500 : (2 ** attempt) * 5000
        console.log(`Rate limited. Waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}...`)
        await sleep(waitMs)
        continue
      }
      throw err
    }
  }
  throw new Error('Max retries exceeded')
}

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

    const result = await callWithRetry(emailText)
    const response = result.response

    const results: ToolCallResult[] = []

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.functionCall) {
        const args = part.functionCall.args as Record<string, unknown>
        const rationale = typeof args.rationale === 'string' ? args.rationale : ''
        results.push({
          toolName: part.functionCall.name as ToolName,
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
            rationale: 'No function calls returned by model despite mode: ANY',
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
