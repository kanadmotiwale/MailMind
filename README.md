# MailMind — AI-Powered Email Triage Assistant

## Live Demo

| Service | URL |
|---------|-----|
| **Frontend** | https://mail-mind-eight.vercel.app |
| **Backend API** | https://mailmind-wkvj.onrender.com |

> The backend is hosted on Render's free tier — the first request after a period of inactivity may take ~30 seconds to wake up.

---

## Overview

MailMind lets you upload a CSV of emails and runs an AI agent over every email to recommend which action to take — schedule a meeting, draft a reply, escalate to management, create a task, flag it as urgent, or archive it. Results are displayed in a two-panel inbox UI where you can browse AI recommendations and execute them with one click.

---

## Architecture

```
┌─────────────────────┐        ┌──────────────────────────────┐
│   Frontend (React)  │ ──────▶│   Backend API (Express)      │
│   Vite + Tailwind   │  /api  │   Node.js + TypeScript       │
│ mail-mind-eight.    │ ◀───── │ mailmind-wkvj.onrender.com   │
└─────────────────────┘        └────────┬─────────────────────┘
                                         │
                              ┌──────────┼──────────┐
                              ▼                     ▼
                     ┌────────────────┐   ┌──────────────────┐
                     │  SQLite DB     │   │    Groq API      │
                     │  emails.db     │   │ llama-3.3-70b    │
                     └────────────────┘   └──────────────────┘
```

---

## Prerequisites

- Node.js 18+
- Python 3.9+
- A free [Groq API key](https://console.groq.com) (no credit card required)

---

## Setup & Run

### 1. Clone the repo

```bash
git clone https://github.com/kanadmotiwale/MailMind.git
cd MailMind
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and fill in your GROQ_API_KEY
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app

Visit http://localhost:5173, upload `data/sample_emails.csv`, and click **Upload & Analyze Emails**.

---

## Sample Email Dataset

A curated set of 180 emails is included at `data/sample_emails.csv`, sourced from the [Enron email corpus](https://www.cs.cmu.edu/~enron/). The emails were selected using keyword-pattern matching to ensure balanced coverage across all 6 triage categories:

| Category | Count |
|----------|-------|
| `archive_no_action` | 40 |
| `schedule_meeting` | 30 |
| `draft_response` | 30 |
| `create_task` | 30 |
| `flag_urgent` | 25 |
| `escalate_to_manager` | 25 |

To regenerate from a local copy of the Enron dataset:

```bash
# Download from https://www.cs.cmu.edu/~enron/enron_mail_20150507.tar.gz
# Extract so maildir/ is in the project root, then:
python scripts/extract_emails.py
```

---

## Using the App

1. **Upload** — drag and drop `data/sample_emails.csv` onto the Upload page
2. **Analyze** — click "Upload & Analyze Emails". The backend calls the Groq API for each email sequentially. A live progress bar shows status. Processing 180 emails takes ~6 minutes on the free tier.
3. **Browse** — navigate to the Inbox. Use the search bar and filter chips (Meeting, Draft, Escalate, Task, Urgent, Archive) to find emails. Click any row to open the detail panel.
4. **Execute** — click "Execute" on any tool call card to run the action and see a formatted result.

---

## AI Model

Model: `llama-3.3-70b-versatile` via [Groq](https://console.groq.com)

Each email is submitted using the chat completions API with `tool_choice: "required"` to force at least one tool call per email. The system prompt instructs the model to extract real values from the email (actual addresses, subjects, deadlines) and write complete, realistic draft responses.

Groq was chosen for its generous free tier (14,400 requests/day, 30 RPM) and fast inference — no credit card or billing setup required.

---

## Tool Catalog

| Tool | Triggered when… | Badge color |
|------|-----------------|-------------|
| `schedule_meeting` | Email proposes or requests a meeting time | Blue |
| `draft_response` | Email asks a question or expects a reply | Purple |
| `escalate_to_manager` | Complaint, legal/financial risk, or management-level issue | Red |
| `create_task` | Email contains action items or deliverables | Green |
| `flag_urgent` | Time-sensitive email or hard deadline mentioned | Amber |
| `archive_no_action` | Newsletter, FYI, announcement, or no reply needed | Gray |

---

## Storage

SQLite via `better-sqlite3` — no database server needed. The DB is a single file at `backend/data/emails.db`.

Each upload **clears all existing data** before inserting the new CSV, ensuring a clean slate. To preserve previous results, back up `emails.db` first.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload` | Upload a CSV (`multipart/form-data`, field `file`) |
| `POST` | `/api/agent/run` | Start the AI triage run |
| `GET` | `/api/agent/status` | Poll run progress `{ processed, total, done, errors }` |
| `GET` | `/api/emails` | List emails (`?tool=&search=`) |
| `GET` | `/api/emails/:id` | Get a single email with tool calls |
| `POST` | `/api/tools/:toolName/execute` | Execute a tool call (returns mock result) |

---

## Trade-offs & Known Limitations

- **Sequential processing** — emails are processed one at a time with a 2s gap to respect the free-tier rate limit (30 RPM). For a paid key, batch processing could reduce total time significantly.
- **Mock tool execution** — all tool results are deterministic mocks. Real implementations would call Google Calendar, Jira, Slack, etc.
- **No pagination** — the inbox loads all emails at once. For datasets >500 emails, add cursor-based pagination and virtual scrolling.
- **Single-user** — no authentication. For production, add user sessions so each person sees only their own emails.
- **Background job in-process** — the agent run loop runs inside the Express process. For production, move it to a job queue (BullMQ, etc.).

---

## Future Improvements

- **Real integrations** — connect to Google Calendar, Outlook, Jira, and Slack for genuine tool execution
- **Authentication** — OAuth so each user sees only their own emails
- **Streaming progress** — replace polling with Server-Sent Events for real-time updates
- **Pagination + virtual scroll** — handle arbitrarily large inboxes
- **Multi-model routing** — send simple emails to a smaller/cheaper model, complex ones to a larger one
