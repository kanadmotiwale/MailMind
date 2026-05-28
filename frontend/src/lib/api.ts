import axios from 'axios'
import type { AgentStatus, Email, EmailsResponse, UploadResponse } from '../types'

const client = axios.create({ baseURL: '/api' })

export async function uploadCSV(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post<UploadResponse>('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function runAgent(): Promise<{ success: boolean; message: string }> {
  const { data } = await client.post('/agent/run')
  return data
}

export async function getAgentStatus(): Promise<AgentStatus> {
  const { data } = await client.get<AgentStatus>('/agent/status')
  return data
}

export async function getEmails(tool?: string, search?: string): Promise<EmailsResponse> {
  const params: Record<string, string> = {}
  if (tool) params.tool = tool
  if (search) params.search = search
  const { data } = await client.get<EmailsResponse>('/emails', { params })
  return data
}

export async function getEmail(id: string): Promise<Email> {
  const { data } = await client.get<Email>(`/emails/${id}`)
  return data
}

export async function executeTool(
  toolCallId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data } = await client.post<Record<string, unknown>>(`/tools/${toolName}/execute`, {
    toolCallId,
    arguments: args,
  })
  return data
}
