import type { ToolName } from '../types'

const TOOL_CONFIG: Record<ToolName, { label: string; classes: string }> = {
  schedule_meeting: {
    label: 'Meeting',
    classes: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  },
  draft_response: {
    label: 'Draft',
    classes: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  },
  escalate_to_manager: {
    label: 'Escalate',
    classes: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  },
  create_task: {
    label: 'Task',
    classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  },
  flag_urgent: {
    label: 'Urgent',
    classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  },
  archive_no_action: {
    label: 'Archive',
    classes: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  },
  agent_error: {
    label: 'Error',
    classes: 'bg-red-50 text-red-600 ring-1 ring-red-100',
  },
}

export function getToolConfig(toolName: ToolName) {
  return TOOL_CONFIG[toolName] ?? TOOL_CONFIG.agent_error
}

interface Props {
  toolName: ToolName
}

export function ToolBadge({ toolName }: Props) {
  const { label, classes } = getToolConfig(toolName)
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}
