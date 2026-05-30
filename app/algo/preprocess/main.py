"""
main.py

Entry point for the mentor-mentee matching pipeline.
Called by Node.js via MatchingService.js.

Outputs a structured JSON log between __MATCHING_LOG_START__ and
__MATCHING_LOG_END__ markers so Node.js can parse the result.
"""

import os
import json
import argparse
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime, timezone

from scoring import compute_weighted_scores, get_matched_keywords, extract_profile_keywords, apply_top1_boost
from text_processing import prime_corpus, build_mentor_text, build_mentee_text
from matching import (
    generate_preferences,
    hospital_resident,
    hospital_resident_mentor_optimal,
    pick_fairer_matching,
    verify_stability,
    run_matching,
)

load_dotenv()

SEP  = "─" * 62
DSEP = "═" * 62


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

def fetch_mentors(supabase, table="mentor") -> list[dict]:
    """
    Fetches all mentor profiles including prev_mentored_thesis,
    which is used for keyword extraction and experience scoring.
    """
    result = supabase.table(table).select("*").execute()
    mentors = result.data

    # Normalize array fields that Supabase may return as JSON strings
    for mentor in mentors:
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


def fetch_mentees(supabase, table="MENTEE_GROUPS") -> list[dict]:
    result = supabase.table(table).select("*").execute()
    mentees = result.data

    for mentee in mentees:
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

def clear_matches(supabase, table="matches"):
    result = supabase.table(table).delete().neq(
        "mentor_id", "00000000-0000-0000-0000-000000000000"
    ).execute()
    if hasattr(result, "error") and result.error:
        raise RuntimeError(f"Failed to clear matches: {result.error}")
    print("  Cleared existing matches")


def save_matches(supabase, match_records: list[dict], table="matches"):
    if not match_records:
        print("  ⚠️  No matches to save")
        return
    for record in match_records:
        record["matched_at"] = datetime.now(timezone.utc).isoformat()
    supabase.table(table).insert(match_records).execute()
    print(f"  ✅ Saved {len(match_records)} matches to Supabase")


def save_preferences(
    supabase,
    mentors: list[dict],
    mentees: list[dict],
    scores,
    breakdowns,
    mentee_prefs: dict,
    mentor_prefs: dict,
):
    """
    Persists full ranked preference lists to mentee_preferences and
    mentor_preferences tables so dashboards can display them.
    """
    mentor_map = {m["id"]: m for m in mentors}
    mentee_map = {m["id"]: m for m in mentees}
    mentee_index = {m["id"]: i for i, m in enumerate(mentees)}
    mentor_index = {m["id"]: j for j, m in enumerate(mentors)}

    ts = datetime.now(timezone.utc).isoformat()

    mentee_pref_rows = []
    for mentee in mentees:
        mid   = mentee["id"]
        midx  = mentee_index[mid]
        ranked_mentor_ids = mentee_prefs.get(mid, [])
        ranked_mentors = []
        for rank, mentor_id in enumerate(ranked_mentor_ids, start=1):
            m    = mentor_map.get(mentor_id, {})
            jidx = mentor_index.get(mentor_id)
            score = round(float(scores[midx][jidx]), 4) if jidx is not None else 0.0
            kws: list[str] = []
            if breakdowns and jidx is not None:
                kws = breakdowns[midx][jidx].matched_keywords
            ranked_mentors.append({
                "rank":             rank,
                "mentor_id":        mentor_id,
                "name":             f"{m.get('first_name', '')} {m.get('last_name', '')}".strip(),
                "score":            score,
                "matched_keywords": kws,
            })
        mentee_pref_rows.append({
            "mentee_group_id": mid,
            "ranked_mentors":  ranked_mentors,
            "created_at":      ts,
        })

    mentor_pref_rows = []
    for mentor in mentors:
        mid   = mentor["id"]
        jidx  = mentor_index[mid]
        ranked_mentee_ids = mentor_prefs.get(mid, [])
        ranked_mentees = []
        for rank, mentee_id in enumerate(ranked_mentee_ids, start=1):
            me   = mentee_map.get(mentee_id, {})
            iidx = mentee_index.get(mentee_id)
            score = round(float(scores[iidx][jidx]), 4) if iidx is not None else 0.0
            kws: list[str] = []
            if breakdowns and iidx is not None:
                kws = breakdowns[iidx][jidx].matched_keywords
            ranked_mentees.append({
                "rank":             rank,
                "mentee_group_id":  mentee_id,
                "group_name":       me.get("group_name", ""),
                "research_title":   me.get("research_title", ""),
                "score":            score,
                "matched_keywords": kws,
            })
        mentor_pref_rows.append({
            "mentor_id":      mid,
            "ranked_mentees": ranked_mentees,
            "created_at":     ts,
        })

    if mentee_pref_rows:
        supabase.table(f"{TABLE_PREFIX}mentee_preferences").upsert(mentee_pref_rows).execute()
        print(f"  ✅ Saved preference lists for {len(mentee_pref_rows)} mentees")
    if mentor_pref_rows:
        supabase.table(f"{TABLE_PREFIX}mentor_preferences").upsert(mentor_pref_rows).execute()
        print(f"  ✅ Saved preference lists for {len(mentor_pref_rows)} mentors")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source",
        choices=["supabase", "mock", "file"],
        default="supabase",
        help="Data source: 'supabase' (live DB), 'mock' (demo data), 'file' (exported JSON)",
    )
    parser.add_argument(
        "--data-file",
        default="real_data.json",
        help="Path to exported JSON file when --source=file (default: real_data.json)",
    )
    args = parser.parse_args()
    mode = "fair-matching"
    use_supabase = args.source in ("supabase", "mock")
    TABLE_PREFIX  = "mock_" if args.source == "mock" else ""
    mentor_table  = f"{TABLE_PREFIX}mentor"
    mentee_table  = "MENTEE_GROUPS" if TABLE_PREFIX == "" else "mock_mentee_groups"
    matches_table = f"{TABLE_PREFIX}matches"
    logs_table    = f"{TABLE_PREFIX}algorithm_logs"

    started_at = datetime.now(timezone.utc)

    print(DSEP)
    print("  MENTOR-MENTEE MATCHING SYSTEM")
    print(f"  {started_at.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Mode: {mode}  |  Source: {args.source.upper()}")
    print(DSEP)

    # ── Step 1: Connect / Load data ───────────────────────────────────────────
    print(f"\n{SEP}")
    if use_supabase:
        label = "mock tables" if TABLE_PREFIX else "Supabase"
        print(f"  STEP 1 · Connecting to {label}")
        print(SEP)
        supabase = get_supabase()
        print("  ✅ Connected")
    else:
        print("  STEP 1 · Loading from file (no Supabase connection)")
        print(SEP)
        supabase = None
        print(f"  ✅ Skipped (source={args.source})")

    # ── Step 2: Fetch + Keyword Extraction ────────────────────────────────────
    print(f"\n{SEP}")
    print("  STEP 2 · Fetching Data")
    print(SEP)

    if use_supabase:
        mentors = fetch_mentors(supabase, mentor_table)
        mentees = fetch_mentees(supabase, mentee_table)
        if TABLE_PREFIX:
            print(f"  Loaded from mock tables ({mentor_table}, {mentee_table})")
    else:  # file
        data_path = args.data_file if os.path.isabs(args.data_file) else \
            os.path.join(os.path.dirname(__file__), args.data_file)
        with open(data_path) as f:
            snapshot = json.load(f)
        mentors = snapshot["mentors"]
        mentees = snapshot["mentees"]
        print(f"  Loaded from file: {data_path}")
        print(f"  Exported at: {snapshot.get('exported_at', 'unknown')}")

    if not mentors:
        print("  ❌ No mentors found. Exiting.")
        exit(1)
    if not mentees:
        print("  ❌ No mentees found. Exiting.")
        exit(1)

    print(f"  Fetched {len(mentors)} mentors, {len(mentees)} mentees")

    # Prime corpus-level TF-IDF so residual keyword extraction uses meaningful IDF
    all_profile_texts = (
        [build_mentor_text(m) for m in mentors]
        + [build_mentee_text(me) for me in mentees]
    )
    prime_corpus(all_profile_texts)
    print(f"  Corpus vectorizer fitted on {len(all_profile_texts)} profile documents")

    mentor_map   = {m["id"]: m for m in mentors}
    mentee_map   = {m["id"]: m for m in mentees}

    # Keyword extraction log
    print(f"\n{SEP}")
    print(f"  STEP 2b · Keyword Extraction  ({len(mentors)} mentors, {len(mentees)} mentees)")
    print(SEP)

    mentor_kws = extract_profile_keywords(mentors, is_mentor=True)
    print("  Mentors:")
    for idx, (name, kws) in enumerate(mentor_kws, start=1):
        kw_str = " | ".join(kws) if kws else "(no vocab keywords found)"
        print(f"    [{idx:>2}] {name}")
        print(f"         keywords : {kw_str}")

    print()
    mentee_kws = extract_profile_keywords(mentees, is_mentor=False)
    print("  Mentees:")
    for idx, (name, kws) in enumerate(mentee_kws, start=1):
        title  = mentee_map.get(mentees[idx - 1]["id"], {}).get("research_title", "")
        kw_str = " | ".join(kws) if kws else "(no vocab keywords found)"
        print(f"    [{idx:>2}] {name}  ·  {title}")
        print(f"         keywords : {kw_str}")

    # ── Step 3: Scoring ───────────────────────────────────────────────────────
    print(f"\n{SEP}")
    print("  STEP 3 · Compatibility Scoring")
    print(SEP)
    print("  Weights → keyword 75%  ·  experience 10%  ·  availability 10%")
    print("            communication 2.5%  ·  meeting frequency 2.5%")
    print()

    scores, breakdowns = compute_weighted_scores(mentors, mentees, return_breakdowns=True)
    boosted_scores = apply_top1_boost(scores)

    score_log = []
    if breakdowns:
        print("  Top scores per mentee group:")
        THIN = "  " + "┄" * 58
        for i, mentee_bds in enumerate(breakdowns):
            mentee      = mentees[i]
            top_matches = sorted(mentee_bds, key=lambda b: b.final_score, reverse=True)[:3]
            print(THIN)
            print(f"  {mentee.get('group_name', '')}:")
            for rank, bd in enumerate(top_matches, start=1):
                mentor_name = (
                    f"{mentor_map.get(bd.mentor_id, {}).get('first_name', '')} "
                    f"{mentor_map.get(bd.mentor_id, {}).get('last_name', '')}".strip()
                )
                pct = bd.final_score * 100
                print(
                    f"    {rank}. {mentor_name:<22} {pct:>5.1f}%  "
                    f"kw={bd.keyword_score:.3f} exp={bd.experience_score:.3f} "
                    f"avail={bd.availability_score:.3f} comm={bd.communication_score:.3f} "
                    f"freq={bd.meeting_frequency_score:.3f}"
                )
            if top_matches and top_matches[0].matched_keywords:
                kw_preview = ", ".join(top_matches[0].matched_keywords[:6])
                print(f"    shared keywords (top match): {kw_preview}")

            score_log.append({
                "mentee_id":   mentee["id"],
                "mentee_name": mentee.get("group_name", ""),
                "top_matches": [
                    {
                        "mentor_id":               bd.mentor_id,
                        "mentor_name":             f"{mentor_map.get(bd.mentor_id, {}).get('first_name', '')} {mentor_map.get(bd.mentor_id, {}).get('last_name', '')}".strip(),
                        "keyword_score":           round(bd.keyword_score, 4),
                        "availability_score":      round(bd.availability_score, 4),
                        "experience_score":        round(bd.experience_score, 4),
                        "communication_score":     round(bd.communication_score, 4),
                        "meeting_frequency_score": round(bd.meeting_frequency_score, 4),
                        "communication_mode":      bd.communication_mode,
                        "final_score":             round(bd.final_score, 4),
                        "matched_keywords":        bd.matched_keywords,
                        "shared_domains":          bd.shared_domains,
                        "matching_hints":          bd.matching_hints,
                    }
                    for bd in top_matches
                ],
            })
        print(THIN)

    mentor_score_log = []
    if breakdowns:
        print("\n  Top scores per mentor:")
        THIN = "  " + "┄" * 58
        for j, mentor in enumerate(mentors):
            mentor_name = f"{mentor.get('first_name', '')} {mentor.get('last_name', '')}".strip()
            mentor_bds  = [breakdowns[i][j] for i in range(len(mentees))]
            mentor_exp  = mentor_bds[0].experience_score if mentor_bds else 0.0
            top_matches = sorted(mentor_bds, key=lambda b: (b.final_score, b.keyword_score), reverse=True)[:3]
            print(THIN)
            print(f"  {mentor_name}:  exp={mentor_exp:.3f}")
            for rank, bd in enumerate(top_matches, start=1):
                mentee_name = mentee_map.get(bd.mentee_id, {}).get("group_name", "")
                pct = bd.final_score * 100
                print(
                    f"    {rank}. {mentee_name:<22} {pct:>5.1f}%  "
                    f"kw={bd.keyword_score:.3f} "
                    f"avail={bd.availability_score:.3f} comm={bd.communication_score:.3f} "
                    f"freq={bd.meeting_frequency_score:.3f}"
                )
            if top_matches and top_matches[0].matched_keywords:
                kw_preview = ", ".join(top_matches[0].matched_keywords[:6])
                print(f"    shared keywords (top match): {kw_preview}")

            mentor_score_log.append({
                "mentor_id":       mentor["id"],
                "mentor_name":     mentor_name,
                "experience_score": round(mentor_exp, 4),
                "top_matches": [
                    {
                        "mentee_id":               bd.mentee_id,
                        "mentee_name":             mentee_map.get(bd.mentee_id, {}).get("group_name", ""),
                        "keyword_score":           round(bd.keyword_score, 4),
                        "availability_score":      round(bd.availability_score, 4),
                        "experience_score":        round(mentor_exp, 4),
                        "communication_score":     round(bd.communication_score, 4),
                        "meeting_frequency_score": round(bd.meeting_frequency_score, 4),
                        "communication_mode":      bd.communication_mode,
                        "final_score":             round(bd.final_score, 4),
                        "matched_keywords":        bd.matched_keywords,
                        "shared_domains":          bd.shared_domains,
                        "matching_hints":          bd.matching_hints,
                    }
                    for bd in top_matches
                ],
            })
        print(THIN)

    # ── Step 4: Preferences ───────────────────────────────────────────────────
    print(f"\n{SEP}")
    print("  STEP 4 · Preference Lists")
    print(SEP)

    mentee_prefs, mentor_prefs = generate_preferences(mentors, mentees, boosted_scores)

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

    print("  Mentee → Mentor preferences (top 5):")
    for entry in preference_log["mentee_preferences"]:
        ranked_str = " → ".join(entry["ranked_mentors"][:5])
        print(f"    {entry['mentee_name']:<28}:  {ranked_str}")

    print()
    print("  Mentor → Mentee preferences (top 5):")
    for entry in preference_log["mentor_preferences"]:
        ranked_str = " → ".join(entry["ranked_mentees"][:5])
        print(f"    {entry['mentor_name']:<28}:  {ranked_str}")

    # ── Step 5: Matching ──────────────────────────────────────────────────────
    hospital_capacity = {
        m["id"]: (m["mentor_capacity"] if m.get("mentor_capacity") is not None else 1)
        for m in mentors
    }

    print(f"\n{SEP}")
    print("  STEP 5 · Gale-Shapley Hospital-Resident Matching")
    print(f"  Mode: {mode}")
    print(SEP)

    assignment_mo       = None
    assignment_meo      = None
    proposal_events_mo  = None
    proposal_events_meo = None

    def resolve_name(uid: str) -> str:
        if uid in mentor_map:
            m = mentor_map[uid]
            return f"{m.get('first_name', '')} {m.get('last_name', '')}".strip()
        if uid in mentee_map:
            return mentee_map[uid].get("group_name", uid)
        return uid

    def resolve_events(events: list[dict]) -> list[dict]:
        return [
            {**e,
             "proposer": resolve_name(e["proposer"]),
             "to":       resolve_name(e["to"]),
             "replaced": resolve_name(e["replaced"]) if e["replaced"] else None}
            for e in events
        ]

    def print_proposal_events(events: list[dict], label: str) -> None:
        THIN = "  " + "┄" * 58
        print(f"\n  Proposal events ({label}): {len(events)} total")
        print(THIN)
        for ev in events[:30]:
            replaced_str = f"   (replaced: {ev['replaced']})" if ev["replaced"] else ""
            print(f"    [{ev['round']:>3}] {ev['type'].upper():<8}  {ev['proposer']:<24}  →  {ev['to']}{replaced_str}")
        if len(events) > 30:
            print(f"  ... ({len(events) - 30} more events — full list in frontend log)")

    if mode in ("mentee-optimal", "fair-matching"):
        print("\n  5a · Running HR (mentee-optimal)...")
        print("       Mentees propose → mentors accept/reject based on preference rank")
        assignment_mo, _, proposal_events_mo = hospital_resident(
            residents=mentees, hospitals=mentors,
            resident_prefs=mentee_prefs, hospital_prefs=mentor_prefs,
            hospital_capacity=hospital_capacity,
        )
        print(f"       Matched: {len(assignment_mo)} pairs")
        print_proposal_events(resolve_events(proposal_events_mo), "mentee-optimal")

    if mode in ("mentor-optimal", "fair-matching"):
        print("\n  5b · Running HR (mentor-optimal)...")
        print("       Mentors propose → mentees accept/reject based on preference rank")
        assignment_meo, _, proposal_events_meo = hospital_resident_mentor_optimal(
            residents=mentees, hospitals=mentors,
            resident_prefs=mentee_prefs, hospital_prefs=mentor_prefs,
            hospital_capacity=hospital_capacity,
        )
        print(f"       Matched: {len(assignment_meo)} pairs")
        print_proposal_events(resolve_events(proposal_events_meo), "mentor-optimal")

    if mode == "fair-matching":
        print("\n  5c · Picking fairer matching...")
        final_assignment, selected_variant, dissatisfaction_data = pick_fairer_matching(
            mentors, mentees,
            assignment_mo, assignment_meo,
            mentee_prefs, mentor_prefs,
        )
        print(f"       Selected internally: {selected_variant}")
        method = "fair-matching"
    elif mode == "mentee-optimal":
        final_assignment, method = assignment_mo, "mentee-optimal"
        dissatisfaction_data = None
        print(f"\n  Result: mentee-optimal ({len(final_assignment)} pairs)")
    else:
        final_assignment, method = assignment_meo, "mentor-optimal"
        dissatisfaction_data = None
        print(f"\n  Result: mentor-optimal ({len(final_assignment)} pairs)")

    print("\n  5d · Verifying stability...")
    is_stable, blocking_pairs_count = verify_stability(
        final_assignment, mentors, mentees,
        mentee_prefs, mentor_prefs, hospital_capacity,
    )
    stability_label = "✅ STABLE — no blocking pairs" if is_stable else "⚠️  UNSTABLE — blocking pairs detected"
    print(f"      {stability_label}")

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

    # ── Step 7: Save ──────────────────────────────────────────────────────────
    print(f"\n{SEP}")
    label = f"mock tables ({matches_table})" if TABLE_PREFIX else "Supabase"
    print(f"  STEP 7 · Saving to {label}")
    print(SEP)
    if use_supabase:
        try:
            clear_matches(supabase, matches_table)
            save_matches(supabase, match_records, matches_table)
        except RuntimeError as e:
            print(f"  ❌ {e}")
            raise
        try:
            save_preferences(
                supabase, mentors, mentees, scores, breakdowns,
                mentee_prefs, mentor_prefs,
            )
        except Exception as e:
            print(f"  ⚠️  Preference save skipped: {e}")
            if TABLE_PREFIX:
                print(f"      Run supabase/mock_update_preferences.txt in SQL Editor to enable this.")
    else:
        print(f"  ⏭️  Skipped (source={args.source} — demo run, no DB writes)")

    # ── Step 8: JSON log for Node.js ──────────────────────────────────────────
    log_output = {
        "success":              True,
        "matched":              len(match_records),
        "unmatched":            len(mentees) - len(match_records),
        "algorithm":            method,
        "is_stable":            is_stable,
        "blocking_pairs_count": blocking_pairs_count,
        "dissatisfaction":      dissatisfaction_data,
        "started_at":           started_at.isoformat(),
        "timestamp":            datetime.now(timezone.utc).isoformat(),
        "phase1": {
            "mentors_count":      len(mentors),
            "mentees_count":      len(mentees),
            "keyword_extraction": "complete",
            "tfidf_applied":      True,
            "prev_thesis_used":   True,
        },
        "phase2": {
            "scores":                score_log,
            "mentor_scores":         mentor_score_log,
            "availability_computed": True,
            "experience_computed":   True,
        },
        "phase3": {
            "preferences":            preference_log,
            "mode":                   mode,
            "mentee_optimal_matches": len(assignment_mo) if assignment_mo is not None else None,
            "mentor_optimal_matches": len(assignment_meo) if assignment_meo is not None else None,
            "selected_algorithm":     method,
            "is_stable":              is_stable,
            "proposal_events_mo":     resolve_events(proposal_events_mo)  if proposal_events_mo  is not None else None,
            "proposal_events_meo":    resolve_events(proposal_events_meo) if proposal_events_meo is not None else None,
            "matches": [
                {
                    "mentee_name":       mentee_map.get(r["mentee_group_id"], {}).get("group_name", ""),
                    "mentor_name":       f"{mentor_map.get(r['mentor_id'], {}).get('first_name', '')} {mentor_map.get(r['mentor_id'], {}).get('last_name', '')}".strip(),
                    "score":             r["compatibility_score"],
                    "keywords":          r["matched_keywords"],
                    "algorithm":         r["algorithm"],
                    "overlapping_days":  sorted(set(mentor_map.get(r["mentor_id"], {}).get("available_days") or [])
                                                & set(mentee_map.get(r["mentee_group_id"], {}).get("available_days") or [])),
                    "overlapping_slots": sorted(set(mentor_map.get(r["mentor_id"], {}).get("time_slot") or [])
                                                & set(mentee_map.get(r["mentee_group_id"], {}).get("time_slot") or [])),
                }
                for r in sorted(match_records, key=lambda r: r["compatibility_score"], reverse=True)
            ],
        },
    }

    print("\n__MATCHING_LOG_START__")
    print(json.dumps(log_output))
    print("__MATCHING_LOG_END__")

    if use_supabase:
        try:
            supabase.table(logs_table).insert({"log_data": log_output}).execute()
        except Exception as e:
            print(f"[Warning] Could not save algorithm log: {e}")

    # ── Results summary ───────────────────────────────────────────────────────
    unmatched_groups = [m for m in mentees if m["id"] not in final_assignment]

    print(f"\n{SEP}")
    print("  RESULTS")
    print(SEP)
    print(f"  Matched   : {len(match_records)} / {len(mentees)}")
    print(f"  Unmatched : {len(unmatched_groups)}")
    print(f"  Algorithm : {method}")
    print(f"  Stable    : {stability_label}")
    if unmatched_groups:
        print("  Unmatched groups:")
        for m in unmatched_groups:
            print(f"    - {m.get('group_name', m['id'])}")
    print(SEP)
    print("  ✅ Matching complete!")
    print(DSEP)
