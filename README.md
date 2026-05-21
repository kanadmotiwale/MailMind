# MailMind — AI-Powered Email Triage Assistant

## Overview

MailMind lets you upload a CSV of emails and runs an AI agent over every email to recommend which action to take — schedule a meeting, draft a reply, escalate to management, create a task, flag it as urgent, or archive it. Results are displayed in a two-panel inbox UI where you can browse AI recommendations and execute them with one click.

---

## Architecture

```
┌─────────────────────┐        ┌──────────────────────────────┐
│   Frontend (React)  │ ──────▶│   Backend API (Express)      │
│   Vite + Tailwind   │  /api  │   Node.js + TypeScript       │
│   localhost:5173    │ ◀───── │   localhost:3001             │
└─────────────────────┘        └────────┬─────────────────────┘
                                         │
                              ┌──────────┼──────────┐
                              ▼                     ▼
                     ┌────────────────┐   ┌──────────────────┐
                     │  SQLite DB     │   │  Anthropic API   │
                     │  emails.db     │   │  claude-sonnet   │
                     └────────────────┘   └──────────────────┘
```

---

## Prerequisites

- Node.js 18+
- Python 3.9+
- An [Anthropic API key](https://console.anthropic.com/)

---

## Setup & Run

### 1. Clone the repo

```bash
git clone <repo-url>
cd MailMind
```

### 2. Download & extract the Enron dataset

Download the Enron email dataset from:
https://www.cs.cmu.edu/~enron/enron_mail_20150507.tar.gz

Extract it so the `maildir/` folder is inside your project root, then run:

```bash
python scripts/extract_emails.py
```

This writes `data/sample_emails.csv` with 180 emails sampled from 10 mailboxes.

### 3. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and fill in your ANTHROPIC_API_KEY
npm run dev
```

### 4. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Open the app

Visit http://localhost:5173, upload `data/sample_emails.csv`, and click **Upload & Analyze Emails**.

---

## Using the App

1. **Upload** — drag and drop `data/sample_emails.csv` onto the Upload page. The UI validates column headers client-side before you submit.
2. **Analyze** — click "Upload & Analyze Emails". The backend processes emails in batches of 5, calling the Claude API for each. A live progress bar shows status.
3. **Browse** — navigate to the Inbox. Use the search bar and filter chips to find emails. Click any row to see the AI recommendations.
4. **Execute** — click "Execute" on any tool call card to run the mocked action and see a formatted result.

---

## AI Model

Model: `claude-sonnet-4-6`

Each email is submitted to Claude using the `tool_use` API with `tool_choice: { type: "any" }` to force at least one tool call per email. The system prompt (with prompt caching) is:

```
You are an intelligent email triage assistant. For every email you receive, you MUST call
at least one tool to handle it. You may call multiple tools if the email warrants multiple
actions.

Rules:
1. ALWAYS call at least one tool per email — never return without a tool call.
2. Include a "rationale" field in every tool call explaining in 1-2 sentences why you chose this tool.
3. If an email needs both a response AND escalation, call both tools.
4. Be precise with arguments — extract real values from the email.
5. For draft_response, write a complete, realistic reply body — not a placeholder.
6. Analyze the full email body carefully before deciding on tools.
```

---

## Tool Catalog

| Tool | Description | Color |
|------|-------------|-------|
| `schedule_meeting` | Book a meeting when the email proposes or requests scheduling | Blue |
| `draft_response` | Draft a full reply when the email expects a response | Purple |
| `escalate_to_manager` | Flag complaints, legal/financial risk, or management-level issues | Red |
| `create_task` | Create a follow-up task for action items or deliverables | Green |
| `flag_urgent` | Mark time-sensitive emails or those with hard deadlines | Amber |
| `archive_no_action` | Archive newsletters, FYI emails, or auto-generated notifications | Gray |

---

## Storage Choice

SQLite via `better-sqlite3` was chosen because:

- **Zero config** — no database server to install or run; the DB is a single file at `backend/data/emails.db`
- **Sufficient throughput** — synchronous writes are fine for a single-user triage tool processing ≤500 emails
- **Reviewer-friendly** — any reviewer can open the `.db` file with DB Browser for SQLite to inspect rows directly
- **Portable** — the DB travels with the project

---

## Re-upload Behavior

Each upload **clears all existing data** (both `emails` and `tool_calls` tables) before inserting the new CSV. This ensures a clean state. The README and upload confirmation message document this behavior. To preserve previous results, back up `backend/data/emails.db` first.

---

## API Contract

| Method | Path | Request | Response |
|--------|------|---------|----------|
| `POST` | `/api/upload` | `multipart/form-data` with `file` field | `{ success, count, message }` |
| `POST` | `/api/agent/run` | — | `{ success, message }` |
| `GET` | `/api/agent/status` | — | `{ processed, total, done, errors }` |
| `GET` | `/api/emails` | `?tool=&search=` | `{ emails[], total }` |
| `GET` | `/api/emails/:id` | — | `Email` with `toolCalls[]` |
| `POST` | `/api/tools/:toolName/execute` | `{ toolCallId, arguments }` | mock result object |

---

## Trade-offs & Known Limitations

- **Batch size 5, 1 s pause** — conservative rate-limit guard. For larger datasets, implement exponential backoff with retries.
- **Mock tool execution** — all tool results are deterministic mocks. Real implementations would call Google Calendar, Jira, Slack, etc.
- **No pagination** — the inbox loads all emails at once. For datasets >500 emails, add cursor-based pagination on the API and virtual scrolling on the frontend.
- **Single-user** — no authentication. Anyone with access to port 3001 can read all emails.
- **Background job in-process** — the agent run loop lives in the Express process. For production, move it to a job queue (BullMQ, etc.).

---

## Future Improvements

- **Real integrations** — connect to Google Calendar, Outlook, Jira, Linear, and Slack for genuine tool execution
- **Authentication** — add OAuth so each user sees only their own emails
- **Pagination + virtual scroll** — handle arbitrarily large inboxes efficiently
- **Streaming progress** — replace polling with Server-Sent Events for real-time updates
- **Fine-tuning** — collect user feedback on tool selections and fine-tune the model
- **Multi-model support** — route simple emails to Haiku for cost savings, complex ones to Opus
