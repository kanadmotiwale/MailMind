"""
Extract a curated sample of 180 emails from the Enron dataset, balanced
across categories that trigger each AI triage tool.

Usage:
  python scripts/extract_emails.py

Configure ENRON_DIR below to point at your local maildir/ folder.
"""

import csv
import email
import email.policy
import os
import random
import re
import sys
from pathlib import Path

ENRON_DIR = "./maildir"
OUTPUT_PATH = "./data/sample_emails.csv"
TARGET_COUNT = 180
MAX_BODY_CHARS = 3000

# How many emails to target per tool category
CATEGORY_TARGETS = {
    "schedule_meeting":     30,
    "draft_response":       30,
    "escalate_to_manager":  25,
    "create_task":          30,
    "flag_urgent":          25,
    "archive_no_action":    40,
}

# Keyword patterns for each category (checked against subject + body, lowercased)
CATEGORY_PATTERNS = {
    "schedule_meeting": [
        r"\bmeeting\b", r"\bschedule\b", r"\bcall\b", r"\bconference\b",
        r"\bavailable\b", r"\bwhen can\b", r"\bset up a\b", r"\bjoin us\b",
        r"\bjoin me\b", r"\bdiscuss\b", r"\bcalendar\b", r"\bappointment\b",
        r"\b(monday|tuesday|wednesday|thursday|friday)\b.*\b(am|pm)\b",
        r"\b\d+(:\d+)?\s*(am|pm)\b",
    ],
    "draft_response": [
        r"\?",
        r"\bplease (let me know|advise|confirm|respond|reply|clarify)\b",
        r"\bcan you\b", r"\bcould you\b", r"\bwould you\b",
        r"\bwhat (do you think|is your|are your)\b",
        r"\byour (thoughts|feedback|opinion|input)\b",
        r"\bwaiting (for|on) your\b",
        r"\bget back to (me|us)\b",
        r"\blooking forward to (hearing|your)\b",
        r"\bneed your\b",
    ],
    "escalate_to_manager": [
        r"\bunacceptable\b", r"\bcomplaint\b", r"\bdissatisfied\b",
        r"\blegal\b", r"\blawsuit\b", r"\bthreat\b", r"\bescalat\b",
        r"\bfraud\b", r"\bviolat\b", r"\bconcern(ed|s)?\b",
        r"\bnot happy\b", r"\bserious issue\b", r"\bsignificant (risk|loss|problem)\b",
        r"\bregulat\b", r"\bcomplianc\b", r"\baudit\b",
        r"\bmillion(s)?\b.*\b(loss|risk|exposure)\b",
        r"\bcontract (breach|dispute|terminat)\b",
    ],
    "create_task": [
        r"\bplease (send|prepare|review|update|complete|submit|provide|forward|check)\b",
        r"\baction (item|required|needed)\b",
        r"\bfollow[- ]?up\b",
        r"\bdeadline\b", r"\bdue (by|date|on)\b",
        r"\bneed to\b", r"\bhave to\b",
        r"\bby (end of|tomorrow|friday|monday|next week)\b",
        r"\bdeliver\b", r"\bassign\b", r"\bresponsib\b",
        r"\btask\b", r"\bitem(s)? to (address|complete|handle)\b",
    ],
    "flag_urgent": [
        r"\burgent\b", r"\basap\b", r"\bas soon as possible\b",
        r"\bimmediately\b", r"\btime.?sensitive\b",
        r"\btoday\b.*\b(must|need|require)\b",
        r"\bcritical\b", r"\bemergency\b", r"\bpriority\b",
        r"\bdeadline (is|was|has passed)\b",
        r"\bno later than\b",
        r"\bright away\b", r"\bby end of (day|business)\b",
    ],
    "archive_no_action": [
        r"\bfyi\b", r"\bfor your (information|reference|records)\b",
        r"\bno (action|response) (required|needed|necessary)\b",
        r"\bjust (wanted to|letting you know|a heads[ -]?up)\b",
        r"\bannouncement\b", r"\bnewsletter\b", r"\bupdate\b.*\bno action\b",
        r"\bheads[ -]?up\b", r"\breminder\b",
        r"\bthought you (should|might|would) know\b",
        r"\bpassing along\b", r"\bpassing this along\b",
        r"\bforward(ing|ed) for your\b",
    ],
}


def strip_bad_chars(text: str) -> str:
    text = text.replace("\x00", "")
    return text.encode("utf-8", errors="ignore").decode("utf-8")


def parse_email_file(path: Path) -> dict | None:
    try:
        raw = path.read_bytes()
        msg = email.message_from_bytes(raw, policy=email.policy.compat32)

        msg_id = strip_bad_chars(msg.get("Message-ID", "") or "").strip()
        if not msg_id:
            msg_id = str(path)

        from_addr = strip_bad_chars(msg.get("From", "") or "").strip()
        to_addr   = strip_bad_chars(msg.get("To", "") or "").strip()
        cc        = strip_bad_chars(msg.get("X-cc", "") or msg.get("Cc", "") or "").strip()
        subject   = strip_bad_chars(msg.get("Subject", "") or "").strip()
        date      = strip_bad_chars(msg.get("Date", "") or "").strip()

        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    payload = part.get_payload(decode=True)
                    if payload:
                        body = payload.decode("utf-8", errors="ignore")
                        break
        else:
            payload = msg.get_payload(decode=True)
            if payload:
                body = payload.decode("utf-8", errors="ignore")

        body = strip_bad_chars(body).strip()
        body = re.sub(r"\n{3,}", "\n\n", body)
        body = body[:MAX_BODY_CHARS]

        if not body or not subject or len(body) < 30:
            return None

        return {
            "id": msg_id,
            "from": from_addr,
            "to": to_addr,
            "cc": cc,
            "subject": subject,
            "date": date,
            "body": body,
        }

    except Exception:
        return None


def classify_email(row: dict) -> str | None:
    """Return the best matching category, or None if no match."""
    text = (row["subject"] + " " + row["body"]).lower()
    scores: dict[str, int] = {}
    for category, patterns in CATEGORY_PATTERNS.items():
        count = sum(1 for p in patterns if re.search(p, text))
        if count > 0:
            scores[category] = count
    if not scores:
        return None
    return max(scores, key=lambda k: scores[k])


def collect_all_emails(enron_dir: Path) -> list[dict]:
    results: list[dict] = []
    mailboxes = sorted(enron_dir.iterdir())
    random.shuffle(mailboxes)
    scanned = 0
    for mailbox in mailboxes:
        if not mailbox.is_dir():
            continue
        for folder in mailbox.iterdir():
            if not folder.is_dir():
                continue
            for email_file in folder.iterdir():
                if not email_file.is_file():
                    continue
                parsed = parse_email_file(email_file)
                if parsed:
                    results.append(parsed)
        scanned += 1
        if scanned % 10 == 0:
            print(f"  Scanned {scanned} mailboxes, {len(results)} valid emails so far...")
        # Stop early once we have plenty to sample from
        if len(results) >= 50_000:
            break
    return results


def main() -> None:
    enron_dir = Path(ENRON_DIR)
    if not enron_dir.exists():
        print(f"ERROR: Enron directory not found at {enron_dir.resolve()}", file=sys.stderr)
        sys.exit(1)

    output_path = Path(OUTPUT_PATH)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    random.seed(42)

    print(f"Scanning Enron dataset at: {enron_dir.resolve()}")
    all_emails = collect_all_emails(enron_dir)
    print(f"Total valid emails found: {len(all_emails)}")

    # Shuffle so we don't always pick the same mailboxes
    random.shuffle(all_emails)

    # Bucket by category
    buckets: dict[str, list[dict]] = {cat: [] for cat in CATEGORY_TARGETS}
    uncategorized: list[dict] = []

    for row in all_emails:
        cat = classify_email(row)
        if cat and len(buckets[cat]) < CATEGORY_TARGETS[cat] * 5:  # keep pool large
            buckets[cat].append(row)
        else:
            uncategorized.append(row)

    # Sample from each bucket
    sample: list[dict] = []
    seen_ids: set[str] = set()

    for cat, target in CATEGORY_TARGETS.items():
        pool = buckets[cat]
        random.shuffle(pool)
        added = 0
        for row in pool:
            if row["id"] not in seen_ids and added < target:
                sample.append(row)
                seen_ids.add(row["id"])
                added += 1
        print(f"  {cat}: {added}/{target} emails selected (pool size: {len(pool)})")

    # Fill remaining slots from uncategorized if needed
    remaining = TARGET_COUNT - len(sample)
    if remaining > 0:
        for row in uncategorized:
            if row["id"] not in seen_ids and remaining > 0:
                sample.append(row)
                seen_ids.add(row["id"])
                remaining -= 1

    random.shuffle(sample)
    final = sample[:TARGET_COUNT]

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["id", "from", "to", "cc", "subject", "date", "body"]
        )
        writer.writeheader()
        writer.writerows(final)

    print(f"\nWrote {len(final)} curated emails to {output_path.resolve()}")
    print("Category breakdown:")
    cat_counts: dict[str, int] = {}
    for row in final:
        cat = classify_email(row) or "uncategorized"
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")


if __name__ == "__main__":
    main()
