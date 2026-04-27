import os
from dotenv import load_dotenv
from supabase import create_client
from matching import run_matching
from datetime import datetime, timezone
from scoring import load_model

load_dotenv()

# ─────────────────────────────────────────────
# SUPABASE CLIENT
# ─────────────────────────────────────────────

def get_supabase():
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)

# ─────────────────────────────────────────────
# FETCH DATA
# ─────────────────────────────────────────────

def fetch_mentors(supabase) -> list[dict]:
    result = supabase.table("mentor").select("*").execute()
    print(f"  Fetched {len(result.data)} mentors")
    return result.data

def fetch_mentees(supabase) -> list[dict]:
    result = supabase.table("MENTEE_GROUPS").select("*").execute()
    print(f"  Fetched {len(result.data)} mentees")
    return result.data

# ─────────────────────────────────────────────
# CLEAR EXISTING MATCHES
# ─────────────────────────────────────────────

def clear_matches(supabase):
    result = supabase.table("matches").delete().neq(
        "mentor_id", "00000000-0000-0000-0000-000000000000"
    ).execute()
    print(f"  Cleared existing matches")

# ─────────────────────────────────────────────
# SAVE MATCHES
# ─────────────────────────────────────────────

def save_matches(supabase, match_records: list[dict]):
    if not match_records:
        print("  ⚠️  No matches to save")
        return

    # add timestamp
    for record in match_records:
        record["matched_at"] = datetime.now(timezone.utc).isoformat()

    result = supabase.table("matches").insert(match_records).execute()
    print(f"  ✅ Saved {len(match_records)} matches to Supabase")

# ─────────────────────────────────────────────
# PRINT RESULTS
# ─────────────────────────────────────────────

def print_results(match_records: list[dict], mentors: list[dict], mentees: list[dict]):
    mentor_map = {m["id"]: m for m in mentors}
    mentee_map = {m["id"]: m for m in mentees}

    print(f"\n🎯 Final Matches ({len(match_records)} total):")
    print(f"{'Mentee Group':<25} {'Mentor':<25} {'Score':<10} {'Keywords'}")
    print("-" * 90)

    for record in match_records:
        mentee = mentee_map.get(record["mentee_group_id"], {})
        mentor = mentor_map.get(record["mentor_id"], {})
        print(
            f"{mentee.get('group_name', 'Unknown'):<25} "
            f"{mentor.get('first_name', '')} {mentor.get('last_name', ''):<18} "
            f"{record['compatibility_score']:<10} "
            f"{record['matched_keywords']}"
        )

    # unmatched
    matched_mentee_ids = {r["mentee_group_id"] for r in match_records}
    unmatched = [m for m in mentees if m["id"] not in matched_mentee_ids]
    if unmatched:
        print(f"\n⚠️  Unmatched mentees ({len(unmatched)}):")
        for m in unmatched:
            print(f"  - {m['group_name']}")

# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  MENTOR-MENTEE MATCHING SYSTEM")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    print("\n📦 Step 1: Connecting to Supabase...")
    supabase = get_supabase()

    print("\n📦 Step 2: Fetching data...")
    mentors = fetch_mentors(supabase)
    mentees = fetch_mentees(supabase)

    if not mentors:
        print("❌ No mentors found. Exiting.")
        exit(1)
    if not mentees:
        print("❌ No mentees found. Exiting.")
        exit(1)

    print("\n🤖 Step 3: Loading BERT model...")
    model = load_model()

    print("\n🔗 Step 4: Running matching algorithm...")
    match_records = run_matching(mentors, mentees, model)

    print_results(match_records, mentors, mentees)

    print("\n💾 Step 5: Saving to Supabase...")
    clear_matches(supabase)
    save_matches(supabase, match_records)

    print("\n✅ Matching complete!")
