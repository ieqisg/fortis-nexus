"""
test_pipeline.py

Interactive test harness for the mentor-mentee matching pipeline.
Edit MENTORS and MENTEES below, then run:

    python test_pipeline.py                      # full pipeline
    python test_pipeline.py --scores-only        # scoring only, skip matching
    python test_pipeline.py --matching-only      # skip scores display, just match
    python test_pipeline.py --keywords           # keyword strings only
    python test_pipeline.py --pair 0 0           # diagnose one pair (mentor_idx mentee_idx)
    python test_pipeline.py --summary            # compact results, no matrix
"""

import sys
import argparse
import time
import numpy as np

# ─────────────────────────────────────────────
# EDIT YOUR TEST DATA HERE
# ─────────────────────────────────────────────

MENTORS = [
    {
        "id": f"mentor-{i+1}",
        "first_name": f"Mentor{i+1}",
        "last_name": "Test",
        "technical_skills": skills,
        "forte": forte,
        "self_description": desc,
        "available_days": days,
        "time_slot": slots,
        "mentor_capacity": 10,
        "prior_mentees_count": i % 6,
        "published_papers_count": i % 4,
    }
    for i, (skills, forte, desc, days, slots) in enumerate([
        (["Gale-Shapley", "Matching"],      ["Algorithms"],      "Matching systems expert",  ["Monday", "Wednesday"], ["9:00-10:00"]),
        (["React", "Node.js"],              ["Web Dev"],         "Full stack dev",            ["Tuesday", "Thursday"], ["1:00-2:00"]),
        (["Machine Learning", "PyTorch"],   ["AI"],              "Deep learning researcher", ["Monday", "Friday"],    ["10:00-11:00"]),
        (["Data Science", "Pandas"],        ["Analytics"],       "Data analyst",             ["Wednesday"],           ["2:00-3:00"]),
        (["Cybersecurity", "Networks"],     ["Security"],        "Security researcher",      ["Thursday"],            ["3:00-4:00"]),
        (["NLP", "Transformers"],           ["AI"],              "Language models expert",   ["Friday"],              ["9:00-10:00"]),
        (["Mobile Dev", "Flutter"],         ["Apps"],            "Mobile engineer",          ["Tuesday"],             ["10:00-11:00"]),
        (["Cloud", "AWS"],                  ["Infrastructure"],  "Cloud architect",          ["Monday"],              ["1:00-2:00"]),
        (["Game Dev", "Unity"],             ["Graphics"],        "Game developer",           ["Wednesday"],           ["3:00-4:00"]),
        (["IoT", "Embedded"],               ["Hardware"],        "IoT systems expert",       ["Thursday"],            ["9:00-10:00"]),
        (["Blockchain"],                    ["Distributed"],     "Blockchain researcher",    ["Friday"],              ["2:00-3:00"]),
        (["Computer Vision"],               ["AI"],              "Vision systems expert",    ["Monday"],              ["3:00-4:00"]),
        (["Databases", "SQL"],              ["Backend"],         "DB specialist",            ["Tuesday"],             ["2:00-3:00"]),
        (["DevOps", "Docker"],              ["CI/CD"],           "DevOps engineer",          ["Wednesday"],           ["10:00-11:00"]),
        (["AR/VR"],                         ["Immersive Tech"],  "XR developer",             ["Thursday"],            ["1:00-2:00"]),
    ])
]

_TOPICS = [
    ("AI Chatbot",           "Building conversational AI using NLP",  "NLP, transformers"),
    ("E-commerce Platform",  "Full stack shopping system",             "React, Node.js"),
    ("Medical Imaging AI",   "CNN for disease detection",              "Deep learning"),
    ("Flood Prediction",     "Using ML for flood forecasting",         "Data science"),
    ("Smart Traffic System", "IoT-based traffic control",              "IoT"),
    ("Blockchain Voting",    "Secure voting system",                   "Blockchain"),
    ("Mobile Health App",    "Flutter health tracker",                 "Mobile dev"),
    ("Game Development",     "3D Unity game",                          "Game dev"),
    ("Cybersecurity Tool",   "Network intrusion detection",            "Security"),
    ("Cloud File System",    "Distributed storage system",             "Cloud"),
]

_DAYS  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
_SLOTS = ["9:00-10:00", "10:00-11:00", "1:00-2:00", "2:00-3:00", "3:00-4:00"]

MENTEES = [
    {
        "id": f"mentee-{i+1}",
        "group_name": f"Group {i+1}",
        "research_title":       _TOPICS[i % len(_TOPICS)][0],
        "research_description": _TOPICS[i % len(_TOPICS)][1],
        "mentor_preference":    f"Looking for mentor with experience in {_TOPICS[i % len(_TOPICS)][2]}",
        "available_days":       [_DAYS[i % 5]],
        "time_slot":            [_SLOTS[i % 5]],
    }
    for i in range(100)  # ← change this number to scale the test
]


# ─────────────────────────────────────────────
# DISPLAY HELPERS
# ─────────────────────────────────────────────

def print_header(title: str, width: int = 72):
    print("\n" + "─" * width)
    print(f"  {title}")
    print("─" * width)


def print_roster():
    """Prints mentor/mentee roster with indices for --pair usage."""
    print_header("Test Roster")
    total_capacity = sum(m.get("mentor_capacity", 1) for m in MENTORS)

    print(f"\n  Mentors ({len(MENTORS)}) — total capacity: {total_capacity}")
    for i, m in enumerate(MENTORS):
        skills = ", ".join(m.get("technical_skills", [])[:3])
        days   = ", ".join(m.get("available_days", []))
        cap    = m.get("mentor_capacity", 1)
        print(f"    [{i:>2}] {m['first_name']:<14} cap={cap}  {skills:<30}  {days}")

    print(f"\n  Mentees ({len(MENTEES)})")
    for i, m in enumerate(MENTEES):
        days = ", ".join(m.get("available_days", []))
        print(f"    [{i:>2}] {m['group_name']:<12}  {m['research_title'][:40]:<40}  {days}")

    ok = "✅" if total_capacity >= len(MENTEES) else "❌ INSUFFICIENT — increase mentor_capacity"
    print(f"\n  Capacity check: {total_capacity} slots / {len(MENTEES)} mentees  {ok}")


def print_score_matrix(scores: np.ndarray, mentors: list[dict], mentees: list[dict]):
    print_header("Compatibility Score Matrix  (mentees × mentors)")

    header = f"  {'Mentee':<20}"
    for m in mentors:
        header += f"  {m['first_name'][:9]:<9}"
    print(header)
    print("  " + "·" * (20 + 11 * len(mentors)))

    for i, mentee in enumerate(mentees):
        row = f"  {mentee['group_name']:<20}"
        for j in range(len(mentors)):
            s = scores[i][j]
            row += f"  {s:.3f}    "
        print(row)


def print_keyword_strings(mentors: list[dict], mentees: list[dict]):
    from scoring import build_mentor_keyword_string, build_mentee_keyword_string

    print_header("Keyword Strings  (what TF-IDF sees)")

    def _wrap(text: str, indent: int = 4, width: int = 68):
        words, line = text.split(), " " * indent
        for word in words:
            if len(line) + len(word) + 1 > width:
                print(line)
                line = " " * indent + word + " "
            else:
                line += word + " "
        if line.strip():
            print(line)

    for i, mentor in enumerate(mentors):
        kw = build_mentor_keyword_string(mentor)
        print(f"\n  Mentor [{i}] — {mentor['first_name']} {mentor['last_name']}")
        _wrap(kw)

    for i, mentee in enumerate(mentees):
        kw = build_mentee_keyword_string(mentee)
        print(f"\n  Mentee [{i}] — {mentee['group_name']}")
        _wrap(kw)


def print_breakdowns(
    breakdowns: list[list],
    mentors: list[dict],
    mentees: list[dict],
    top_n: int = 3,
):
    print_header(f"Score Breakdowns  (top {top_n} mentors per mentee)")

    for i, mentee_bds in enumerate(breakdowns):
        mentee = mentees[i]
        print(f"\n  [{i:>2}] {mentee['group_name']}  —  {mentee['research_title']}")
        print(f"        {'Mentor':<16} {'Keyword':>8} {'Avail':>7} {'Exp':>6} {'Final':>7}  Matched keywords")
        print("        " + "·" * 58)

        sorted_bds = sorted(mentee_bds, key=lambda b: b.final_score, reverse=True)
        for rank, bd in enumerate(sorted_bds[:top_n]):
            mentor = next(m for m in mentors if str(m["id"]) == bd.mentor_id)
            flag   = "★" if rank == 0 else " "
            kw     = ", ".join(bd.matched_keywords[:3]) or "—"
            print(
                f"    {flag}  {mentor['first_name']:<16}"
                f"{bd.keyword_score:>8.4f}"
                f"{bd.availability_score:>7.4f}"
                f"{bd.experience_score:>6.4f}"
                f"{bd.final_score:>7.4f}"
                f"  {kw}"
            )


def print_matches(match_records: list[dict], mentors: list[dict], mentees: list[dict]):
    mentor_map = {m["id"]: m for m in mentors}
    mentee_map = {m["id"]: m for m in mentees}

    print_header(f"Final Matches  ({len(match_records)}/{len(mentees)} mentees matched)")
    print(f"  {'Mentee':<20} {'Mentor':<20} {'Score':>7}  Keywords")
    print("  " + "·" * 62)

    for record in sorted(match_records, key=lambda r: r["compatibility_score"], reverse=True):
        mentee      = mentee_map.get(record["mentee_group_id"], {})
        mentor      = mentor_map.get(record["mentor_id"], {})
        kw_display  = ", ".join(record["matched_keywords"][:3]) or "—"
        print(
            f"  {mentee.get('group_name', '?'):<20}"
            f"{mentor.get('first_name', '?'):<20}"
            f"{record['compatibility_score']:>7.4f}"
            f"  {kw_display}"
        )

    matched_ids = {r["mentee_group_id"] for r in match_records}
    unmatched   = [m for m in mentees if m["id"] not in matched_ids]
    if unmatched:
        print(f"\n  ⚠️  Unmatched ({len(unmatched)}):")
        for m in unmatched:
            print(f"     - {m['group_name']}")


def print_mentor_fill(match_records: list[dict], mentors: list[dict]):
    print_header("Mentor Capacity Utilization")

    fill = {}
    for r in match_records:
        fill[r["mentor_id"]] = fill.get(r["mentor_id"], 0) + 1

    print(f"  {'Mentor':<20} {'Assigned':>8} {'Capacity':>9}  {'Fill':>5}  Bar")
    print("  " + "·" * 55)

    for mentor in mentors:
        mid      = mentor["id"]
        assigned = fill.get(mid, 0)
        cap      = mentor.get("mentor_capacity", 1)
        pct      = f"{assigned/cap*100:.0f}%" if cap else "—"
        bar      = "█" * assigned + "░" * max(cap - assigned, 0)
        print(f"  {mentor['first_name']:<20} {assigned:>8} {cap:>9}  {pct:>5}  {bar}")


def print_summary(match_records: list[dict], mentors: list[dict], mentees: list[dict], elapsed: float):
    print_header("Run Summary")

    matched   = len(match_records)
    total     = len(mentees)
    scores    = [r["compatibility_score"] for r in match_records]
    avg_score = float(np.mean(scores)) if scores else 0.0
    min_score = float(min(scores))     if scores else 0.0
    max_score = float(max(scores))     if scores else 0.0

    print(f"\n  Mentees matched : {matched}/{total}  {'✅ all matched' if matched == total else '⚠️  some unmatched'}")
    print(f"  Score range     : {min_score:.4f} → {max_score:.4f}  (avg {avg_score:.4f})")
    print(f"  Pipeline time   : {elapsed:.2f}s")

    # Flag bottom-10% scores as likely safety-net assignments
    if scores:
        p10 = float(np.percentile(scores, 10))
        low = [r for r in match_records if r["compatibility_score"] <= p10]
        if low:
            mentee_map = {m["id"]: m for m in mentees}
            mentor_map = {m["id"]: m for m in mentors}
            print(f"\n  ⚠️  Low-score matches (bottom 10% — check if safety-net):")
            for r in low:
                mn = mentee_map.get(r["mentee_group_id"], {}).get("group_name", "?")
                mr = mentor_map.get(r["mentor_id"], {}).get("first_name", "?")
                print(f"     {mn:<20} → {mr:<20}  ({r['compatibility_score']:.4f})")


# ─────────────────────────────────────────────
# PIPELINE STAGES
# ─────────────────────────────────────────────

def stage_scoring(
    show_matrix: bool = True,
    show_breakdowns: bool = True,
) -> tuple[np.ndarray, list, float]:
    """
    Runs the scoring pipeline.
    Returns (scores, breakdowns, elapsed_seconds).
    """
    from scoring import compute_weighted_scores

    print(f"\n  Scoring {len(MENTEES)} mentees × {len(MENTORS)} mentors...")
    t0 = time.perf_counter()
    scores, breakdowns = compute_weighted_scores(MENTORS, MENTEES, return_breakdowns=True)
    elapsed = time.perf_counter() - t0
    print(f"  ✅ Done in {elapsed:.2f}s")

    if show_matrix:
        print_score_matrix(scores, MENTORS, MENTEES)
    if show_breakdowns and breakdowns:
        print_breakdowns(breakdowns, MENTORS, MENTEES, top_n=3)

    return scores, breakdowns, elapsed


def stage_matching(show_fill: bool = True) -> tuple[list[dict], float]:
    """
    Runs the full matching pipeline (scoring is called internally by run_matching).
    Returns (match_records, elapsed_seconds).
    """
    from matching import run_matching

    print(f"\n  Running Gale-Shapley for {len(MENTEES)} mentees...")
    t0 = time.perf_counter()
    match_records = run_matching(MENTORS, MENTEES)
    elapsed = time.perf_counter() - t0
    print(f"  ✅ Done in {elapsed:.2f}s")

    print_matches(match_records, MENTORS, MENTEES)

    if show_fill:
        print_mentor_fill(match_records, MENTORS)

    return match_records, elapsed


# ─────────────────────────────────────────────
# MODES
# ─────────────────────────────────────────────

def run_keywords_only():
    print_keyword_strings(MENTORS, MENTEES)


def run_pair_diagnosis(mentor_idx: int, mentee_idx: int):
    from scoring import diagnose_pair

    if mentor_idx >= len(MENTORS):
        print(f"❌ Mentor index {mentor_idx} out of range (0–{len(MENTORS)-1})")
        sys.exit(1)
    if mentee_idx >= len(MENTEES):
        print(f"❌ Mentee index {mentee_idx} out of range (0–{len(MENTEES)-1})")
        sys.exit(1)

    mentor = MENTORS[mentor_idx]
    mentee = MENTEES[mentee_idx]

    print_header(f"Pair Diagnosis  —  mentor[{mentor_idx}] × mentee[{mentee_idx}]")
    print(f"\n  Mentor : [{mentor_idx}] {mentor['first_name']} {mentor['last_name']}")
    print(f"           Skills : {', '.join(mentor.get('technical_skills', []))}")
    print(f"           Forte  : {', '.join(mentor.get('forte', []))}")
    print(f"           Days   : {', '.join(mentor.get('available_days', []))}")
    print(f"\n  Mentee : [{mentee_idx}] {mentee['group_name']}")
    print(f"           Title  : {mentee.get('research_title', '')}")
    print(f"           Pref   : {mentee.get('mentor_preference', '')}")
    print(f"           Days   : {', '.join(mentee.get('available_days', []))}")

    diagnose_pair(mentor, mentee)


def run_scores_only():
    print_header("Pipeline: Scoring Only")
    stage_scoring(show_matrix=True, show_breakdowns=True)


def run_matching_only():
    print_header("Pipeline: Matching Only")
    t0 = time.perf_counter()
    match_records, _ = stage_matching(show_fill=True)
    print_summary(match_records, MENTORS, MENTEES, time.perf_counter() - t0)


def run_full_pipeline(summary_only: bool = False):
    print_header("Pipeline: Full  (scoring → matching → summary)")

    t_start = time.perf_counter()

    # Stage 1: Scoring
    print_header("Stage 1 — Scoring")
    scores, breakdowns, scoring_time = stage_scoring(
        show_matrix=not summary_only,
        show_breakdowns=not summary_only,
    )

    # Stage 2: Matching (reuses scores internally via run_matching)
    print_header("Stage 2 — Gale-Shapley Matching")
    match_records, matching_time = stage_matching(show_fill=True)

    # Summary
    print_summary(match_records, MENTORS, MENTEES, time.perf_counter() - t_start)


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Test harness for the mentor-mentee matching pipeline.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python test_pipeline.py                    Full pipeline (scores + matching + summary)
  python test_pipeline.py --summary          Full pipeline, compact output only
  python test_pipeline.py --scores-only      Scoring stage only (no matching)
  python test_pipeline.py --matching-only    Matching only (scores run internally)
  python test_pipeline.py --keywords         Raw keyword strings only
  python test_pipeline.py --pair 0 2         Diagnose mentor[0] vs mentee[2]
        """,
    )
    parser.add_argument("--scores-only",   action="store_true")
    parser.add_argument("--matching-only", action="store_true")
    parser.add_argument("--keywords",      action="store_true")
    parser.add_argument("--summary",       action="store_true")
    parser.add_argument(
        "--pair", nargs=2, type=int, metavar=("MENTOR_IDX", "MENTEE_IDX"),
    )

    args = parser.parse_args()

    print("=" * 72)
    print("  MENTOR-MENTEE MATCHING PIPELINE — TEST HARNESS")
    print("=" * 72)
    print_roster()

    if args.keywords:
        run_keywords_only()
    elif args.pair:
        run_pair_diagnosis(args.pair[0], args.pair[1])
    elif args.scores_only:
        run_scores_only()
    elif args.matching_only:
        run_matching_only()
    elif args.summary:
        run_full_pipeline(summary_only=True)
    else:
        run_full_pipeline(summary_only=False)

    print("\n" + "=" * 72 + "\n")


if __name__ == "__main__":
    main()
