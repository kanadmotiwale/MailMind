import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { Email, ToolCall, EmailWithToolCalls, ParsedToolCall } from '../types'

const DATA_DIR = path.join(__dirname, '../../data')
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const DB_PATH = path.join(DATA_DIR, 'emails.db')
const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS emails (
    id TEXT PRIMARY KEY,
    from_addr TEXT NOT NULL,
    to_addr TEXT,
    cc TEXT,
    subject TEXT,
    date TEXT,
    body TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tool_calls (
    id TEXT PRIMARY KEY,
    email_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    arguments TEXT NOT NULL,
    rationale TEXT,
    mock_result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email_id) REFERENCES emails(id)
  );
`)

export function insertEmail(email: Email): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO emails (id, from_addr, to_addr, cc, subject, date, body)
    VALUES (@id, @from_addr, @to_addr, @cc, @subject, @date, @body)
  `)
  stmt.run(email)
}

export function insertToolCall(toolCall: Omit<ToolCall, 'created_at'>): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO tool_calls (id, email_id, tool_name, arguments, rationale, mock_result)
    VALUES (@id, @email_id, @tool_name, @arguments, @rationale, @mock_result)
  `)
  stmt.run(toolCall)
}

export function clearAllData(): void {
  db.exec('DELETE FROM tool_calls; DELETE FROM emails;')
}

export function getEmails(tool?: string, search?: string): EmailWithToolCalls[] {
  let query = `SELECT DISTINCT e.* FROM emails e`
  const params: string[] = []

  if (tool) {
    query += ` INNER JOIN tool_calls tc ON e.id = tc.email_id AND tc.tool_name = ?`
    params.push(tool)
  }

  if (search) {
    query += tool ? ` WHERE` : ` LEFT JOIN tool_calls tc2 ON e.id = tc2.email_id WHERE`
    query += ` (LOWER(e.subject) LIKE ? OR LOWER(e.from_addr) LIKE ?)`
    const searchParam = `%${search.toLowerCase()}%`
    params.push(searchParam, searchParam)
  }

  query += ` ORDER BY e.created_at DESC`

  const emails = db.prepare(query).all(...params) as Email[]
  return emails.map(email => attachToolCalls(email))
}

export function getEmailById(id: string): EmailWithToolCalls | null {
  const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(id) as Email | undefined
  if (!email) return null
  return attachToolCalls(email)
}

function attachToolCalls(email: Email): EmailWithToolCalls {
  const toolCallRows = db
    .prepare('SELECT * FROM tool_calls WHERE email_id = ? ORDER BY created_at ASC')
    .all(email.id) as ToolCall[]

  const toolCalls: ParsedToolCall[] = toolCallRows.map(tc => ({
    id: tc.id,
    email_id: tc.email_id,
    tool_name: tc.tool_name,
    arguments: JSON.parse(tc.arguments),
    rationale: tc.rationale,
    mock_result: tc.mock_result ? JSON.parse(tc.mock_result) : null,
  }))

  return { ...email, toolCalls }
}

export function getToolCallById(id: string): ToolCall | null {
  return (db.prepare('SELECT * FROM tool_calls WHERE id = ?').get(id) as ToolCall) || null
}

export function updateToolCallMockResult(id: string, mockResult: Record<string, unknown>): void {
  db.prepare('UPDATE tool_calls SET mock_result = ? WHERE id = ?').run(
    JSON.stringify(mockResult),
    id
  )
}

export function countEmails(): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM emails').get() as { count: number }
  return row.count
}

export function countEmailsWithToolCalls(): number {
  const row = db
    .prepare('SELECT COUNT(DISTINCT email_id) as count FROM tool_calls')
    .get() as { count: number }
  return row.count
}

export function countToolCalls(): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM tool_calls').get() as { count: number }
  return row.count
}

export function getEmailsWithoutToolCalls(): Email[] {
  return db
    .prepare(
      `SELECT e.* FROM emails e
       LEFT JOIN tool_calls tc ON e.id = tc.email_id
       WHERE tc.id IS NULL`
    )
    .all() as Email[]
}

export { db }
