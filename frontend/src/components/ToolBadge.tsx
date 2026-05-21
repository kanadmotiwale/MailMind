import type { ToolName } from '../types'

const TOOL_CONFIG: Record<ToolName, { label: string; icon: string; classes: string }> = {
  schedule_meeting: {
    label: 'Meeting',
    icon: '📅',
    classes: 'bg-blue-100 text-blue-800',
  },
  draft_response: {
    label: 'Draft',
    icon: '✉️',
    classes: 'bg-purple-100 text-purple-800',
  },
  escalate_to_manager: {
    label: 'Escalate',
    icon: '⚠️',
    classes: 'bg-red-100 text-red-800',
  },
  create_task: {
    label: 'Task',
    icon: '✅',
    classes: 'bg-green-100 text-green-800',
  },
  flag_urgent: {
    label: 'Urgent',
    icon: '🚨',
    classes: 'bg-amber-100 text-amber-800',
  },
  archive_no_action: {
    label: 'Archive',
    icon: '📁',
    classes: 'bg-gray-100 text-gray-700',
  },
  agent_error: {
    label: 'Error',
    icon: '❌',
    classes: 'bg-red-200 text-red-900',
  },
}

export function getToolConfig(toolName: ToolName) {
  return TOOL_CONFIG[toolName] ?? TOOL_CONFIG.agent_error
}

interface Props {
  toolName: ToolName
}

export function ToolBadge({ toolName }: Props) {
  const { icon, label, classes } = getToolConfig(toolName)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      <span>{icon}</span>
      {label}
    </span>
  )
}
