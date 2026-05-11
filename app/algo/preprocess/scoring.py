"""
scoring.py

5-pillar scoring pipeline:

    Pillar                   Weight
    ────────────────────────────────
    keyword_similarity        0.60   main compatibility signal
    experience                0.20   mentor background & history
    availability              0.10   overlapping days/time slots
    communication_preference  0.05   online vs face-to-face match
    meeting_frequency         0.05   how often they can realistically meet
    ────────────────────────────────
    Total                     1.00

Communication preference rules (inferred from available_days):
    Tuesday, Friday          → ONLINE
    Mon, Wed, Thu, Sat       → FACE_TO_FACE
    Mixed or unrecognized    → FLEXIBLE  (compatible with either)

Meeting frequency:
    Number of overlapping available days used as a proxy for
    realistic weekly meeting frequency (normalized to 3 days max).
"""

from __future__ import annotations

import logging
import numpy as np
from dataclasses import dataclass, field
from typing import Optional

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from text_processing import (
    get_mentor_keywords,
    get_mentee_keywords,
    clean_text,
    build_mentor_text,
    build_mentee_text,
    _extract_vocab_matches,
    ACADEMIC_STOP_WORDS,
)
from domain_expander import expand_pair

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# COMMUNICATION MODE
# ─────────────────────────────────────────────────────────────────────────────

_ONLINE_DAYS       = {"Tuesday", "Friday"}
_FACE_TO_FACE_DAYS = {"Monday", "Wednesday", "Thursday", "Saturday"}


def infer_communication_mode(available_days: list[str]) -> str:
    """
    Infers preferred communication mode from available days.

    Rules:
        Days only in {Tuesday, Friday}        → ONLINE
        Days only in {Mon, Wed, Thu, Sat}     → FACE_TO_FACE
        Days in both sets, or no match        → FLEXIBLE

    Returns: "ONLINE" | "FACE_TO_FACE" | "FLEXIBLE"
    """
    days       = set(available_days or [])
    has_online = bool(days & _ONLINE_DAYS)
    has_f2f    = bool(days & _FACE_TO_FACE_DAYS)

    if has_online and not has_f2f:
        return "ONLINE"
    if has_f2f and not has_online:
        return "FACE_TO_FACE"
    return "FLEXIBLE"


def _resolve_communication_mode(mode_a: str, mode_b: str) -> tuple[float, str]:
    """
    Returns (compatibility_score, resolved_mode) for a mentor-mentee pair.

    Explicit preference score rules (FACE_TO_FACE / ONLINE_CHAT / ONLINE_CALL):
        Same value                  → 1.0
        ONLINE_CHAT vs ONLINE_CALL  → 0.7  (both online, different modality)
        FACE_TO_FACE vs any ONLINE  → 0.2  (misaligned medium)

    Fallback inference score rules (ONLINE / FACE_TO_FACE / FLEXIBLE):
        Same mode        → 1.0
        Either FLEXIBLE  → 0.8   (can adapt, slight penalty for ambiguity)
        ONLINE vs F2F    → 0.2   (possible but misaligned)

    Resolved mode:
        Both same        → that mode
        One FLEXIBLE     → the other's specific mode
        Both different   → FLEXIBLE
    """
    if mode_a == mode_b:
        return 1.0, mode_a

    # Explicit online sub-modes — same medium, different modality
    online_sub = {"ONLINE_CHAT", "ONLINE_CALL"}
    if mode_a in online_sub and mode_b in online_sub:
        return 0.7, "ONLINE"

    # One face-to-face, one online
    face_to_face = {"FACE_TO_FACE"}
    online_any = online_sub | {"ONLINE"}
    if (mode_a in face_to_face and mode_b in online_any) or \
       (mode_b in face_to_face and mode_a in online_any):
        return 0.2, "FLEXIBLE"

    # Fallback inference logic (FLEXIBLE from available_days)
    if mode_a == "FLEXIBLE":
        return 0.8, mode_b
    if mode_b == "FLEXIBLE":
        return 0.8, mode_a
    return 0.2, "FLEXIBLE"


# ─────────────────────────────────────────────────────────────────────────────
# WEIGHTS
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ScoringWeights:
    """
    Pillar weights — must sum to 1.0.

        keyword_similarity    0.60
        experience            0.20
        availability          0.10
        communication         0.05
        meeting_frequency     0.05
    """
    keyword_similarity: float = 0.60
    experience:         float = 0.20
    availability:       float = 0.10
    communication:      float = 0.05
    meeting_frequency:  float = 0.05

    def __post_init__(self):
        total = (
            self.keyword_similarity
            + self.experience
            + self.availability
            + self.communication
            + self.meeting_frequency
        )
        if not abs(total - 1.0) < 1e-6:
            raise ValueError(
                f"Weights must sum to 1.0, got {total:.4f}. "
                f"keyword={self.keyword_similarity} exp={self.experience} "
                f"avail={self.availability} comm={self.communication} "
                f"freq={self.meeting_frequency}"
            )


# ─────────────────────────────────────────────────────────────────────────────
# SCORE BREAKDOWN
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ScoreBreakdown:
    """Per-pair score breakdown for explainability and audit logging."""
    mentor_id:               str
    mentee_id:               str
    keyword_score:           float
    availability_score:      float
    experience_score:        float
    communication_score:     float
    meeting_frequency_score: float
    final_score:             float
    matched_keywords:        list[str] = field(default_factory=list)
    shared_domains:          list[str] = field(default_factory=list)
    matching_hints:          list[str] = field(default_factory=list)
    communication_mode:      str       = "FLEXIBLE"

    def to_dict(self) -> dict:
        return {
            "mentor_id": self.mentor_id,
            "mentee_id": self.mentee_id,
            "scores": {
                "keyword_similarity": round(self.keyword_score, 4),
                "availability":       round(self.availability_score, 4),
                "experience":         round(self.experience_score, 4),
                "communication":      round(self.communication_score, 4),
                "meeting_frequency":  round(self.meeting_frequency_score, 4),
                "final":              round(self.final_score, 4),
            },
            "matched_keywords":   self.matched_keywords,
            "shared_domains":     self.shared_domains,
            "matching_hints":     self.matching_hints,
            "communication_mode": self.communication_mode,
        }


# ─────────────────────────────────────────────────────────────────────────────
# 1. KEYWORD STRING BUILDERS
# ─────────────────────────────────────────────────────────────────────────────

def _dedup_keywords(keyword_lists: list[list[str]]) -> list[str]:
    seen, result = set(), []
    for kw_list in keyword_lists:
        for kw in kw_list:
            normalized = " ".join(kw.lower().split())
            if normalized and normalized not in seen:
                seen.add(normalized)
                result.append(normalized)
    return result


def build_mentor_keyword_string(mentor: dict) -> str:
    keywords = get_mentor_keywords(mentor, top_n=20)

    skills  = " ".join(mentor.get("technical_skills") or [])
    forte   = " ".join(mentor.get("forte") or [])
    boosted = f"{skills} {skills} {skills} {forte} {forte} {forte}"

    prev_thesis = mentor.get("prev_mentored_thesis") or []
    if isinstance(prev_thesis, str):
        prev_thesis_text = prev_thesis
    elif isinstance(prev_thesis, list):
        prev_thesis_text = " ".join(str(t) for t in prev_thesis)
    else:
        prev_thesis_text = ""

    dummy_mentee = {"research_title": "", "research_description": "", "mentor_preference": ""}
    expansion    = expand_pair(mentor, dummy_mentee)
    expanded_kw  = expansion.get("mentor_expanded", {}).get("expanded_keywords", [])
    domains      = expansion.get("mentor_expanded", {}).get("domains", [])

    unique = _dedup_keywords([keywords, expanded_kw, domains])
    return clean_text(f"{boosted} {prev_thesis_text} {' '.join(unique)}")


def build_mentee_keyword_string(mentee: dict) -> str:
    keywords = get_mentee_keywords(mentee, top_n=20)

    title      = mentee.get("research_title") or ""
    preference = mentee.get("mentor_preference") or ""
    boosted    = f"{title} {title} {title} {preference} {preference} {preference}"

    dummy_mentor = {"technical_skills": [], "forte": [], "self_description": ""}
    expansion    = expand_pair(dummy_mentor, mentee)
    expanded_kw  = expansion.get("mentee_expanded", {}).get("expanded_keywords", [])
    domains      = expansion.get("mentee_expanded", {}).get("domains", [])
    shared       = expansion.get("shared_domains", [])

    unique = _dedup_keywords([keywords, expanded_kw, domains, shared])
    return clean_text(f"{boosted} {' '.join(unique)}")


# ─────────────────────────────────────────────────────────────────────────────
# 2. KEYWORD COSINE SIMILARITY
# ─────────────────────────────────────────────────────────────────────────────

def compute_keyword_similarity(
    mentor_kw_strings: list[str],
    mentee_kw_strings: list[str],
) -> np.ndarray:
    all_texts = mentor_kw_strings + mentee_kw_strings

    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        max_features=500,
        sublinear_tf=True,
        min_df=1,
        analyzer="word",
        strip_accents="unicode",
        token_pattern=r"(?u)\b\w[\w\-]+\b",
    )

    tfidf_matrix   = vectorizer.fit_transform(all_texts)
    mentor_vectors = tfidf_matrix[: len(mentor_kw_strings)]
    mentee_vectors = tfidf_matrix[len(mentor_kw_strings):]

    return cosine_similarity(mentee_vectors, mentor_vectors)


# ─────────────────────────────────────────────────────────────────────────────
# 3. AVAILABILITY SCORE
# ─────────────────────────────────────────────────────────────────────────────

def _availability_score(mentor: dict, mentee: dict) -> float:
    """Jaccard overlap for days (0.6) and time slots (0.4)."""
    mentor_days  = set(mentor.get("available_days") or [])
    mentee_days  = set(mentee.get("available_days") or [])
    mentor_slots = set(mentor.get("time_slot") or [])
    mentee_slots = set(mentee.get("time_slot") or [])

    if not mentor_days or not mentee_days:
        return 0.0

    day_union  = mentor_days | mentee_days
    slot_union = mentor_slots | mentee_slots

    day_score  = len(mentor_days & mentee_days) / len(day_union)
    slot_score = (
        len(mentor_slots & mentee_slots) / len(slot_union)
        if slot_union else 0.0
    )

    return 0.6 * day_score + 0.4 * slot_score


# ─────────────────────────────────────────────────────────────────────────────
# 4. COMMUNICATION PREFERENCE SCORE
# ─────────────────────────────────────────────────────────────────────────────

def _communication_score(mentor: dict, mentee: dict) -> tuple[float, str]:
    """
    Scores communication mode alignment between mentor and mentee.

    Uses the explicit `communication_preference` field when present
    (FACE_TO_FACE | ONLINE_CHAT | ONLINE_CALL).  Falls back to inferring
    from `available_days` when the field is missing or null.

    Returns (score, resolved_mode).
    """
    explicit_modes = {"FACE_TO_FACE", "ONLINE_CHAT", "ONLINE_CALL"}

    mentor_pref = mentor.get("communication_preference") or ""
    mentee_pref = mentee.get("communication_preference") or ""

    mentor_mode = (
        mentor_pref if mentor_pref in explicit_modes
        else infer_communication_mode(mentor.get("available_days") or [])
    )
    mentee_mode = (
        mentee_pref if mentee_pref in explicit_modes
        else infer_communication_mode(mentee.get("available_days") or [])
    )

    score, resolved = _resolve_communication_mode(mentor_mode, mentee_mode)
    return score, resolved


# ─────────────────────────────────────────────────────────────────────────────
# 5. MEETING FREQUENCY SCORE
# ─────────────────────────────────────────────────────────────────────────────

def _meeting_frequency_score(mentor: dict, mentee: dict) -> float:
    """
    Estimates meeting frequency from overlapping available days.
    Normalized to a baseline of 3 days/week.

        0 shared days  → 0.00
        1 shared day   → 0.33
        2 shared days  → 0.67
        3+ shared days → 1.00
    """
    mentor_days = set(mentor.get("available_days") or [])
    mentee_days = set(mentee.get("available_days") or [])
    return min(len(mentor_days & mentee_days) / 3.0, 1.0)


# ─────────────────────────────────────────────────────────────────────────────
# 6. EXPERIENCE SCORE
# ─────────────────────────────────────────────────────────────────────────────

def _experience_score(mentor: dict) -> float:
    """
    Estimates mentor experience as normalized [0, 1].
    New mentors with no data receive a neutral 0.5.
    """
    components = []

    prior = mentor.get("prior_mentees_count")
    if prior is not None:
        components.append(min(prior / 10.0, 1.0))

    prev_thesis = mentor.get("prev_mentored_thesis") or []
    if isinstance(prev_thesis, list) and prev_thesis:
        components.append(min(len(prev_thesis) / 10.0, 1.0))
    elif isinstance(prev_thesis, str) and prev_thesis.strip():
        components.append(0.3)

    papers = mentor.get("published_papers") or []
    paper_count = len(papers) if isinstance(papers, list) else 0
    if paper_count > 0:
        components.append(min(paper_count / 5.0, 1.0))

    certs = mentor.get("certifications")
    if certs is not None:
        components.append(min(len(certs) / 3.0, 1.0))

    return float(np.mean(components)) if components else 0.5


# ─────────────────────────────────────────────────────────────────────────────
# 7. GET MATCHED KEYWORDS
# ─────────────────────────────────────────────────────────────────────────────

def _build_direct_mentor_str(mentor: dict) -> str:
    """Keyword string from raw profile fields only — no domain expansion."""
    parts = [
        " ".join(mentor.get("technical_skills") or []),
        " ".join(mentor.get("forte") or []),
        mentor.get("self_description") or "",
    ]
    return clean_text(" ".join(parts))


def _build_direct_mentee_str(mentee: dict) -> str:
    """Keyword string from raw profile fields only — no domain expansion."""
    parts = [
        mentee.get("research_title") or "",
        mentee.get("research_description") or "",
        mentee.get("mentor_preference") or "",
    ]
    return clean_text(" ".join(parts))


def get_matched_keywords(mentor: dict, mentee: dict) -> list[str]:
    """
    Returns shared technical keywords between mentor and mentee.

    Uses only raw profile fields (no domain expansion) so that expansion
    artifacts like "query optimization" or "augmented reality" do not
    appear as matched keywords.

    Priority order:
      1. Terms that appear in both profiles AND are in CS_TECH_VOCAB
      2. Shared bigrams (two-word phrases) not in academic stop words
         — unigrams are excluded to prevent fragments like "machine" and
           "learning" appearing alongside the phrase "machine learning"
    """
    mentor_kw_str = _build_direct_mentor_str(mentor)
    mentee_kw_str = _build_direct_mentee_str(mentee)

    # Priority 1: shared vocabulary hits (most meaningful signal, no cap)
    mentor_vocab = set(_extract_vocab_matches(mentor_kw_str))
    mentee_vocab = set(_extract_vocab_matches(mentee_kw_str))
    shared_vocab = sorted(mentor_vocab & mentee_vocab, key=len, reverse=True)

    # Priority 2: shared bigrams only — avoids fragment/phrase duplication
    def get_bigrams(text: str) -> set[str]:
        words = text.split()
        return {
            f"{words[i]} {words[i+1]}"
            for i in range(len(words) - 1)
            if words[i] not in ACADEMIC_STOP_WORDS
            and words[i+1] not in ACADEMIC_STOP_WORDS
            and len(words[i]) > 3
            and len(words[i+1]) > 3
        }

    shared_bigrams = get_bigrams(mentor_kw_str) & get_bigrams(mentee_kw_str)
    already_seen = set(shared_vocab)
    extras = sorted(
        (bg for bg in shared_bigrams
         if bg not in already_seen
         and not any(bg in v for v in already_seen)),
        key=len, reverse=True
    )

    return shared_vocab + extras


def extract_profile_keywords(profiles: list[dict], is_mentor: bool) -> list[tuple[str, list[str]]]:
    """Returns [(display_name, [keywords])] for terminal logging."""
    result = []
    for p in profiles:
        text = _build_direct_mentor_str(p) if is_mentor else _build_direct_mentee_str(p)
        kws  = _extract_vocab_matches(text)
        name = f"{p.get('first_name', '')} {p.get('last_name', '')}".strip() if is_mentor else p.get("group_name", "")
        result.append((name, kws))
    return result


# ─────────────────────────────────────────────────────────────────────────────
# 8. NORMALIZATION
# ─────────────────────────────────────────────────────────────────────────────

def normalize_matrix(matrix: np.ndarray) -> np.ndarray:
    """Percentile-based normalization (p5 → p95)."""
    flat = matrix.flatten()
    p5   = np.percentile(flat, 5)
    p95  = np.percentile(flat, 95)

    if abs(p95 - p5) < 1e-9:
        return np.ones_like(matrix) * 0.5

    return np.clip((matrix - p5) / (p95 - p5), 0.0, 1.0)


# ─────────────────────────────────────────────────────────────────────────────
# 9. MAIN SCORING ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def compute_weighted_scores(
    mentors: list[dict],
    mentees: list[dict],
    weights: Optional[ScoringWeights] = None,
    return_breakdowns: bool = False,
) -> tuple[np.ndarray, list[list[ScoreBreakdown]] | None]:
    """
    Main scoring pipeline — 5 pillars, weights sum to 1.0.

    Returns:
        scores:     np.ndarray shape (n_mentees, n_mentors) in [0, 1]
        breakdowns: List[List[ScoreBreakdown]] or None
    """
    weights = weights or ScoringWeights()
    print(f"  Scoring {len(mentees)} mentees × {len(mentors)} mentors")
    print(
        f"  Weights → keyword:{weights.keyword_similarity} "
        f"exp:{weights.experience} avail:{weights.availability} "
        f"comm:{weights.communication} freq:{weights.meeting_frequency}"
    )

    # ── Keyword strings ───────────────────────────────────────────────────────
    print("  📝 Extracting and expanding keywords...")
    mentor_kw_strings, mentee_kw_strings = [], []

    for mentor in mentors:
        kw = build_mentor_keyword_string(mentor)
        mentor_kw_strings.append(kw)
        logger.debug("Mentor %s keywords: %s", mentor.get("id"), kw[:100])

    for mentee in mentees:
        kw = build_mentee_keyword_string(mentee)
        mentee_kw_strings.append(kw)
        logger.debug("Mentee %s keywords: %s", mentee.get("id"), kw[:100])

    # ── Keyword similarity ────────────────────────────────────────────────────
    print("  🔍 Computing keyword cosine similarity...")
    kw_similarity = compute_keyword_similarity(mentor_kw_strings, mentee_kw_strings)
    kw_normalized = normalize_matrix(kw_similarity)

    # ── Availability ──────────────────────────────────────────────────────────
    print("  📅 Computing availability scores...")
    avail_matrix = np.array(
        [[_availability_score(mentor, mentee) for mentor in mentors]
         for mentee in mentees],
        dtype=np.float32,
    )

    # ── Experience ────────────────────────────────────────────────────────────
    print("  🎓 Computing experience scores...")
    exp_scores = np.array([_experience_score(m) for m in mentors], dtype=np.float32)
    exp_matrix = np.tile(exp_scores, (len(mentees), 1))

    # ── Communication preference ──────────────────────────────────────────────
    print("  💬 Computing communication preference scores...")
    comm_matrix = np.zeros((len(mentees), len(mentors)), dtype=np.float32)
    comm_modes  = {}   # (i, j) → resolved_mode string for breakdowns

    for i, mentee in enumerate(mentees):
        for j, mentor in enumerate(mentors):
            score, mode        = _communication_score(mentor, mentee)
            comm_matrix[i][j]  = score
            comm_modes[(i, j)] = mode

    # ── Meeting frequency ─────────────────────────────────────────────────────
    print("  📆 Computing meeting frequency scores...")
    freq_matrix = np.array(
        [[_meeting_frequency_score(mentor, mentee) for mentor in mentors]
         for mentee in mentees],
        dtype=np.float32,
    )

    # ── Weighted combination ──────────────────────────────────────────────────
    final_scores = (
        weights.keyword_similarity  * kw_normalized
        + weights.experience        * exp_matrix
        + weights.availability      * avail_matrix
        + weights.communication     * comm_matrix
        + weights.meeting_frequency * freq_matrix
    )
    final_scores = normalize_matrix(final_scores)
    final_scores = np.clip(final_scores * 0.3 + 0.7, 0.7, 1.0)

    # ── Breakdowns ────────────────────────────────────────────────────────────
    breakdowns = None
    if return_breakdowns:
        breakdowns = []
        for i, mentee in enumerate(mentees):
            mentee_breakdowns = []
            for j, mentor in enumerate(mentors):
                pair_expansion = expand_pair(mentor, mentee)
                breakdown = ScoreBreakdown(
                    mentor_id=str(mentor.get("id", j)),
                    mentee_id=str(mentee.get("id", i)),
                    keyword_score=float(kw_normalized[i][j]),
                    availability_score=float(avail_matrix[i][j]),
                    experience_score=float(exp_matrix[i][j]),
                    communication_score=float(comm_matrix[i][j]),
                    meeting_frequency_score=float(freq_matrix[i][j]),
                    final_score=float(final_scores[i][j]),
                    matched_keywords=get_matched_keywords(mentor, mentee),
                    shared_domains=pair_expansion.get("shared_domains", []),
                    matching_hints=pair_expansion.get("matching_hints", []),
                    communication_mode=comm_modes.get((i, j), "FLEXIBLE"),
                )
                mentee_breakdowns.append(breakdown)
            breakdowns.append(mentee_breakdowns)

    return final_scores, breakdowns


# ─────────────────────────────────────────────────────────────────────────────
# DIAGNOSTIC
# ─────────────────────────────────────────────────────────────────────────────

def diagnose_pair(mentor: dict, mentee: dict) -> dict:
    """
    Full per-pair breakdown including communication mode inference.
    Use via: python test_pipeline.py --pair <mentor_idx> <mentee_idx>
    """
    mentor_kw  = build_mentor_keyword_string(mentor)
    mentee_kw  = build_mentee_keyword_string(mentee)
    m_mode     = infer_communication_mode(mentor.get("available_days") or [])
    e_mode     = infer_communication_mode(mentee.get("available_days") or [])
    _, resolved = _resolve_communication_mode(m_mode, e_mode)

    print("\n── Pair Diagnosis ───────────────────────────────────────")
    print(f"  Mentor : {mentor.get('first_name', '')} {mentor.get('last_name', '')}")
    print(f"  Mentee : {mentee.get('group_name', mentee.get('id', '?'))}")
    print(f"\n  Mentor days  : {mentor.get('available_days')}  → {m_mode}")
    print(f"  Mentee days  : {mentee.get('available_days')}  → {e_mode}")
    print(f"  Resolved mode: {resolved}")
    print(f"\n  Mentor keywords : {mentor_kw[:200]}")
    print(f"\n  Mentee keywords : {mentee_kw[:200]}")
    print(f"\n  Shared keywords : {get_matched_keywords(mentor, mentee)}")

    scores, breakdowns = compute_weighted_scores(
        mentors=[mentor], mentees=[mentee], return_breakdowns=True
    )
    bd = breakdowns[0][0].to_dict()

    print(f"\n  Keyword Similarity  : {bd['scores']['keyword_similarity']:.4f}")
    print(f"  Availability        : {bd['scores']['availability']:.4f}")
    print(f"  Experience          : {bd['scores']['experience']:.4f}")
    print(f"  Communication       : {bd['scores']['communication']:.4f}  ({resolved})")
    print(f"  Meeting Frequency   : {bd['scores']['meeting_frequency']:.4f}")
    print(f"  ──────────────────────────────────────────")
    print(f"  Final Score         : {bd['scores']['final']:.4f}")
    print(f"  Shared Domains      : {bd['shared_domains']}")
    print(f"  Matching Hints      : {bd['matching_hints']}")
    print("─────────────────────────────────────────────────────────\n")

    return bd


# ─────────────────────────────────────────────────────────────────────────────
# COMPATIBILITY SHIM
# ─────────────────────────────────────────────────────────────────────────────

def load_model():
    """Keyword pipeline needs no model. Returns None for call-site compatibility."""
    return None
