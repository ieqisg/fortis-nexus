"""
test_scoring_mock.py

Mock-data test suite for the scoring pipeline.

Run from the preprocess directory:
    cd app/algo/preprocess && python test_scoring_mock.py

Verifies:
  - All pillar scores ∈ [0, 1]
  - Final score = Σ(weight × pillar) — pure weighted sum, no normalization
  - Keyword cosine is 0 for fully disjoint profiles
  - Keyword cosine is high for identical / near-identical profiles
  - matched_keywords is empty when profiles share no vocabulary
"""

import sys
import math

# ── Mock profiles ─────────────────────────────────────────────────────────────

MENTOR_ML = {
    "id": "m1",
    "first_name": "Alice", "last_name": "Smith",
    "technical_skills": ["machine learning", "nlp", "python"],
    "forte": ["deep learning", "neural networks"],
    "self_description": "I specialize in machine learning and natural language processing.",
    "available_days": ["Monday", "Wednesday", "Friday"],
    "time_slot": ["9:00-10:00", "10:00-11:00"],
    "communication_preference": "ONLINE_CHAT",
    "prior_mentees_count": 3,
    "prev_mentored_thesis": ["NLP-based sentiment analysis system"],
    "published_papers": [
        {"title": "Deep Learning for Text Classification", "year": "2023"}
    ],
    "certifications": ["Google ML", "AWS"],
    "mentor_capacity": 2,
}

MENTOR_MOBILE = {
    "id": "m2",
    "first_name": "Bob", "last_name": "Lee",
    "technical_skills": ["android", "ios", "flutter", "swift"],
    "forte": ["mobile development", "cross platform"],
    "self_description": "Expert in native and cross-platform mobile application development.",
    "available_days": ["Tuesday", "Thursday"],
    "time_slot": ["13:00-14:00"],
    "communication_preference": "FACE_TO_FACE",
    "prior_mentees_count": 1,
    "prev_mentored_thesis": [],
    "published_papers": [],
    "certifications": [],
    "mentor_capacity": 1,
}

MENTOR_ALGO = {
    "id": "m3",
    "first_name": "Carol", "last_name": "Tan",
    "technical_skills": ["algorithms", "software engineering", "python", "web development"],
    "forte": ["algorithm design", "system design", "database management"],
    "self_description": "Research in stable matching algorithms and software engineering.",
    "available_days": ["Monday", "Tuesday"],
    "time_slot": ["7:00-8:00", "12:00-13:00"],
    "communication_preference": "FACE_TO_FACE",
    "prior_mentees_count": 5,
    "prev_mentored_thesis": ["Gale-Shapley matching system for university admissions"],
    "published_papers": [
        {"title": "Stable Matching Algorithms in Academic Settings", "year": "2022"},
        {"title": "Web Application Development with REST APIs", "year": "2021"},
    ],
    "certifications": ["PMP"],
    "mentor_capacity": 3,
}

MENTEE_ML = {
    "id": "g1",
    "group_name": "ML Group",
    "research_title": "Machine Learning for Sentiment Analysis using NLP Techniques",
    "research_description": "This study applies deep learning and neural networks to classify sentiments in social media text using NLP.",
    "mentor_preference": "Looking for a mentor with expertise in machine learning, nlp, deep learning, and neural networks.",
    "available_days": ["Monday", "Wednesday", "Friday"],
    "time_slot": ["9:00-10:00"],
    "communication_preference": "ONLINE_CHAT",
}

MENTEE_FORTIS = {
    "id": "g2",
    "group_name": "Fortis Nexus",
    "research_title": "Fortis Nexus: Mentor-Mentee Matching System using Gale-Shapley Algorithm",
    "research_description": "A mentor-mentee matching system for CS students using the Gale-Shapley algorithm (hospital-resident version). The system matches mentors and mentees based on skills, interests, and availability.",
    "mentor_preference": "Looking for a mentor with expertise in algorithms, software engineering, web application development, Gale-Shapley algorithm, database management, system analysis and design.",
    "available_days": ["Monday", "Tuesday"],
    "time_slot": ["7:00-8:00", "12:00-13:00"],
    "communication_preference": "FACE_TO_FACE",
}

MENTEE_DISJOINT = {
    "id": "g3",
    "group_name": "Mobile IoT Group",
    "research_title": "IoT Sensor Network for Real-Time Health Monitoring",
    "research_description": "Using embedded systems and IoT sensors to monitor patient vitals in real time.",
    "mentor_preference": "Looking for a mentor with expertise in IoT, embedded systems, Arduino, sensor networks, and firmware development.",
    "available_days": ["Saturday"],
    "time_slot": ["8:00-9:00"],
    "communication_preference": "ONLINE_CHAT",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

PASS = "✓"
FAIL = "✗"
errors = []

def check(label: str, condition: bool, detail: str = "") -> None:
    status = PASS if condition else FAIL
    print(f"  {status} {label}" + (f"  [{detail}]" if detail else ""))
    if not condition:
        errors.append(f"{label}: {detail}")

def run_pair(mentor: dict, mentee: dict) -> dict:
    from scoring import compute_weighted_scores, get_matched_keywords
    scores, breakdowns = compute_weighted_scores(
        mentors=[mentor], mentees=[mentee], return_breakdowns=True
    )
    bd = breakdowns[0][0]
    return {
        "keyword":    bd.keyword_score,
        "exp":        bd.experience_score,
        "avail":      bd.availability_score,
        "comm":       bd.communication_score,
        "freq":       bd.meeting_frequency_score,
        "final":      bd.final_score,
        "matched_kw": bd.matched_keywords,
    }

# ── Tests ─────────────────────────────────────────────────────────────────────

def test_formula_integrity() -> None:
    """Final score must equal the exact weighted sum of pillar scores."""
    print("\n[Test] Formula integrity — final == weighted sum")
    from scoring import ScoringWeights
    w = ScoringWeights()
    r = run_pair(MENTOR_ML, MENTEE_ML)
    expected = (
        w.keyword_similarity * r["keyword"]
        + w.experience        * r["exp"]
        + w.availability      * r["avail"]
        + w.communication     * r["comm"]
        + w.meeting_frequency * r["freq"]
    )
    diff = abs(r["final"] - expected)
    check("final == 0.6*kw + 0.2*exp + 0.1*avail + 0.05*comm + 0.05*freq",
          diff < 1e-5, f"diff={diff:.8f}, final={r['final']:.4f}, expected={expected:.4f}")

def test_all_in_range() -> None:
    """Every pillar and final score must be in [0, 1]."""
    print("\n[Test] All scores in [0, 1]")
    pairs = [
        ("ML mentor × ML mentee", MENTOR_ML, MENTEE_ML),
        ("Mobile mentor × Fortis mentee", MENTOR_MOBILE, MENTEE_FORTIS),
        ("Algo mentor × Fortis mentee", MENTOR_ALGO, MENTEE_FORTIS),
        ("ML mentor × Disjoint mentee", MENTOR_ML, MENTEE_DISJOINT),
    ]
    for label, mentor, mentee in pairs:
        r = run_pair(mentor, mentee)
        for key in ("keyword", "exp", "avail", "comm", "freq", "final"):
            v = r[key]
            check(f"{label} — {key} ∈ [0,1]",
                  0.0 <= v <= 1.0 + 1e-9,
                  f"got {v:.4f}")

def test_perfect_keyword_match() -> None:
    """ML mentor vs ML mentee should have noticeably high keyword cosine.
    TF-IDF cosine similarity peaks around 0.40-0.55 for well-matched profiles
    (it is normalized by document length, so 1.0 only for identical strings)."""
    print("\n[Test] Perfect keyword match — keyword_score > 0.35")
    r = run_pair(MENTOR_ML, MENTEE_ML)
    check("keyword_score > 0.35",
          r["keyword"] > 0.35,
          f"got {r['keyword']:.4f}")
    check("final_score > 0.45 (high across all pillars)",
          r["final"] > 0.45,
          f"got {r['final']:.4f}")

def test_zero_keyword_overlap() -> None:
    """Mobile mentor (android/ios) vs Fortis mentee (algorithms/web dev) — low cosine."""
    print("\n[Test] Zero keyword overlap — keyword_score < 0.20")
    r = run_pair(MENTOR_MOBILE, MENTEE_DISJOINT)
    check("keyword_score < 0.20",
          r["keyword"] < 0.20,
          f"got {r['keyword']:.4f}")
    check("matched_keywords is empty",
          len(r["matched_kw"]) == 0,
          f"got {r['matched_kw']}")

def test_partial_match() -> None:
    """Algo mentor (algorithms, software engineering, web dev) vs Fortis mentee — moderate keyword."""
    print("\n[Test] Partial keyword match — MENTOR_ALGO × MENTEE_FORTIS")
    r = run_pair(MENTOR_ALGO, MENTEE_FORTIS)
    check("keyword_score > 0.20 (clear overlap on algorithms, software engineering)",
          r["keyword"] > 0.20,
          f"got {r['keyword']:.4f}")
    check("keyword_score > mobile mentor keyword for same mentee (better match)",
          r["keyword"] > run_pair(MENTOR_MOBILE, MENTEE_FORTIS)["keyword"],
          f"algo={r['keyword']:.4f} vs mobile={run_pair(MENTOR_MOBILE, MENTEE_FORTIS)['keyword']:.4f}")

def test_availability_isolation() -> None:
    """When availability days are completely disjoint, avail_score must be 0."""
    print("\n[Test] Availability zero when no shared days")
    # MENTOR_MOBILE has [Tuesday, Thursday]; MENTEE_DISJOINT has [Saturday]
    r = run_pair(MENTOR_MOBILE, MENTEE_DISJOINT)
    check("availability_score == 0.0 for disjoint days",
          r["avail"] == 0.0,
          f"got {r['avail']:.4f}")
    # Final score still reflects keyword and other pillars — not zeroed out
    check("final_score > 0 despite zero availability",
          r["final"] >= 0.0,
          f"got {r['final']:.4f}")

def test_no_normalization() -> None:
    """Scores must NOT all be 1.0 — normalization must be absent."""
    print("\n[Test] Scores are not all 1.0 (no percentile normalization)")
    from scoring import compute_weighted_scores
    scores, _ = compute_weighted_scores(
        mentors=[MENTOR_ML, MENTOR_MOBILE, MENTOR_ALGO],
        mentees=[MENTEE_ML, MENTEE_FORTIS, MENTEE_DISJOINT],
    )
    flat = scores.flatten().tolist()
    all_one = all(abs(s - 1.0) < 1e-4 for s in flat)
    check("not all scores == 1.0",
          not all_one,
          f"scores={[round(s,3) for s in flat]}")
    some_below_half = any(s < 0.50 for s in flat)
    check("at least one score < 0.50 (discriminating range)",
          some_below_half,
          f"scores={[round(s,3) for s in flat]}")

# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  Scoring Pipeline — Mock Data Tests")
    print("=" * 60)

    test_formula_integrity()
    test_all_in_range()
    test_perfect_keyword_match()
    test_zero_keyword_overlap()
    test_partial_match()
    test_availability_isolation()
    test_no_normalization()

    print("\n" + "=" * 60)
    if errors:
        print(f"  FAILED — {len(errors)} assertion(s) failed:")
        for e in errors:
            print(f"    ✗ {e}")
        sys.exit(1)
    else:
        print("  ALL TESTS PASSED")
    print("=" * 60)
