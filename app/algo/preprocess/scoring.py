import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from text_processing import (
    build_mentor_text,
    build_mentee_text,
    clean_text,
    extract_tfidf_keywords,
    get_bert_embeddings_batched,
    load_bert_model
)
from sklearn.feature_extraction.text import TfidfVectorizer

# ─────────────────────────────────────────────
# 1. BERT COSINE SIMILARITY
# ─────────────────────────────────────────────

import faiss
import numpy as np

def compute_bert_similarity_faiss(
    mentor_embeddings: np.ndarray,
    mentee_embeddings: np.ndarray,
    top_k: int = None
) -> np.ndarray:
    """
    Uses FAISS approximate nearest neighbor search
    O(n log n) instead of O(n²)
    top_k: only compute similarity against top k mentors per mentee
           if None, compares all (still faster than naive cosine)
    """
    dims = mentor_embeddings.shape[1]
    top_k = top_k or len(mentor_embeddings)

    # build FAISS index
    index = faiss.IndexFlatIP(dims)  # Inner Product = cosine sim for normalized vectors
    index.add(mentor_embeddings.astype("float32"))

    # search
    similarities, indices = index.search(mentee_embeddings.astype("float32"), top_k)

    # reconstruct full matrix
    n_mentees = len(mentee_embeddings)
    n_mentors = len(mentor_embeddings)
    full_matrix = np.zeros((n_mentees, n_mentors))

    for i in range(n_mentees):
        for rank, j in enumerate(indices[i]):
            full_matrix[i][j] = similarities[i][rank]

    return full_matrix

# ─────────────────────────────────────────────
# 2. TF-IDF KEYWORD OVERLAP SCORE
# ─────────────────────────────────────────────

def compute_tfidf_similarity(mentor_texts: list[str], mentee_texts: list[str]) -> np.ndarray:
    """
    Fits TF-IDF on all texts combined, then computes cosine similarity
    between mentee and mentor vectors
    """
    all_texts = [clean_text(t) for t in mentor_texts + mentee_texts]
    
    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=200,
        ngram_range=(1, 2)
    )
    tfidf_matrix = vectorizer.fit_transform(all_texts)
    
    mentor_vectors = tfidf_matrix[:len(mentor_texts)]
    mentee_vectors = tfidf_matrix[len(mentor_texts):]
    
    similarity = cosine_similarity(mentee_vectors, mentor_vectors)
    return similarity

# ─────────────────────────────────────────────
# 3. AVAILABILITY SCORE
# ─────────────────────────────────────────────

def compute_availability_score(mentor: dict, mentee: dict) -> float:
    """
    Returns a score between 0-1 based on overlapping days and time slots
    """
    mentor_days = set(mentor.get("available_days") or [])
    mentee_days = set(mentee.get("available_days") or [])
    mentor_slots = set(mentor.get("time_slot") or [])
    mentee_slots = set(mentee.get("time_slot") or [])

    if not mentor_days or not mentee_days:
        return 0.0

    day_overlap = len(mentor_days & mentee_days) / max(len(mentor_days | mentee_days), 1)
    slot_overlap = len(mentor_slots & mentee_slots) / max(len(mentor_slots | mentee_slots), 1)

    return (day_overlap + slot_overlap) / 2

# ─────────────────────────────────────────────
# 4. WEIGHTED FINAL SCORE
# ─────────────────────────────────────────────

def compute_weighted_scores(
    mentors, mentees, tokenizer, model,
    bert_weight=0.6, tfidf_weight=0.3, availability_weight=0.1,
    batch_size=32
):
    mentor_texts = [build_mentor_text(m) for m in mentors]
    mentee_texts = [build_mentee_text(m) for m in mentees]

    print("  Computing BERT embeddings in batches...")
    all_texts = mentor_texts + mentee_texts
    # ← batched instead of all at once
    all_embeddings = get_bert_embeddings_batched(all_texts, tokenizer, model, batch_size)
    mentor_embeddings = all_embeddings[:len(mentors)]
    mentee_embeddings = all_embeddings[len(mentors):]
    bert_scores = cosine_similarity(mentee_embeddings, mentor_embeddings)

    print("  Computing TF-IDF similarity...")
    tfidf_scores = compute_tfidf_similarity(mentor_texts, mentee_texts)

    print("  Computing availability scores...")
    availability_scores = np.zeros((len(mentees), len(mentors)))
    for i, mentee in enumerate(mentees):
        for j, mentor in enumerate(mentors):
            availability_scores[i][j] = compute_availability_score(mentor, mentee)

    return (
        bert_weight * bert_scores +
        tfidf_weight * tfidf_scores +
        availability_weight * availability_scores
    )

# ─────────────────────────────────────────────
# 5. GET MATCHED KEYWORDS
# ─────────────────────────────────────────────

def get_matched_keywords(mentor: dict, mentee: dict, top_n: int = 5) -> list[str]:
    mentor_text = clean_text(build_mentor_text(mentor))
    mentee_text = clean_text(build_mentee_text(mentee))

    try:
        vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
        tfidf = vectorizer.fit_transform([mentor_text, mentee_text])
        feature_names = vectorizer.get_feature_names_out()
        mentor_scores = dict(zip(feature_names, tfidf[0].toarray()[0]))
        mentee_scores = dict(zip(feature_names, tfidf[1].toarray()[0]))

        common = {
            word: (mentor_scores[word] + mentee_scores[word]) / 2
            for word in mentor_scores
            if word in mentee_scores
            and mentor_scores[word] > 0
            and mentee_scores[word] > 0
        }
        return sorted(common, key=common.get, reverse=True)[:top_n]
    except:
        return []

# ─────────────────────────────────────────────
# TEST
# ─────────────────────────────────────────────

if __name__ == "__main__":
    sample_mentors = [
        {
            "id": "mentor-1",
            "first_name": "Dr. Maria",
            "last_name": "Santos",
            "technical_skills": ["Python", "Machine Learning", "NLP"],
            "forte": ["AI Research", "Deep Learning"],
            "self_description": "I specialize in natural language processing and computer vision.",
            "available_days": ["Monday", "Wednesday"],
            "time_slot": ["9:00-10:00", "10:00-11:00"],
            "mentor_capacity": 2
        },
        {
            "id": "mentor-2",
            "first_name": "Prof. Jose",
            "last_name": "Reyes",
            "technical_skills": ["Web Development", "React", "Node.js"],
            "forte": ["Software Engineering", "Agile"],
            "self_description": "Passionate about full-stack development and agile methodologies.",
            "available_days": ["Tuesday", "Thursday"],
            "time_slot": ["1:00-2:00", "2:00-3:00"],
            "mentor_capacity": 2
        }
    ]

    sample_mentees = [
        {
            "id": "mentee-1",
            "group_name": "Group Alpha",
            "research_title": "AI-Powered Mentor Matching System",
            "research_description": "Using NLP and machine learning to match students with mentors based on research interests.",
            "mentor_preference": "Looking for a mentor with expertise in AI and NLP.",
            "available_days": ["Monday", "Wednesday"],
            "time_slot": ["9:00-10:00"]
        },
        {
            "id": "mentee-2",
            "group_name": "Group Beta",
            "research_title": "E-Commerce Web Platform",
            "research_description": "Building a full stack web application for e-commerce using React and Node.js.",
            "mentor_preference": "Looking for a mentor with web development experience.",
            "available_days": ["Tuesday"],
            "time_slot": ["1:00-2:00"]
        }
    ]

    print("🤖 Loading BERT model...")
    tokenizer, model = load_bert_model()

    print("\n📊 Computing weighted scores...")
    scores = compute_weighted_scores(sample_mentors, sample_mentees, tokenizer, model)

    print("\n✅ Compatibility Matrix (mentees x mentors):")
    print(f"{'':20} {'Dr. Maria':15} {'Prof. Jose':15}")
    for i, mentee in enumerate(sample_mentees):
        row = f"{mentee['group_name']:20}"
        for j in range(len(sample_mentors)):
            row += f"{scores[i][j]:.4f}{'':9}"
        print(row)

    print("\n🔑 Matched Keywords:")
    for mentee in sample_mentees:
        for mentor in sample_mentors:
            keywords = get_matched_keywords(mentor, mentee)
            print(f"  {mentee['group_name']} ↔ {mentor['first_name']}: {keywords}")
