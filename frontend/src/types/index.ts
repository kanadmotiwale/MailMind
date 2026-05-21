export interface Email {
  id: string
  from_addr: string
  to_addr: string
  cc: string
  subject: string
  date: string
  body: string
  toolCalls: ToolCall[]
}

export interface ToolCall {
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

export interface AgentStatus {
  processed: number
  total: number
  done: boolean
  errors: number
}

export interface UploadResponse {
  success: boolean
  count: number
  message: string
}

export interface EmailsResponse {
  emails: Email[]
  total: number
}
