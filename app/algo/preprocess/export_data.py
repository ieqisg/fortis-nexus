"""
export_data.py

Saves the current real Supabase data (mentors + mentees) to a local JSON file
so it can be used for demos without touching the live database.

Usage:
    python export_data.py                        # saves to real_data.json
    python export_data.py --out my_snapshot.json
"""

import os
import json
import argparse
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()


def get_supabase():
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def fetch_mentors(supabase) -> list[dict]:
    result = supabase.table("mentor").select("*").execute()
    mentors = result.data
    for mentor in mentors:
        if not mentor.get("communication_preference"):
            mentor["communication_preference"] = None
        for field in ["technical_skills", "forte", "available_days", "time_slot", "certifications"]:
            val = mentor.get(field)
            if isinstance(val, str):
                try:
                    mentor[field] = json.loads(val)
                except Exception:
                    mentor[field] = [val] if val else []
            elif val is None:
                mentor[field] = []
        prev = mentor.get("prev_mentored_thesis")
        if isinstance(prev, str):
            try:
                mentor["prev_mentored_thesis"] = json.loads(prev)
            except Exception:
                mentor["prev_mentored_thesis"] = [prev] if prev.strip() else []
        elif prev is None:
            mentor["prev_mentored_thesis"] = []
        papers = mentor.get("published_papers")
        if isinstance(papers, str):
            try:
                mentor["published_papers"] = json.loads(papers)
            except Exception:
                mentor["published_papers"] = []
        elif papers is None:
            mentor["published_papers"] = []
    return mentors


def fetch_mentees(supabase) -> list[dict]:
    result = supabase.table("MENTEE_GROUPS").select("*").execute()
    mentees = result.data
    for mentee in mentees:
        if not mentee.get("communication_preference"):
            mentee["communication_preference"] = None
        for field in ["available_days", "time_slot"]:
            val = mentee.get(field)
            if isinstance(val, str):
                try:
                    mentee[field] = json.loads(val)
                except Exception:
                    mentee[field] = [val] if val else []
            elif val is None:
                mentee[field] = []
    return mentees


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export real Supabase data to JSON for demo use.")
    parser.add_argument("--out", default="real_data.json", help="Output file path (default: real_data.json)")
    args = parser.parse_args()

    print("Connecting to Supabase...")
    supabase = get_supabase()

    print("Fetching mentors...")
    mentors = fetch_mentors(supabase)
    print(f"  {len(mentors)} mentors fetched")

    print("Fetching mentees...")
    mentees = fetch_mentees(supabase)
    print(f"  {len(mentees)} mentees fetched")

    snapshot = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "mentors":     mentors,
        "mentees":     mentees,
    }

    out_path = os.path.join(os.path.dirname(__file__), args.out)
    with open(out_path, "w") as f:
        json.dump(snapshot, f, indent=2, default=str)

    print(f"\nSaved {len(mentors)} mentors and {len(mentees)} mentees → {out_path}")
