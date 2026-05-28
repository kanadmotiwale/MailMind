# MailMind

An AI-powered email triage assistant built as a full-stack web application.

Live frontend: https://mail-mind-eight.vercel.app  
Live backend: https://mailmind-wkvj.onrender.com

The backend runs on Render's free tier, so the first request after a period of inactivity may take around 30 seconds to wake up.

---

## What it does

You upload a CSV of emails and an AI agent reads each one and recommends what to do with it — schedule a meeting, draft a reply, escalate to a manager, create a task, flag it as urgent, or archive it. The results show up in a split-panel inbox where you can browse the suggestions and execute them.

---

## Tech stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, TanStack Query
- Backend: Node.js, Express, TypeScript
- Database: SQLite (better-sqlite3)
- AI: Groq API with llama-3.3-70b-versatile, using function calling

---

## Running locally

You need Node.js 18+ and a free Groq API key from console.groq.com (no credit card required).

Clone the repo:

```
git clone https://github.com/kanadmotiwale/MailMind.git
cd MailMind
```

Start the backend:

```
cd backend
npm install
cp .env.example .env
```

Open `.env` and add your Groq API key, then:

```
npm run dev
```

Start the frontend in a separate terminal:

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, upload `data/sample_emails.csv`, and click Upload and Analyze Emails.

---

## Sample data

A curated set of 180 emails from the Enron corpus is included at `data/sample_emails.csv`. The emails were selected using keyword matching to get balanced coverage across all six triage categories.

| Category | Emails |
|---|---|
| Archive (no action) | 40 |
| Schedule meeting | 30 |
| Draft response | 30 |
| Create task | 30 |
| Flag urgent | 25 |
| Escalate to manager | 25 |

To regenerate from a local copy of the Enron dataset, download the maildir from https://www.cs.cmu.edu/~enron/enron_mail_20150507.tar.gz, extract it to the project root, and run:

```
python scripts/extract_emails.py
```

---

## How the AI triage works

Each email is sent to `llama-3.3-70b-versatile` via Groq with `tool_choice: required`, which forces the model to call at least one tool per email. The model extracts real values from the email — actual addresses, subjects, deadlines — rather than filling in placeholders.

The six tools available to the model are:

- schedule_meeting — for emails that propose or request a meeting time
- draft_response — for emails that ask a question or expect a reply
- escalate_to_manager — for complaints, legal or financial risk, or anything needing management attention
- create_task — for emails with action items or deliverables
- flag_urgent — for time-sensitive emails or hard deadlines
- archive_no_action — for newsletters, FYI emails, and announcements

Emails are processed one at a time with a short delay between requests to stay within the free tier rate limit. Processing 180 emails takes around 6 minutes.

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| POST | /api/upload | Upload a CSV (multipart/form-data, field name: file) |
| POST | /api/agent/run | Start the triage run |
| GET | /api/agent/status | Check run progress |
| GET | /api/emails | List emails, supports ?tool= and ?search= filters |
| GET | /api/emails/:id | Get a single email with its tool calls |
| POST | /api/tools/:toolName/execute | Execute a tool call |

Uploading a new CSV clears all existing emails and results before inserting the new data.

---

## Known limitations

Tool execution is mocked — results are simulated rather than connected to real services like Google Calendar or Jira. There is no user authentication, so anyone with access to the backend can see all emails. The inbox loads all emails at once, which would not scale well beyond a few hundred.
