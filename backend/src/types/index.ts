export interface Email {
  id: string
  from_addr: string
  to_addr: string
  cc: string
  subject: string
  date: string
  body: string
  created_at?: string
}

export interface ToolCall {
  id: string
  email_id: string
  tool_name: ToolName
  arguments: string
  rationale: string
  mock_result: string | null
  created_at?: string
}

export interface EmailWithToolCalls extends Email {
  toolCalls: ParsedToolCall[]
}

export interface ParsedToolCall {
  id: string
  email_id: string
  tool_name: ToolName
  arguments: Record<string, unknown>
  rationale: string
  mock_result: Record<string, unknown> | null
}

export type ToolName =
  | 'schedule_meeting'
  | 'draft_response'
  | 'escalate_to_manager'
  | 'create_task'
  | 'flag_urgent'
  | 'archive_no_action'
  | 'agent_error'

export interface ToolCallResult {
  toolName: ToolName
  arguments: Record<string, unknown>
  rationale: string
}
