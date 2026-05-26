"""
scoring.py

5-pillar scoring pipeline:

    Pillar                   Weight
    ────────────────────────────────
    keyword_similarity        0.75   main compatibility signal
    experience                0.10   mentor background & history
    availability              0.10   overlapping days/time slots
    communication_preference  0.025  online vs face-to-face match
    meeting_frequency         0.025  how often they can realistically meet
    ────────────────────────────────
    Total                     1.00

Communication preference rules (inferred from available_days):
    Tuesday, Friday          → ONLINE_MEETING
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
    normalize_keyword,
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
        Any day in {Tuesday, Friday}          → ONLINE_MEETING
        Days only in {Mon, Wed, Thu, Sat}     → FACE_TO_FACE
        No days                               → FLEXIBLE

    Returns: "ONLINE_MEETING" | "FACE_TO_FACE" | "FLEXIBLE"
    """
    days       = set(available_days or [])
    has_online = bool(days & _ONLINE_DAYS)
    has_f2f    = bool(days & _FACE_TO_FACE_DAYS)

    if has_online:
        return "ONLINE_MEETING"
    if has_f2f:
        return "FACE_TO_FACE"
    return "FLEXIBLE"


def _resolve_communication_mode(mode_a: str, mode_b: str) -> tuple[float, str]:
    """
    Returns (compatibility_score, resolved_mode) for a mentor-mentee pair.

    Score rules (FACE_TO_FACE / ONLINE_MEETING / FLEXIBLE):
        Same value                        → 1.0
        Either FLEXIBLE                   → 0.8  (can adapt)
        FACE_TO_FACE vs ONLINE_MEETING    → 0.2  (misaligned medium)

    Resolved mode:
        Both same    → that mode
        One FLEXIBLE → the other's specific mode
        Different    → FLEXIBLE
    """
    if mode_a == mode_b:
        return 1.0, mode_a
    if mode_a == "FLEXIBLE":
        return 0.8, mode_b
    if mode_b == "FLEXIBLE":
        return 0.8, mode_a
    return 0.2, "FLEXIBLE"


# ─────────────────────────────────────────────────────────────────────────────
# KEYWORD SIMILARITY THRESHOLD
# ─────────────────────────────────────────────────────────────────────────────

KW_SIMILARITY_THRESHOLD: float = 0.45
"""
Minimum cosine similarity for two keywords to be considered semantically related.
At word-level TF-IDF:
  "machine learning" ↔ "deep learning"            → ~0.45–0.55 (share "learning")
  "neural network"   ↔ "convolutional neural net" → ~0.55–0.70
  "python"           ↔ "java"                      → 0.0 (no shared tokens)
After normalize_keyword(), "nlp" == "natural language processing" → 1.0
"""


# ─────────────────────────────────────────────────────────────────────────────
# WEIGHTS
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ScoringWeights:
    """
    Pillar weights — must sum to 1.0.

        keyword_similarity    0.75
        experience            0.10
        availability          0.10
        communication         0.025
        meeting_frequency     0.025
    """
    keyword_similarity: float = 0.75
    experience:         float = 0.10
    availability:       float = 0.10
    communication:      float = 0.025
    meeting_frequency:  float = 0.025

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

    return clean_text(f"{boosted} {prev_thesis_text} {' '.join(keywords)}")


def build_mentee_keyword_string(mentee: dict) -> str:
    keywords = get_mentee_keywords(mentee, top_n=20)

    title      = mentee.get("research_title") or ""
    preference = mentee.get("mentor_preference") or ""
    boosted    = f"{title} {title} {title} {preference} {preference} {preference}"

    return clean_text(f"{boosted} {' '.join(keywords)}")


# ─────────────────────────────────────────────────────────────────────────────
# 2. KEYWORD SIMILARITY — THREE METHODS
# ─────────────────────────────────────────────────────────────────────────────

def _extract_mentor_kw_list(mentor: dict) -> list[str]:
    """Clean keyword list for a mentor: explicit skills + forte + extracted keywords."""
    skills = [clean_text(s) for s in (mentor.get("technical_skills") or [])]
    forte  = [clean_text(f) for f in (mentor.get("forte") or [])]
    kws    = get_mentor_keywords(mentor, top_n=20)
    seen: set[str] = set()
    result: list[str] = []
    for kw in skills + forte + kws:
        if kw and kw not in seen:
            seen.add(kw)
            result.append(kw)
    return result


def _extract_mentee_kw_list(mentee: dict) -> list[str]:
    """Clean keyword list for a mentee: extracted keywords (title + description + preference)."""
    kws = get_mentee_keywords(mentee, top_n=20)
    seen: set[str] = set()
    result: list[str] = []
    for kw in kws:
        if kw and kw not in seen:
            seen.add(kw)
            result.append(kw)
    return result


def _kw_similarity_bow(mentor_kws: list[str], mentee_kws: list[str]) -> float:
    """
    Approach A — keyword bag-of-words cosine.
    Joins keyword lists into clean strings (no repetition), TF-IDF vectorizes,
    returns cosine similarity ∈ [0, 1].
    """
    if not mentor_kws or not mentee_kws:
        return 0.0
    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        min_df=1,
        sublinear_tf=True,
        analyzer="word",
    )
    try:
        mat = vectorizer.fit_transform([" ".join(mentor_kws), " ".join(mentee_kws)])
        return float(cosine_similarity(mat[1:2], mat[0:1])[0][0])
    except Exception:
        return 0.0


def _kw_similarity_avg_max(mentor_kws: list[str], mentee_kws: list[str]) -> float:
    """
    Approach B — per-keyword average max cosine.
    For each mentee keyword, compute character-level TF-IDF cosine with every
    mentor keyword and take the max. Average those best-match scores.
    Score ∈ [0, 1]. Handles partial matches (e.g. 'nlp' ~ 'natural language processing').
    """
    if not mentee_kws or not mentor_kws:
        return 0.0
    all_kws = mentee_kws + mentor_kws
    vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 4), min_df=1)
    try:
        mat = vectorizer.fit_transform(all_kws)
        n_mentee = len(mentee_kws)
        sim = cosine_similarity(mat[:n_mentee], mat[n_mentee:])
        return float(sim.max(axis=1).mean())
    except Exception:
        return 0.0


def _kw_similarity_semantic(
    mentor_kws: list[str],
    mentee_kws: list[str],
    threshold: float = KW_SIMILARITY_THRESHOLD,
) -> tuple[float, int]:
    """
    Two-step keyword matching that guarantees exact vocab intersections are counted.

    Step 1 — exact: normalized mentee keywords that appear verbatim in the mentor
             list are counted immediately; no TF-IDF needed.
    Step 2 — semantic: remaining unmatched mentee keywords are compared via pairwise
             TF-IDF cosine against all mentor keywords; any row with max >= threshold
             adds to the count.

    This ensures Priority-1 exact matches (same as get_matched_keywords) are never
    missed due to TF-IDF corpus artifacts.

    Returns (score, matched_count).
    """
    if not mentor_kws or not mentee_kws:
        return 0.0, 0

    m_norm = [normalize_keyword(k) for k in mentor_kws]
    e_norm = [normalize_keyword(k) for k in mentee_kws]

    # Step 1: exact normalized intersections (guaranteed match)
    m_set = set(m_norm)
    exact_matched = {ek for ek in e_norm if ek in m_set}
    exact_count = len(exact_matched)

    # Step 2: semantic near-matches for remaining mentee keywords
    remaining_e = [ek for ek in e_norm if ek not in exact_matched]
    semantic_extra = 0
    if remaining_e:
        vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            min_df=1,
            sublinear_tf=True,
            analyzer="word",
        )
        try:
            mat = vectorizer.fit_transform(remaining_e + m_norm)
            n_r = len(remaining_e)
            sub_sim = cosine_similarity(mat[:n_r], mat[n_r:])
            semantic_extra = int((sub_sim.max(axis=1) >= threshold).sum())
        except Exception:
            pass

    matched_count = exact_count + semantic_extra
    if not matched_count:
        return 0.0, 0
    _KW_TIER = {1: 0.35, 2: 0.60, 3: 0.85}
    score = _KW_TIER.get(matched_count, 1.0)
    return score, matched_count


def _kw_sim_from_sets(mentor_norm: set[str], mentee_norm: set[str]) -> float:
    """
    Keyword similarity from pre-normalized vocab sets.
    Blends two coverage perspectives:
      - mentee_cov: how much of the mentee's needs the mentor covers
      - min_cov:    how well the smaller vocabulary is matched (specialist fit)
    Averaging the two rewards mentors who fully cover their own niche even
    when the mentee's research is broader.
    """
    if not mentor_norm or not mentee_norm:
        return 0.0
    intersection = len(mentor_norm & mentee_norm)
    if not intersection:
        return 0.0
    mentee_cov = intersection / len(mentee_norm)
    min_cov    = intersection / min(len(mentor_norm), len(mentee_norm))
    return min((mentee_cov + min_cov) / 2, 1.0)


def _kw_similarity_matched_vocab(mentor: dict, mentee: dict) -> float:
    """
    Keyword score via synonym-normalized vocab intersection.
    Denominator is mentee vocab size (mentee-coverage semantics).
    """
    mentor_vocab = {normalize_keyword(k)
                    for k in _extract_vocab_matches(_build_direct_mentor_str(mentor))}
    mentee_vocab = {normalize_keyword(k)
                    for k in _extract_vocab_matches(_build_direct_mentee_str(mentee))}
    if not mentee_vocab:
        return 0.0
    return _kw_sim_from_sets(mentor_vocab, mentee_vocab)


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
    """
    Availability overlap for days (0.6) and time slots (0.4).
    Days use smaller-set coverage: intersection / min(|mentor_days|, |mentee_days|).
    This rewards genuine schedule alignment without penalising either side
    for listing more available days. Time slots keep Jaccard (union denominator).
    """
    mentor_days  = set(mentor.get("available_days") or [])
    mentee_days  = set(mentee.get("available_days") or [])
    mentor_slots = set(mentor.get("time_slot") or [])
    mentee_slots = set(mentee.get("time_slot") or [])

    if not mentor_days or not mentee_days:
        return 0.0

    slot_union = mentor_slots | mentee_slots

    day_overlap = len(mentor_days & mentee_days)
    day_score   = day_overlap / min(len(mentor_days), len(mentee_days))
    slot_score  = (
        len(mentor_slots & mentee_slots) / len(slot_union)
        if slot_union else 0.0
    )

    return 0.6 * day_score + 0.4 * slot_score


# ─────────────────────────────────────────────────────────────────────────────
# 4. COMMUNICATION PREFERENCE SCORE
# ─────────────────────────────────────────────────────────────────────────────

def _normalize_comm_pref(pref: str) -> str:
    """Normalizes legacy ONLINE_CHAT / ONLINE_CALL values to ONLINE_MEETING."""
    if pref in ("ONLINE_CHAT", "ONLINE_CALL"):
        return "ONLINE_MEETING"
    return pref


def _communication_score(mentor: dict, mentee: dict) -> tuple[float, str]:
    """
    Scores communication mode alignment between mentor and mentee.

    Uses the explicit `communication_preference` field when present
    (FACE_TO_FACE | ONLINE_MEETING).  Falls back to inferring from
    `available_days` when the field is missing or null.
    Legacy values ONLINE_CHAT / ONLINE_CALL are normalized to ONLINE_MEETING.

    Returns (score, resolved_mode).
    """
    explicit_modes = {"FACE_TO_FACE", "ONLINE_MEETING"}

    mentor_raw  = _normalize_comm_pref(mentor.get("communication_preference") or "")
    mentee_raw  = _normalize_comm_pref(mentee.get("communication_preference") or "")

    mentor_mode = (
        mentor_raw if mentor_raw in explicit_modes
        else infer_communication_mode(mentor.get("available_days") or [])
    )
    mentee_mode = (
        mentee_raw if mentee_raw in explicit_modes
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

    years = mentor.get("experience")
    if years is not None:
        try:
            components.append(min(int(years) / 15.0, 1.0))
        except (TypeError, ValueError):
            pass

    return float(np.mean(components)) if components else 0.5


# ─────────────────────────────────────────────────────────────────────────────
# 7. GET MATCHED KEYWORDS
# ─────────────────────────────────────────────────────────────────────────────

def _build_direct_mentor_str(mentor: dict) -> str:
    """Keyword string from raw profile fields only — no domain expansion."""
    papers = mentor.get("published_papers") or []
    papers_text = " ".join(
        p.get("title", "") if isinstance(p, dict) else str(p)
        for p in papers
    )
    prev_thesis = mentor.get("prev_mentored_thesis") or []
    if isinstance(prev_thesis, str):
        prev_thesis_text = prev_thesis
    elif isinstance(prev_thesis, list):
        prev_thesis_text = " ".join(str(t) for t in prev_thesis)
    else:
        prev_thesis_text = ""
    parts = [
        " ".join(mentor.get("technical_skills") or []),
        " ".join(mentor.get("forte") or []),
        mentor.get("self_description") or "",
        papers_text,
        prev_thesis_text,
    ]
    return clean_text(" ".join(parts))


def _build_direct_mentee_str(mentee: dict) -> str:
    """
    Keyword string from core research fields only.
    mentor_preference is excluded here: it describes the desired mentor, not the
    mentee's own research focus, so it should not appear as a 'matched keyword'.
    build_mentee_text (used for TF-IDF scoring) still includes all three fields.
    """
    parts = [
        mentee.get("research_title") or "",
        mentee.get("research_description") or "",
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
    # Normalize abbreviations (e.g. "ml" ↔ "machine learning") before intersecting.
    mentor_raw  = _extract_vocab_matches(mentor_kw_str)
    mentee_raw  = _extract_vocab_matches(mentee_kw_str)
    mentor_norm = {normalize_keyword(k): k for k in mentor_raw}
    mentee_norm = {normalize_keyword(k): k for k in mentee_raw}
    shared_norm = set(mentor_norm) & set(mentee_norm)
    # Surface the longer of the two forms (prefer "machine learning" over "ml")
    shared_vocab = sorted(
        (max(mentor_norm[n], mentee_norm[n], key=len) for n in shared_norm),
        key=len, reverse=True,
    )

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

    # Priority 3: semantic near-matches via TF-IDF cosine
    # Mentee keywords not covered by exact/bigram matches that have a cosine
    # similarity >= KW_SIMILARITY_THRESHOLD with any mentor keyword.
    mentor_all_kws = _extract_vocab_matches(_build_direct_mentor_str(mentor))
    mentee_all_kws = _extract_vocab_matches(_build_direct_mentee_str(mentee))
    if mentor_all_kws and mentee_all_kws:
        already = set(shared_vocab) | {bg for bg in extras}
        m_norm_list = [normalize_keyword(k) for k in mentor_all_kws]
        e_norm_list = [normalize_keyword(k) for k in mentee_all_kws]
        try:
            vec = TfidfVectorizer(
                stop_words="english", ngram_range=(1, 2), min_df=1, sublinear_tf=True
            )
            mat = vec.fit_transform(e_norm_list + m_norm_list)
            n_e = len(e_norm_list)
            sim_mat = cosine_similarity(mat[:n_e], mat[n_e:])
            for idx, ek in enumerate(mentee_all_kws):
                if ek in already:
                    continue
                best = float(sim_mat[idx].max())
                if best >= KW_SIMILARITY_THRESHOLD:
                    already.add(ek)
                    extras.append(ek)
        except Exception:
            pass

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

def apply_top1_boost(scores: np.ndarray, boost: float = 0.05) -> np.ndarray:
    """
    Adds `boost` to each mentee's top-ranked mentor and each mentor's
    top-ranked mentee before preference lists are built, making top-1
    preferences stickier in the HR algorithm.

    Original scores are unchanged — callers should keep a separate reference
    for display/storage and only pass boosted scores to generate_preferences().

    Mutual top-1 pairs (each other's #1) receive the boost from both directions.
    Results are clipped to [0, 1].
    """
    boosted = scores.copy().astype(np.float32)
    for i in range(boosted.shape[0]):           # per mentee → their top mentor
        j = int(np.argmax(boosted[i]))
        boosted[i, j] = min(boosted[i, j] + boost, 1.0)
    for j in range(boosted.shape[1]):           # per mentor → their top mentee
        i = int(np.argmax(boosted[:, j]))
        boosted[i, j] = min(boosted[i, j] + boost, 1.0)
    return boosted


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
    keyword_method: str = "semantic",
) -> tuple[np.ndarray, list[list[ScoreBreakdown]] | None]:
    """
    Main scoring pipeline — 5 pillars, weights sum to 1.0.

    keyword_method:
        "semantic"      — default: pairwise TF-IDF cosine per keyword with threshold
        "matched_vocab" — exact CS-vocab intersection with synonym normalization
        "tfidf"         — full document TF-IDF cosine (with boosting)
        "bow"           — Approach A: keyword bag-of-words TF-IDF cosine
        "avg_max"       — Approach B: per-keyword average max cosine (char n-grams)

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
        f"  [keyword_method={keyword_method}]"
    )

    # ── Keyword similarity ────────────────────────────────────────────────────
    print(f"  📝 Extracting keywords and computing similarity [{keyword_method}]...")

    # Vocab sets pre-computed here and reused for the keyword-count bonus below
    # to avoid O(n×m) repeated calls to _extract_vocab_matches.
    _mentor_vocab_sets: list[set[str]] | None = None
    _mentee_vocab_sets: list[set[str]] | None = None

    _semantic_kw_counts: np.ndarray | None = None  # populated by "semantic" path

    if keyword_method == "semantic":
        mentor_kw_lists = [_extract_vocab_matches(_build_direct_mentor_str(m)) for m in mentors]
        mentee_kw_lists = [_extract_vocab_matches(_build_direct_mentee_str(me)) for me in mentees]
        _semantic_results = [
            [_kw_similarity_semantic(mentor_kw_lists[j], mentee_kw_lists[i])
             for j in range(len(mentors))]
            for i in range(len(mentees))
        ]
        kw_normalized = np.array(
            [[r[0] for r in row] for row in _semantic_results],
            dtype=np.float32,
        )
        _semantic_kw_counts = np.array(
            [[r[1] for r in row] for row in _semantic_results],
            dtype=int,
        )
    elif keyword_method == "matched_vocab":
        _mentor_vocab_sets = [
            {normalize_keyword(k) for k in _extract_vocab_matches(_build_direct_mentor_str(m))}
            for m in mentors
        ]
        _mentee_vocab_sets = [
            {normalize_keyword(k) for k in _extract_vocab_matches(_build_direct_mentee_str(me))}
            for me in mentees
        ]
        kw_normalized = np.array(
            [[_kw_sim_from_sets(_mentor_vocab_sets[j], _mentee_vocab_sets[i])
              for j in range(len(mentors))]
             for i in range(len(mentees))],
            dtype=np.float32,
        )
    elif keyword_method in ("bow", "avg_max"):
        mentor_kw_lists = [_extract_mentor_kw_list(m) for m in mentors]
        mentee_kw_lists = [_extract_mentee_kw_list(m) for m in mentees]
        fn = _kw_similarity_bow if keyword_method == "bow" else _kw_similarity_avg_max
        kw_normalized = np.array(
            [[fn(mk, ek) for mk in mentor_kw_lists] for ek in mentee_kw_lists],
            dtype=np.float32,
        )
    else:  # "tfidf"
        mentor_kw_strings: list[str] = []
        mentee_kw_strings: list[str] = []
        for mentor in mentors:
            kw = build_mentor_keyword_string(mentor)
            mentor_kw_strings.append(kw)
            logger.debug("Mentor %s keywords: %s", mentor.get("id"), kw[:100])
        for mentee in mentees:
            kw = build_mentee_keyword_string(mentee)
            mentee_kw_strings.append(kw)
            logger.debug("Mentee %s keywords: %s", mentee.get("id"), kw[:100])
        kw_normalized = compute_keyword_similarity(mentor_kw_strings, mentee_kw_strings)

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

    # ── Soft keyword bonus ────────────────────────────────────────────────────
    # >= 1 shared keyword → +0.02; >= 2 → +0.04; >= 4 → +0.08.
    # Additive rather than a hard floor so all 5 pillars remain meaningful
    # even for pairs with keyword overlap.
    if _semantic_kw_counts is not None:
        # Reuse counts from semantic scoring pass — avoids redundant computation
        kw_counts = _semantic_kw_counts
    elif _mentor_vocab_sets is not None and _mentee_vocab_sets is not None:
        # Reuse pre-computed sets (matched_vocab path)
        kw_counts = np.array(
            [[len(_mentor_vocab_sets[j] & _mentee_vocab_sets[i])
              for j in range(len(mentors))]
             for i in range(len(mentees))],
            dtype=int,
        )
    else:
        kw_counts = np.array(
            [[len(get_matched_keywords(mentor, mentee)) for mentor in mentors]
             for mentee in mentees],
            dtype=int,
        )
    kw_bonus = np.where(
        kw_counts >= 4, 0.08,
        np.where(kw_counts >= 2, 0.04,
        np.where(kw_counts >= 1, 0.02, 0.0)),
    ).astype(np.float32)
    final_scores = np.clip(final_scores + kw_bonus, 0.0, 1.0)

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
