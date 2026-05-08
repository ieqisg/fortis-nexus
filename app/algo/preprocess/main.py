"""
main.py

Entry point for the mentor-mentee matching pipeline.
Called by Node.js via MatchingService.js.

Outputs a structured JSON log between __MATCHING_LOG_START__ and
__MATCHING_LOG_END__ markers so Node.js can parse the result.
"""

import os
import json
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime, timezone

from scoring import compute_weighted_scores, get_matched_keywords
from matching import (
    generate_preferences,
    hospital_resident,
    hospital_resident_mentor_optimal,
    pick_fairer_matching,
    verify_stability,
    run_matching,
)

load_dotenv()


# ─────────────────────────────────────────────────────────────────────────────
# SUPABASE CLIENT
# ─────────────────────────────────────────────────────────────────────────────

def get_supabase():
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


# ─────────────────────────────────────────────────────────────────────────────
# FETCH DATA
# ─────────────────────────────────────────────────────────────────────────────

def fetch_mentors(supabase) -> list[dict]:
    """
    Fetches all mentor profiles including prev_mentored_thesis,
    which is used for keyword extraction and experience scoring.
    """
    result = supabase.table("mentor").select("*").execute()
    mentors = result.data
    print(f"  Fetched {len(mentors)} mentors")

    # Normalize array fields that Supabase may return as JSON strings
    for mentor in mentors:
        # Normalize communication_preference to None if empty/missing
        cp = mentor.get("communication_preference")
        if not cp:
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

        # prev_mentored_thesis: normalize to list
        prev = mentor.get("prev_mentored_thesis")
        if isinstance(prev, str):
            try:
                mentor["prev_mentored_thesis"] = json.loads(prev)
            except Exception:
                mentor["prev_mentored_thesis"] = [prev] if prev.strip() else []
        elif prev is None:
            mentor["prev_mentored_thesis"] = []

    return mentors


def fetch_mentees(supabase) -> list[dict]:
    result = supabase.table("MENTEE_GROUPS").select("*").execute()
    mentees = result.data
    print(f"  Fetched {len(mentees)} mentees")

    # Normalize array fields
    for mentee in mentees:
        # Normalize communication_preference to None if empty/missing
        cp = mentee.get("communication_preference")
        if not cp:
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


# ─────────────────────────────────────────────────────────────────────────────
# SUPABASE WRITES
# ─────────────────────────────────────────────────────────────────────────────

def clear_matches(supabase):
    supabase.table("matches").delete().neq(
        "mentor_id", "00000000-0000-0000-0000-000000000000"
    ).execute()
    print("  Cleared existing matches")


def save_matches(supabase, match_records: list[dict]):
    if not match_records:
        print("  ⚠️  No matches to save")
        return
    for record in match_records:
        record["matched_at"] = datetime.now(timezone.utc).isoformat()
    supabase.table("matches").insert(match_records).execute()
    print(f"  ✅ Saved {len(match_records)} matches to Supabase")


# ─────────────────────────────────────────────────────────────────────────────
# PRINT RESULTS
# ─────────────────────────────────────────────────────────────────────────────

def print_results(match_records, mentors, mentees):
    mentor_map = {m["id"]: m for m in mentors}
    mentee_map = {m["id"]: m for m in mentees}

    print(f"\n🎯 Final Matches ({len(match_records)} total):")
    print(f"{'Mentee Group':<25} {'Mentor':<25} {'Score':<10} {'Algorithm':<18} {'Keywords'}")
    print("-" * 100)

    for record in match_records:
        mentee = mentee_map.get(record["mentee_group_id"], {})
        mentor = mentor_map.get(record["mentor_id"], {})
        print(
            f"{mentee.get('group_name', 'Unknown'):<25} "
            f"{mentor.get('first_name', '')} {mentor.get('last_name', ''):<18} "
            f"{record['compatibility_score']:<10} "
            f"{record.get('algorithm', ''):<18} "
            f"{record['matched_keywords']}"
        )

    matched_ids = {r["mentee_group_id"] for r in match_records}
    unmatched   = [m for m in mentees if m["id"] not in matched_ids]
    if unmatched:
        print(f"\n⚠️  Unmatched mentees ({len(unmatched)}):")
        for m in unmatched:
            print(f"  - {m['group_name']}")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  MENTOR-MENTEE MATCHING SYSTEM")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # ── Step 1: Connect ───────────────────────────────────────────────────────
    print("\n📦 Step 1: Connecting to Supabase...")
    supabase = get_supabase()

    # ── Step 2: Fetch ─────────────────────────────────────────────────────────
    print("\n📦 Step 2: Fetching data...")
    mentors = fetch_mentors(supabase)
    mentees = fetch_mentees(supabase)

    if not mentors:
        print("❌ No mentors found. Exiting.")
        exit(1)
    if not mentees:
        print("❌ No mentees found. Exiting.")
        exit(1)

    mentor_map = {m["id"]: m for m in mentors}
    mentee_map = {m["id"]: m for m in mentees}

    # ── Step 3: Scoring ───────────────────────────────────────────────────────
    print("\n📊 Step 3: Computing compatibility scores...")
    scores, breakdowns = compute_weighted_scores(mentors, mentees, return_breakdowns=True)

    score_log = []
    if breakdowns:
        for i, mentee_bds in enumerate(breakdowns):
            mentee     = mentees[i]
            top_matches = sorted(mentee_bds, key=lambda b: b.final_score, reverse=True)[:3]
            score_log.append({
                "mentee_id":   mentee["id"],
                "mentee_name": mentee.get("group_name", ""),
                "top_matches": [
                    {
                        "mentor_id":                 bd.mentor_id,
                        "mentor_name":               f"{mentor_map.get(bd.mentor_id, {}).get('first_name', '')} {mentor_map.get(bd.mentor_id, {}).get('last_name', '')}".strip(),
                        "keyword_score":             round(bd.keyword_score, 4),
                        "availability_score":        round(bd.availability_score, 4),
                        "experience_score":          round(bd.experience_score, 4),
                        "communication_score":       round(bd.communication_score, 4),
                        "meeting_frequency_score":   round(bd.meeting_frequency_score, 4),
                        "communication_mode":        bd.communication_mode,
                        "final_score":               round(bd.final_score, 4),
                        "matched_keywords":          bd.matched_keywords,
                        "shared_domains":            bd.shared_domains,
                        "matching_hints":            bd.matching_hints,
                    }
                    for bd in top_matches
                ],
            })

    # ── Step 4: Preferences ───────────────────────────────────────────────────
    print("\n📋 Step 4: Generating preferences...")
    mentee_prefs, mentor_prefs = generate_preferences(mentors, mentees, scores)

    preference_log = {
        "mentee_preferences": [
            {
                "mentee_name":    mentee_map.get(mid, {}).get("group_name", mid),
                "ranked_mentors": [
                    f"{mentor_map.get(hid, {}).get('first_name', '')} {mentor_map.get(hid, {}).get('last_name', '')}".strip()
                    for hid in ranked[:5]
                ],
            }
            for mid, ranked in mentee_prefs.items()
        ],
        "mentor_preferences": [
            {
                "mentor_name":    f"{mentor_map.get(mid, {}).get('first_name', '')} {mentor_map.get(mid, {}).get('last_name', '')}".strip(),
                "ranked_mentees": [
                    mentee_map.get(rid, {}).get("group_name", rid)
                    for rid in ranked[:5]
                ],
            }
            for mid, ranked in mentor_prefs.items()
        ],
    }

    # ── Step 5: Matching ──────────────────────────────────────────────────────
    hospital_capacity = {m["id"]: m.get("mentor_capacity") or 1 for m in mentors}

    print("\n🏥 Step 5a: Running HR (mentee-optimal)...")
    assignment_mo, _ = hospital_resident(
        residents=mentees, hospitals=mentors,
        resident_prefs=mentee_prefs, hospital_prefs=mentor_prefs,
        hospital_capacity=hospital_capacity,
    )

    print("\n🏥 Step 5b: Running HR (mentor-optimal)...")
    assignment_meo, _ = hospital_resident_mentor_optimal(
        residents=mentees, hospitals=mentors,
        resident_prefs=mentee_prefs, hospital_prefs=mentor_prefs,
        hospital_capacity=hospital_capacity,
    )

    print("\n⚖️  Step 5c: Picking fairer matching...")
    final_assignment, method = pick_fairer_matching(
        mentors, mentees,
        assignment_mo, assignment_meo,
        mentee_prefs, mentor_prefs,
    )

    print("\n🔍 Step 5d: Verifying stability...")
    is_stable = verify_stability(
        final_assignment, mentors, mentees,
        mentee_prefs, mentor_prefs, hospital_capacity,
    )

    # ── Step 6: Build match records ───────────────────────────────────────────
    mentee_index = {m["id"]: i for i, m in enumerate(mentees)}
    mentor_index = {m["id"]: j for j, m in enumerate(mentors)}

    match_records = []
    for mentee_id, mentor_id in final_assignment.items():
        i = mentee_index[mentee_id]
        j = mentor_index[mentor_id]
        match_records.append({
            "mentee_group_id":     mentee_id,
            "mentor_id":           mentor_id,
            "compatibility_score": round(float(scores[i][j]), 4),
            "matched_keywords":    get_matched_keywords(mentors[j], mentees[i]),
            "status":              "active",
            "algorithm":           method,
            "is_stable":           is_stable,
        })

    print_results(match_records, mentors, mentees)

    # ── Step 7: Save ──────────────────────────────────────────────────────────
    print("\n💾 Step 7: Saving to Supabase...")
    clear_matches(supabase)
    save_matches(supabase, match_records)

    # ── Step 8: JSON log for Node.js ──────────────────────────────────────────
    log_output = {
        "success":   True,
        "matched":   len(match_records),
        "unmatched": len(mentees) - len(match_records),
        "algorithm": method,
        "is_stable": is_stable,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "phase1": {
            "mentors_count":      len(mentors),
            "mentees_count":      len(mentees),
            "keyword_extraction": "complete",
            "tfidf_applied":      True,
            "prev_thesis_used":   True,
        },
        "phase2": {
            "scores":               score_log,
            "availability_computed": True,
            "experience_computed":   True,
        },
        "phase3": {
            "preferences":             preference_log,
            "mentee_optimal_matches":  len(assignment_mo),
            "mentor_optimal_matches":  len(assignment_meo),
            "selected_algorithm":      method,
            "is_stable":               is_stable,
            "matches": [
                {
                    "mentee_name": mentee_map.get(r["mentee_group_id"], {}).get("group_name", ""),
                    "mentor_name": f"{mentor_map.get(r['mentor_id'], {}).get('first_name', '')} {mentor_map.get(r['mentor_id'], {}).get('last_name', '')}".strip(),
                    "score":       r["compatibility_score"],
                    "keywords":    r["matched_keywords"],
                    "algorithm":   r["algorithm"],
                }
                for r in match_records
            ],
        },
    }

    print("\n__MATCHING_LOG_START__")
    print(json.dumps(log_output))
    print("__MATCHING_LOG_END__")

    print("\n✅ Matching complete!")
