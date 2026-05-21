"""
Extract a representative sample of 180 emails from the Enron dataset.

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
TARGET_MAILBOXES = 10
TARGET_FOLDERS = {"inbox", "sent", "sent_items", "discussion_threads", "all_documents"}


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
        to_addr = strip_bad_chars(msg.get("To", "") or "").strip()
        cc = strip_bad_chars(msg.get("X-cc", "") or msg.get("Cc", "") or "").strip()
        subject = strip_bad_chars(msg.get("Subject", "") or "").strip()
        date = strip_bad_chars(msg.get("Date", "") or "").strip()

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

        if not body or not subject:
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


def collect_candidates(enron_dir: Path) -> list[dict]:
    mailboxes = [p for p in enron_dir.iterdir() if p.is_dir()]
    random.shuffle(mailboxes)
    selected_mailboxes = mailboxes[:TARGET_MAILBOXES]

    candidates: list[dict] = []

    for mailbox in selected_mailboxes:
        print(f"  Scanning mailbox: {mailbox.name}")
        for folder in mailbox.iterdir():
            if not folder.is_dir():
                continue
            folder_lower = folder.name.lower()
            if not any(t in folder_lower for t in TARGET_FOLDERS):
                continue
            for email_file in folder.iterdir():
                if not email_file.is_file():
                    continue
                parsed = parse_email_file(email_file)
                if parsed:
                    candidates.append(parsed)

    return candidates


def main() -> None:
    enron_dir = Path(ENRON_DIR)
    if not enron_dir.exists():
        print(f"ERROR: Enron directory not found at {enron_dir.resolve()}", file=sys.stderr)
        print("Download from: https://www.cs.cmu.edu/~enron/", file=sys.stderr)
        sys.exit(1)

    output_path = Path(OUTPUT_PATH)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Scanning Enron dataset at: {enron_dir.resolve()}")
    candidates = collect_candidates(enron_dir)
    print(f"Found {len(candidates)} valid emails across target folders")

    if len(candidates) < TARGET_COUNT:
        print(f"WARNING: only found {len(candidates)} emails, using all of them")
        sample = candidates
    else:
        random.seed(42)
        sample = random.sample(candidates, TARGET_COUNT)

    seen_ids: set[str] = set()
    deduped: list[dict] = []
    for row in sample:
        if row["id"] not in seen_ids:
            seen_ids.add(row["id"])
            deduped.append(row)

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "from", "to", "cc", "subject", "date", "body"])
        writer.writeheader()
        writer.writerows(deduped)

    print(f"Wrote {len(deduped)} emails to {output_path.resolve()}")


if __name__ == "__main__":
    main()
