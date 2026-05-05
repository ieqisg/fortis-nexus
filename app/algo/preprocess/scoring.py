"""
scoring.py

Simplified keyword-based scoring pipeline:
1. text_processing extracts technical keywords from profiles
2. domain_expander enriches keywords with domain expansions
3. TF-IDF vectorization on keyword strings
4. Cosine similarity for compatibility scoring
5. Weighted combination with availability score
"""

from __future__ import annotations

import logging
import numpy as np
from dataclasses import dataclass, field
from typing import Optional

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler

from text_processing import (
    get_mentor_keywords,
    get_mentee_keywords,
    clean_text,
    build_mentor_text,
    build_mentee_text
)
from domain_expander import expand_pair

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# WEIGHTS
# ─────────────────────────────────────────────

@dataclass
class ScoringWeights:
    """Pillar weights — must sum to 1.0."""
    keyword_similarity: float = 0.70  # main signal
    availability: float = 0.20
    experience: float = 0.10

    def __post_init__(self):
        total = self.keyword_similarity + self.availability + self.experience
        if not abs(total - 1.0) < 1e-6:
            raise ValueError(f"Weights must sum to 1.0, got {total:.4f}")

# ─────────────────────────────────────────────
# SCORE BREAKDOWN
# ─────────────────────────────────────────────

@dataclass
class ScoreBreakdown:
    mentor_id: str
    mentee_id: str
    keyword_score: float
    availability_score: float
    experience_score: float
    final_score: float
    matched_keywords: list[str] = field(default_factory=list)
    shared_domains: list[str] = field(default_factory=list)
    matching_hints: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "mentor_id": self.mentor_id,
            "mentee_id": self.mentee_id,
            "scores": {
                "keyword_similarity": round(self.keyword_score, 4),
                "availability": round(self.availability_score, 4),
                "experience": round(self.experience_score, 4),
                "final": round(self.final_score, 4),
            },
            "matched_keywords": self.matched_keywords,
            "shared_domains": self.shared_domains,
            "matching_hints": self.matching_hints,
        }

# ─────────────────────────────────────────────
# 1. BUILD KEYWORD STRINGS
# ─────────────────────────────────────────────

def _dedup_keywords(keyword_lists: list[list[str]]) -> list[str]:
    """
    Merges multiple keyword lists into one deduplicated list.
    Treats each keyword as a phrase — deduplicates on normalized form.
    Preserves the order of first appearance.
    """
    seen = set()
    result = []
    for kw_list in keyword_lists:
        for kw in kw_list:
            # normalize: lowercase, collapse whitespace
            normalized = " ".join(kw.lower().split())
            if normalized and normalized not in seen:
                seen.add(normalized)
                result.append(normalized)
    return result


def build_mentor_keyword_string(mentor: dict) -> str:
    keywords = get_mentor_keywords(mentor, top_n=20)

    # boost technical_skills and forte by repeating 3x
    # so they carry more weight in TF-IDF
    skills = " ".join(mentor.get("technical_skills") or [])
    forte = " ".join(mentor.get("forte") or [])
    boosted = f"{skills} {skills} {skills} {forte} {forte} {forte}"

    dummy_mentee = {"research_title": "", "research_description": "", "mentor_preference": ""}
    expansion = expand_pair(mentor, dummy_mentee)
    expanded_kw = expansion.get("mentor_expanded", {}).get("expanded_keywords", [])
    domains = expansion.get("mentor_expanded", {}).get("domains", [])

    unique = _dedup_keywords([keywords, expanded_kw, domains])
    return clean_text(f"{boosted} {' '.join(unique)}")


def build_mentee_keyword_string(mentee: dict) -> str:
    keywords = get_mentee_keywords(mentee, top_n=20)

    # boost research_title and mentor_preference by repeating 3x
    title = mentee.get("research_title") or ""
    preference = mentee.get("mentor_preference") or ""
    boosted = f"{title} {title} {title} {preference} {preference} {preference}"

    dummy_mentor = {"technical_skills": [], "forte": [], "self_description": ""}
    expansion = expand_pair(dummy_mentor, mentee)
    expanded_kw = expansion.get("mentee_expanded", {}).get("expanded_keywords", [])
    domains = expansion.get("mentee_expanded", {}).get("domains", [])
    shared = expansion.get("shared_domains", [])

    unique = _dedup_keywords([keywords, expanded_kw, domains, shared])
    return clean_text(f"{boosted} {' '.join(unique)}")
# ─────────────────────────────────────────────
# 2. KEYWORD COSINE SIMILARITY
# ─────────────────────────────────────────────

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
        # ← add these for better signal
        analyzer="word",
        strip_accents="unicode",
        token_pattern=r"(?u)\b\w[\w\-]+\b",  # catches "gale-shapley" as one token
    )

    tfidf_matrix = vectorizer.fit_transform(all_texts)
    mentor_vectors = tfidf_matrix[:len(mentor_kw_strings)]
    mentee_vectors = tfidf_matrix[len(mentor_kw_strings):]

    return cosine_similarity(mentee_vectors, mentor_vectors)
# ─────────────────────────────────────────────
# 3. AVAILABILITY SCORE
# ─────────────────────────────────────────────

def _availability_score(mentor: dict, mentee: dict) -> float:
    mentor_days = set(mentor.get("available_days") or [])
    mentee_days = set(mentee.get("available_days") or [])

    if not mentor_days or not mentee_days:
        return 0.0

    day_overlap = len(mentor_days & mentee_days) / len(mentor_days | mentee_days)

    # parse "Monday:9:00-10:00" → extract slot per day
    def parse_slots(time_slots: list, days_overlap: set) -> dict:
        """Returns { day: [slots] } only for overlapping days"""
        result = {}
        for entry in (time_slots or []):
            if ":" in entry:
                parts = entry.split(":")
                day = parts[0]
                slot = ":".join(parts[1:])
            else:
                # legacy format — just a slot with no day prefix
                continue
            if day in days_overlap:
                result.setdefault(day, []).append(slot)
        return result

    overlapping_days = mentor_days & mentee_days

    mentor_slots_by_day = parse_slots(mentor.get("time_slot") or [], overlapping_days)
    mentee_slots_by_day = parse_slots(mentee.get("time_slot") or [], overlapping_days)

    # compute slot overlap per shared day
    slot_scores = []
    for day in overlapping_days:
        m_slots = set(mentor_slots_by_day.get(day, []))
        e_slots = set(mentee_slots_by_day.get(day, []))
        union = m_slots | e_slots
        if union:
            slot_scores.append(len(m_slots & e_slots) / len(union))
        else:
            slot_scores.append(0.0)

    slot_overlap = sum(slot_scores) / len(slot_scores) if slot_scores else 0.0

    return 0.6 * day_overlap + 0.4 * slot_overlap

# ─────────────────────────────────────────────
# 4. EXPERIENCE SCORE
# ─────────────────────────────────────────────

def _experience_score(mentor: dict) -> float:
    components = []

    prior = mentor.get("prior_mentees_count")
    if prior is not None:
        components.append(min(prior / 10.0, 1.0))

    papers = mentor.get("published_papers_count")
    if papers is not None:
        components.append(min(papers / 5.0, 1.0))

    certs = mentor.get("certifications")
    if certs is not None:
        components.append(min(len(certs) / 3.0, 1.0))

    return float(np.mean(components)) if components else 0.5

# ─────────────────────────────────────────────
# 5. GET MATCHED KEYWORDS
# ─────────────────────────────────────────────

def get_matched_keywords(
    mentor: dict,
    mentee: dict,
    top_n: int = 5,
) -> list[str]:
    mentor_kw_str = build_mentor_keyword_string(mentor)
    mentee_kw_str = build_mentee_keyword_string(mentee)

    # extract both unigrams and bigrams for matching
    def get_ngrams(text: str) -> set[str]:
        words = text.split()
        unigrams = {w for w in words if len(w) > 3}
        bigrams = {f"{words[i]} {words[i+1]}" for i in range(len(words)-1)}
        return unigrams | bigrams

    mentor_kw = get_ngrams(mentor_kw_str)
    mentee_kw = get_ngrams(mentee_kw_str)
    shared = mentor_kw & mentee_kw

    # filter short/noisy words
    shared = [w for w in shared if len(w) > 3]
    return sorted(shared)[:top_n]

# ─────────────────────────────────────────────
# 6. NORMALIZE SCORES
# ─────────────────────────────────────────────

def normalize_matrix(matrix: np.ndarray) -> np.ndarray:
    """
    Percentile-based normalization instead of min-max.
    Stretches the middle of the distribution more aggressively
    so scores don't cluster near 0.
    """
    flat = matrix.flatten()
    p5 = np.percentile(flat, 5)    # bottom 5% treated as 0
    p95 = np.percentile(flat, 95)  # top 5% treated as 1

    if abs(p95 - p5) < 1e-9:
        return np.ones_like(matrix) * 0.5

    normalized = (matrix - p5) / (p95 - p5)
    return np.clip(normalized, 0.0, 1.0)


# ─────────────────────────────────────────────
# 7. MAIN SCORING ENTRY POINT
# ─────────────────────────────────────────────

def compute_weighted_scores(
    mentors: list[dict],
    mentees: list[dict],
    weights: Optional[ScoringWeights] = None,
    return_breakdowns: bool = False,
) -> tuple[np.ndarray, list[list[ScoreBreakdown]] | None]:
    """
    Main scoring pipeline:
    1. Extract keywords via text_processing
    2. Expand keywords via domain_expander
    3. TF-IDF vectorize keyword strings
    4. Cosine similarity matrix
    5. Combine with availability + experience weights
    6. Normalize to [0, 1]
    """
    weights = weights or ScoringWeights()

    print(f"  Scoring {len(mentees)} mentees x {len(mentors)} mentors")

    # ── Step 1: Build keyword strings ──────────────────────────────────────
    print("  📝 Extracting and expanding keywords...")
    mentor_kw_strings = []
    for mentor in mentors:
        kw_str = build_mentor_keyword_string(mentor)
        mentor_kw_strings.append(kw_str)
        logger.debug("Mentor %s keywords: %s", mentor.get("id"), kw_str[:100])

    mentee_kw_strings = []
    for mentee in mentees:
        kw_str = build_mentee_keyword_string(mentee)
        mentee_kw_strings.append(kw_str)
        logger.debug("Mentee %s keywords: %s", mentee.get("id"), kw_str[:100])

    # ── Step 2: Keyword cosine similarity ──────────────────────────────────
    print("  🔍 Computing keyword cosine similarity...")
    kw_similarity = compute_keyword_similarity(mentor_kw_strings, mentee_kw_strings)
    kw_normalized = normalize_matrix(kw_similarity)

    # ── Step 3: Availability matrix ────────────────────────────────────────
    print("  📅 Computing availability scores...")
    avail_matrix = np.array([
        [_availability_score(mentor, mentee) for mentor in mentors]
        for mentee in mentees
    ], dtype=np.float32)

    # ── Step 4: Experience scores ───────────────────────────────────────────
    print("  🎓 Computing experience scores...")
    exp_scores = np.array([_experience_score(m) for m in mentors], dtype=np.float32)
    exp_matrix = np.tile(exp_scores, (len(mentees), 1))

    # ── Step 5: Weighted combination ───────────────────────────────────────
    final_scores = (
        weights.keyword_similarity * kw_normalized +
        weights.availability * avail_matrix +
        weights.experience * exp_matrix
    )

    # normalize final scores
    final_scores = normalize_matrix(final_scores)

    # ── Step 6: Breakdowns ─────────────────────────────────────────────────
    breakdowns = None
    if return_breakdowns:
        breakdowns = []
        for i, mentee in enumerate(mentees):
            mentee_breakdowns = []
            for j, mentor in enumerate(mentors):
                pair_expansion = expand_pair(mentor, mentee)
                keywords = get_matched_keywords(mentor, mentee)
                breakdown = ScoreBreakdown(
                    mentor_id=str(mentor.get("id", j)),
                    mentee_id=str(mentee.get("id", i)),
                    keyword_score=float(kw_normalized[i][j]),
                    availability_score=float(avail_matrix[i][j]),
                    experience_score=float(exp_matrix[i][j]),
                    final_score=float(final_scores[i][j]),
                    matched_keywords=keywords,
                    shared_domains=pair_expansion.get("shared_domains", []),
                    matching_hints=pair_expansion.get("matching_hints", []),
                )
                mentee_breakdowns.append(breakdown)
            breakdowns.append(mentee_breakdowns)

    return final_scores, breakdowns

# ─────────────────────────────────────────────
# DIAGNOSTIC
# ─────────────────────────────────────────────

def diagnose_pair(mentor: dict, mentee: dict) -> dict:
    """Debug a single pair — shows keyword strings and scores."""
    mentor_kw = build_mentor_keyword_string(mentor)
    mentee_kw = build_mentee_keyword_string(mentee)

    print("\n── Keyword Diagnosis ────────────────────────────────────")
    print(f"  Mentor : {mentor.get('first_name', '')} {mentor.get('last_name', '')}")
    print(f"  Mentee : {mentee.get('group_name', '')}")
    print(f"\n  Mentor keywords: {mentor_kw[:200]}")
    print(f"\n  Mentee keywords: {mentee_kw[:200]}")
    print(f"\n  Shared keywords: {get_matched_keywords(mentor, mentee)}")

    scores, breakdowns = compute_weighted_scores(
        mentors=[mentor],
        mentees=[mentee],
        return_breakdowns=True,
    )

    bd = breakdowns[0][0].to_dict()
    print(f"\n  Keyword Similarity : {bd['scores']['keyword_similarity']:.4f}")
    print(f"  Availability       : {bd['scores']['availability']:.4f}")
    print(f"  Experience         : {bd['scores']['experience']:.4f}")
    print(f"  Final Score        : {bd['scores']['final']:.4f}")
    print(f"  Shared Domains     : {bd['shared_domains']}")
    print(f"  Matching Hints     : {bd['matching_hints']}")
    print("─────────────────────────────────────────────────────────\n")
    return bd


def load_model():
    """
    Keyword-based pipeline needs no model.
    Returns None for compatibility with main.py and matching.py.
    """
    return None

# ─────────────────────────────────────────────
# TEST
# ─────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    

   
