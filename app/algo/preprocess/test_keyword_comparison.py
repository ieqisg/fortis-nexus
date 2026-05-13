"""
test_keyword_comparison.py

Side-by-side comparison of three keyword similarity methods:
  tfidf   — current default: full document TF-IDF cosine (with boosting/repetition)
  bow     — Approach A: keyword bag-of-words TF-IDF cosine (clean lists, no repetition)
  avg_max — Approach B: per-keyword average max cosine (char n-grams, handles partial matches)

For each method, prints per-mentor keyword scores for each mentee group,
then summarises accuracy (correct top mentor) and discrimination ratio.

Run from the preprocess directory:
    cd app/algo/preprocess && python test_keyword_comparison.py
"""

import sys

# ── Mock data (same 5 mentors × 10 mentees as test_pipeline_mock.py) ─────────

MENTOR_ANA = {
    "id": "m1", "first_name": "Ana", "last_name": "Reyes",
    "technical_skills": ["machine learning", "natural language processing", "python", "tensorflow"],
    "forte": ["nlp", "text classification", "sentiment analysis"],
    "self_description": "Research in machine learning and NLP for text classification and sentiment analysis.",
    "available_days": ["Monday", "Wednesday"],
    "time_slot": ["9:00-10:00", "13:00-14:00"],
    "communication_preference": "ONLINE_CHAT",
    "prior_mentees_count": 4,
    "prev_mentored_thesis": ["Sentiment analysis using BERT", "NLP chatbot for customer support"],
    "published_papers": [{"title": "Deep Learning for NLP Text Classification", "year": "2023"}],
    "certifications": ["Google ML", "AWS"],
    "mentor_capacity": 2,
}

MENTOR_BEN = {
    "id": "m2", "first_name": "Ben", "last_name": "Cruz",
    "technical_skills": ["web development", "database management", "software engineering", "javascript", "nodejs"],
    "forte": ["full stack development", "REST APIs", "system design"],
    "self_description": "Expert in full-stack web development with databases and software engineering.",
    "available_days": ["Tuesday", "Thursday", "Friday"],
    "time_slot": ["10:00-11:00", "14:00-15:00"],
    "communication_preference": "ONLINE_CHAT",
    "prior_mentees_count": 6,
    "prev_mentored_thesis": ["E-commerce web application", "Grade management system"],
    "published_papers": [{"title": "Web Application Development with REST APIs", "year": "2021"}],
    "certifications": ["AWS Solutions Architect"],
    "mentor_capacity": 3,
}

MENTOR_CAROL = {
    "id": "m3", "first_name": "Carol", "last_name": "Tan",
    "technical_skills": ["algorithms", "data structures", "graph theory", "python", "competitive programming"],
    "forte": ["algorithm design", "stable matching", "graph algorithms"],
    "self_description": "Research in algorithm design, data structures, graph theory, and stable matching.",
    "available_days": ["Monday", "Tuesday"],
    "time_slot": ["7:00-8:00", "12:00-13:00"],
    "communication_preference": "FACE_TO_FACE",
    "prior_mentees_count": 5,
    "prev_mentored_thesis": ["Gale-Shapley algorithm for university admissions", "Graph traversal for social networks"],
    "published_papers": [{"title": "Stable Matching Algorithms in Academic Settings", "year": "2022"}],
    "certifications": ["PMP"],
    "mentor_capacity": 2,
}

MENTOR_DAVE = {
    "id": "m4", "first_name": "Dave", "last_name": "Santos",
    "technical_skills": ["mobile development", "flutter", "android", "ios", "iot"],
    "forte": ["cross-platform apps", "sensor integration", "smart systems"],
    "self_description": "Expert in mobile application development and IoT smart systems.",
    "available_days": ["Wednesday", "Thursday"],
    "time_slot": ["8:00-9:00", "15:00-16:00"],
    "communication_preference": "FACE_TO_FACE",
    "prior_mentees_count": 3,
    "prev_mentored_thesis": ["Flutter health monitoring app", "IoT smart home automation"],
    "published_papers": [{"title": "Cross-Platform Mobile Development with Flutter", "year": "2022"}],
    "certifications": [],
    "mentor_capacity": 2,
}

MENTOR_EVE = {
    "id": "m5", "first_name": "Eve", "last_name": "Lagman",
    "technical_skills": ["computer vision", "image processing", "deep learning", "convolutional neural networks", "python"],
    "forte": ["object detection", "medical imaging", "real-time video analysis"],
    "self_description": "Research in computer vision, image processing, and deep learning for visual recognition.",
    "available_days": ["Monday", "Wednesday", "Friday"],
    "time_slot": ["9:00-10:00", "11:00-12:00"],
    "communication_preference": "ONLINE_CHAT",
    "prior_mentees_count": 5,
    "prev_mentored_thesis": ["Deep learning for medical image classification", "Object detection for campus security"],
    "published_papers": [{"title": "Convolutional Neural Networks for Medical Image Analysis", "year": "2023"}],
    "certifications": ["NVIDIA Deep Learning"],
    "mentor_capacity": 3,
}

MENTORS = [MENTOR_ANA, MENTOR_BEN, MENTOR_CAROL, MENTOR_DAVE, MENTOR_EVE]
MENTOR_NAMES = {m["id"]: f"{m['first_name']} {m['last_name']}" for m in MENTORS}

MENTEES = [
    {
        "id": "g1", "group_name": "SentiBot",
        "research_title": "NLP Sentiment Analysis Chatbot using Deep Learning",
        "research_description": "Building a chatbot that uses NLP and deep learning to classify sentiment in text.",
        "mentor_preference": "Looking for a mentor with expertise in natural language processing, sentiment analysis, machine learning, and python.",
        "available_days": ["Monday", "Wednesday"],
        "time_slot": ["9:00-10:00"],
        "communication_preference": "ONLINE_CHAT",
        "expected": "m1",
    },
    {
        "id": "g2", "group_name": "ShopEase",
        "research_title": "E-Commerce Web Application with Inventory Management",
        "research_description": "A full-stack web application for e-commerce with database-driven inventory management and REST API backend.",
        "mentor_preference": "Looking for a mentor with expertise in web development, database management, software engineering, and REST APIs.",
        "available_days": ["Tuesday", "Thursday"],
        "time_slot": ["10:00-11:00"],
        "communication_preference": "ONLINE_CHAT",
        "expected": "m2",
    },
    {
        "id": "g3", "group_name": "MatchSys",
        "research_title": "Stable Matching System using Gale-Shapley Algorithm",
        "research_description": "Implementing the Gale-Shapley stable matching algorithm for university admissions matching.",
        "mentor_preference": "Looking for a mentor with expertise in algorithms, data structures, stable matching, and Gale-Shapley.",
        "available_days": ["Monday", "Tuesday"],
        "time_slot": ["7:00-8:00"],
        "communication_preference": "FACE_TO_FACE",
        "expected": "m3",
    },
    {
        "id": "g4", "group_name": "HealthTrack",
        "research_title": "Flutter Mobile App for Health Monitoring",
        "research_description": "A cross-platform mobile application built with Flutter for real-time health monitoring.",
        "mentor_preference": "Looking for a mentor with expertise in mobile development, Flutter, cross-platform apps.",
        "available_days": ["Wednesday", "Thursday"],
        "time_slot": ["8:00-9:00"],
        "communication_preference": "FACE_TO_FACE",
        "expected": "m4",
    },
    {
        "id": "g5", "group_name": "MedVision",
        "research_title": "Deep Learning for Medical Image Classification",
        "research_description": "Using convolutional neural networks and deep learning for classifying medical images.",
        "mentor_preference": "Looking for a mentor with expertise in computer vision, deep learning, image processing, and CNNs.",
        "available_days": ["Monday", "Wednesday"],
        "time_slot": ["9:00-10:00"],
        "communication_preference": "ONLINE_CHAT",
        "expected": "m5",
    },
    {
        "id": "g6", "group_name": "GradePortal",
        "research_title": "Web-Based Grade Management System for Universities",
        "research_description": "A web application for managing student grades with database integration and user authentication.",
        "mentor_preference": "Looking for a mentor with expertise in web development, software engineering, and database management.",
        "available_days": ["Tuesday", "Friday"],
        "time_slot": ["14:00-15:00"],
        "communication_preference": "ONLINE_CHAT",
        "expected": "m2",
    },
    {
        "id": "g7", "group_name": "GraphNet",
        "research_title": "Graph Algorithms for Social Network Analysis",
        "research_description": "Applying graph theory and graph traversal algorithms to analyze social network structures.",
        "mentor_preference": "Looking for a mentor with expertise in graph theory, algorithms, data structures, and network analysis.",
        "available_days": ["Monday", "Tuesday"],
        "time_slot": ["12:00-13:00"],
        "communication_preference": "FACE_TO_FACE",
        "expected": "m3",
    },
    {
        "id": "g8", "group_name": "SmartHome",
        "research_title": "IoT Smart Home Automation System",
        "research_description": "An IoT-based smart home system using sensors and mobile interface for home automation.",
        "mentor_preference": "Looking for a mentor with expertise in IoT, sensor integration, mobile development, and smart systems.",
        "available_days": ["Wednesday", "Thursday"],
        "time_slot": ["15:00-16:00"],
        "communication_preference": "FACE_TO_FACE",
        "expected": "m4",
    },
    {
        "id": "g9", "group_name": "MLAdvisor",
        "research_title": "Machine Learning System for Academic Course Advising",
        "research_description": "Using machine learning and NLP to build an intelligent academic advising system.",
        "mentor_preference": "Looking for a mentor with expertise in machine learning, python, and natural language processing.",
        "available_days": ["Monday", "Wednesday"],
        "time_slot": ["13:00-14:00"],
        "communication_preference": "ONLINE_CHAT",
        "expected": "m1",
    },
    {
        "id": "g10", "group_name": "CampusCam",
        "research_title": "Object Detection for Campus Security using Computer Vision",
        "research_description": "Real-time object detection using deep learning and computer vision for campus surveillance.",
        "mentor_preference": "Looking for a mentor with expertise in computer vision, object detection, deep learning, and image processing.",
        "available_days": ["Monday", "Friday"],
        "time_slot": ["11:00-12:00"],
        "communication_preference": "ONLINE_CHAT",
        "expected": "m5",
    },
]

# ── Comparison logic ──────────────────────────────────────────────────────────

METHODS = ["tfidf", "bow", "avg_max"]
METHOD_LABELS = {
    "tfidf":   "tfidf   (current: full-doc TF-IDF)",
    "bow":     "bow     (Approach A: keyword BOW cosine)",
    "avg_max": "avg_max (Approach B: per-kw avg max cosine)",
}

def get_kw_scores_for_method(mentor: dict, mentee: dict, method: str) -> float:
    """Compute ONLY the keyword similarity score (no weighting) for a pair."""
    from scoring import (
        _extract_mentor_kw_list, _extract_mentee_kw_list,
        _kw_similarity_bow, _kw_similarity_avg_max,
        build_mentor_keyword_string, build_mentee_keyword_string,
        compute_keyword_similarity,
    )
    if method == "bow":
        return _kw_similarity_bow(
            _extract_mentor_kw_list(mentor),
            _extract_mentee_kw_list(mentee),
        )
    elif method == "avg_max":
        return _kw_similarity_avg_max(
            _extract_mentor_kw_list(mentor),
            _extract_mentee_kw_list(mentee),
        )
    else:
        sim = compute_keyword_similarity(
            [build_mentor_keyword_string(mentor)],
            [build_mentee_keyword_string(mentee)],
        )
        return float(sim[0][0])


def run_comparison() -> None:
    print("=" * 72)
    print("  Keyword Similarity Method Comparison")
    print("  Methods: tfidf (current) | bow (Approach A) | avg_max (Approach B)")
    print("=" * 72)

    method_correct = {m: 0 for m in METHODS}
    method_disc    = {m: [] for m in METHODS}

    for mentee in MENTEES:
        expected_id   = mentee["expected"]
        expected_name = MENTOR_NAMES[expected_id]
        print(f"\nMentee: {mentee['group_name']} (expected: {expected_name})")
        print(f"  {'Mentor':<18} {'tfidf':>8} {'bow':>8} {'avg_max':>9}")
        print(f"  {'-'*18} {'-'*8} {'-'*8} {'-'*9}")

        scores: dict[str, dict[str, float]] = {m: {} for m in METHODS}

        for mentor in MENTORS:
            mid = mentor["id"]
            for method in METHODS:
                scores[method][mid] = get_kw_scores_for_method(mentor, mentee, method)

            marker = " ← expected" if mid == expected_id else ""
            row = (
                f"  {MENTOR_NAMES[mid]:<18}"
                f" {scores['tfidf'][mid]:>8.4f}"
                f" {scores['bow'][mid]:>8.4f}"
                f" {scores['avg_max'][mid]:>9.4f}"
                f"{marker}"
            )
            print(row)

        # Accuracy & discrimination per method
        for method in METHODS:
            sorted_mentors = sorted(MENTORS, key=lambda m: scores[method][m["id"]], reverse=True)
            top_id = sorted_mentors[0]["id"]
            second_score = scores[method][sorted_mentors[1]["id"]] if len(sorted_mentors) > 1 else 0.0
            top_score    = scores[method][top_id]

            correct = top_id == expected_id
            if correct:
                method_correct[method] += 1

            disc = top_score / second_score if second_score > 0 else float("inf")
            method_disc[method].append(disc)

            tick = "✓" if correct else "✗"
            print(f"  [{method:>7}] top={MENTOR_NAMES[top_id]:<18} {tick}  disc={disc:.2f}x")

    # ── Summary ────────────────────────────────────────────────────────────────
    n = len(MENTEES)
    print("\n" + "=" * 72)
    print("  SUMMARY")
    print(f"  {'Method':<10} {'Correct':>8} {'Accuracy':>10} {'Avg disc':>10}")
    print(f"  {'-'*10} {'-'*8} {'-'*10} {'-'*10}")
    for method in METHODS:
        correct  = method_correct[method]
        avg_disc = sum(d for d in method_disc[method] if d != float("inf")) / n
        label    = METHOD_LABELS[method]
        print(f"  {method:<10} {correct:>5}/{n:<2}  {correct/n*100:>8.1f}%  {avg_disc:>9.2f}x")
        print(f"            → {label}")
    print("=" * 72)


if __name__ == "__main__":
    run_comparison()
