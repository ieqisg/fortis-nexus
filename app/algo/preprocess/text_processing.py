"""
text_processing.py

Text cleaning and keyword extraction for the mentor-mentee matching pipeline.
Keyword extraction uses TF-IDF with bigram prioritization to prevent
token fragmentation (e.g. "deep learning" selected → "deep" suppressed).
"""

import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer


# ─────────────────────────────────────────────────────────────────────────────
# 1. TEXT CLEANING
# ─────────────────────────────────────────────────────────────────────────────

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ─────────────────────────────────────────────────────────────────────────────
# 2. PROFILE TEXT BUILDERS
# ─────────────────────────────────────────────────────────────────────────────

def build_mentor_text(mentor: dict) -> str:
    """
    Builds a single text string from all mentor profile fields,
    including prev_mentored_thesis for richer keyword extraction.
    """
    skills       = " ".join(mentor.get("technical_skills") or [])
    forte        = " ".join(mentor.get("forte") or [])
    description  = mentor.get("self_description") or ""

    # prev_mentored_thesis: list of thesis title strings or a single string
    prev_thesis  = mentor.get("prev_mentored_thesis") or []
    if isinstance(prev_thesis, str):
        prev_thesis_text = prev_thesis
    elif isinstance(prev_thesis, list):
        prev_thesis_text = " ".join(str(t) for t in prev_thesis)
    else:
        prev_thesis_text = ""

    return f"{skills} {forte} {description} {prev_thesis_text}".strip()


def build_mentee_text(mentee: dict) -> str:
    title       = mentee.get("research_title") or ""
    description = mentee.get("research_description") or ""
    preference  = mentee.get("mentor_preference") or ""
    return f"{title} {description} {preference}".strip()


# ─────────────────────────────────────────────────────────────────────────────
# 3. KEYWORD EXTRACTION
# ─────────────────────────────────────────────────────────────────────────────

def get_profile_keywords(text: str, top_n: int = 20) -> list[str]:
    """
    Extracts top technical keywords using TF-IDF with bigram prioritization.

    Bigrams are selected before unigrams to prevent fragmentation:
    e.g. "deep learning" is selected → standalone "deep" and "learning"
    are suppressed since their tokens are already covered.
    """
    cleaned = clean_text(text)
    if not cleaned.strip():
        return []

    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=500,
        ngram_range=(1, 2),
        min_df=1,
        sublinear_tf=True,
    )

    try:
        tfidf_matrix  = vectorizer.fit_transform([cleaned])
        feature_names = vectorizer.get_feature_names_out()
        scores        = dict(zip(feature_names, tfidf_matrix.toarray()[0]))

        scored_terms = [(term, score) for term, score in scores.items() if score > 0]

        bigrams  = sorted([(t, s) for t, s in scored_terms if len(t.split()) == 2], key=lambda x: x[1], reverse=True)
        unigrams = sorted([(t, s) for t, s in scored_terms if len(t.split()) == 1], key=lambda x: x[1], reverse=True)

        selected       = []
        covered_tokens = set()

        # Bigrams first — more specific signal
        for term, _ in bigrams:
            tokens = set(term.split())
            if not tokens.issubset(covered_tokens):
                selected.append(term)
                covered_tokens.update(tokens)

        # Unigrams only if token not already covered by a bigram
        for term, _ in unigrams:
            if term not in covered_tokens:
                selected.append(term)
                covered_tokens.add(term)

        return selected[:top_n]

    except Exception:
        return cleaned.split()[:top_n]


def get_mentor_keywords(mentor: dict, top_n: int = 20) -> list[str]:
    """
    Extracts keywords from all mentor profile fields,
    including prev_mentored_thesis.
    """
    return get_profile_keywords(build_mentor_text(mentor), top_n)


def get_mentee_keywords(mentee: dict, top_n: int = 20) -> list[str]:
    """Extracts keywords from mentee profile fields."""
    return get_profile_keywords(build_mentee_text(mentee), top_n)


# ─────────────────────────────────────────────────────────────────────────────
# 4. LEGACY TF-IDF EXTRACTION (kept for compatibility)
# ─────────────────────────────────────────────────────────────────────────────

def extract_tfidf_keywords(texts: list[str], top_n: int = 10):
    """
    Batch TF-IDF keyword extraction across multiple documents.
    Used by domain_expander and any external callers.
    """
    cleaned = [clean_text(t) for t in texts]

    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=200,
        ngram_range=(1, 2),
    )
    tfidf_matrix  = vectorizer.fit_transform(cleaned)
    feature_names = vectorizer.get_feature_names_out()

    keywords_per_doc = []
    for row in tfidf_matrix:
        scores       = zip(feature_names, row.toarray()[0])
        sorted_scores = sorted(scores, key=lambda x: x[1], reverse=True)
        keywords     = [word for word, score in sorted_scores if score > 0][:top_n]
        keywords_per_doc.append(keywords)

    return keywords_per_doc, vectorizer, tfidf_matrix
