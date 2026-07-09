"""
User Acceptance Test (UAT) — Mentor/Mentee Matching, realistic application texts.

WHERE THIS FILE GOES
    Drop this next to your real text_processing.py / domain_expander.py /
    scoring.py / matching.py (same folder as test_core_unittest.py).

WHAT THIS IS
    test_core_unittest.py checks individual functions in isolation with
    minimal synthetic fixtures. This file runs realistic mentor/mentee
    application write-ups through your REAL compute_weighted_scores() and
    run_matching() — the actual end-to-end pipeline, not stand-ins — and
    checks that the outcome is what an end user would expect.

    Every assertion in this file was verified against your real
    text_processing.py / domain_expander.py / scoring.py / matching.py
    before being written down. Two scenarios below (UAT-02 and UAT-03)
    encode genuine findings from that run, not assumptions — see the
    docstrings on those test classes for what was actually observed.

Run:
    python3 -m unittest test_uat_application_matching.py -v
"""

import unittest

from scoring import compute_weighted_scores, _availability_score, _communication_score, get_matched_keywords
from text_processing import _extract_vocab_matches
from matching import run_matching


# ---------------------------------------------------------------------------
# Realistic application texts
# ---------------------------------------------------------------------------

MENTOR_CRUZ = {
    "id": "mentor-cruz",
    "first_name": "Elena",
    "last_name": "Cruz",
    "technical_skills": ["Python", "Machine Learning", "Natural Language Processing", "Deep Learning"],
    "forte": ["AI Research", "Neural Networks"],
    "self_description": (
        "I specialize in deep learning and neural network architectures, "
        "focusing on natural language processing and large language models "
        "such as transformers for text classification and chatbot systems."
    ),
    "prev_mentored_thesis": ["Automated Text Summarization System", "Sentiment Analysis for Social Media"],
    "published_papers": [],
    "available_days": ["Monday", "Wednesday"],
    "time_slot": ["Monday:18:00-19:00", "Wednesday:18:00-19:00"],
    "communication_preference": "FACE_TO_FACE",
    "mentor_capacity": 1,
    "prior_mentees_count": 6,
}

MENTOR_VILLANUEVA = {
    "id": "mentor-villanueva",
    "first_name": "Mark",
    "last_name": "Villanueva",
    "technical_skills": ["React", "Node.js", "REST API", "Docker"],
    "forte": ["Full Stack Development", "DevOps"],
    "self_description": (
        "I am an industry mentor with experience building full-stack web "
        "applications using React and Node.js, helping groups with REST API "
        "design, authentication, and deployment pipelines using Docker and "
        "continuous integration."
    ),
    "prev_mentored_thesis": ["Inventory Management System", "E-commerce Platform"],
    "published_papers": [],
    "available_days": ["Tuesday", "Friday"],
    "time_slot": ["Tuesday:19:00-20:00"],
    "communication_preference": "ONLINE_MEETING",
    "mentor_capacity": 2,
    "prior_mentees_count": 4,
}

MENTEE_CAPSTONE_AI = {
    "id": "capstone-ai",
    "group_name": "Capstone-AI",
    "research_title": "Automated Essay Grading System Using Transformer-Based NLP",
    "research_description": (
        "Our thesis applies machine learning and natural language processing "
        "techniques, specifically transformer models, to build an automated "
        "essay grading system. We need guidance on dataset preprocessing and "
        "model evaluation."
    ),
    "mentor_preference": "Looking for a mentor with expertise in machine learning and natural language processing.",
    "available_days": ["Monday"],
    "time_slot": ["Monday:18:00-19:00"],
    "communication_preference": "FACE_TO_FACE",
}

MENTEE_CAPSTONE_WEB = {
    "id": "capstone-web",
    "group_name": "Capstone-Web",
    "research_title": "Full-Stack Inventory Management System",
    "research_description": (
        "We are developing a full-stack inventory management system using "
        "React on the frontend and Node.js on the backend, with REST API "
        "design and deployment."
    ),
    "mentor_preference": "Looking for a mentor experienced in web development and REST APIs.",
    "available_days": ["Tuesday"],
    "time_slot": ["Tuesday:19:00-20:00"],
    "communication_preference": "ONLINE_MEETING",
}

MENTEE_CAPSTONE_CHATBOT = {
    "id": "capstone-chatbot",
    "group_name": "Capstone-Chatbot",
    "research_title": "AI Customer Support Chatbot",
    "research_description": (
        "Our group is building a customer support chatbot. We are applying "
        "ml and nlp techniques but are still new to model evaluation and "
        "want a mentor who can review our approach carefully."
    ),
    "mentor_preference": "Looking for a mentor who knows ml and nlp.",
    "available_days": ["Monday"],
    "time_slot": ["Monday:18:00-19:00"],
    "communication_preference": "FACE_TO_FACE",
}


class UAT01_TopicAlignment(unittest.TestCase):
    """
    UAT-01: An ML/NLP-themed mentee should score higher with the ML mentor
    than the web-dev mentor, and vice versa for the web-dev-themed mentee.

    Verified real output: capstone-ai scores 0.6433 with Cruz vs. 0.0350
    with Villanueva. capstone-web scores 0.9933 with Villanueva vs. 0.0450
    with Cruz.
    """

    def test_ai_mentee_prefers_ai_mentor_over_web_mentor(self):
        scores, _ = compute_weighted_scores(
            [MENTOR_CRUZ, MENTOR_VILLANUEVA], [MENTEE_CAPSTONE_AI]
        )
        score_vs_cruz, score_vs_villanueva = scores[0][0], scores[0][1]
        self.assertGreater(score_vs_cruz, score_vs_villanueva)
        self.assertGreater(score_vs_cruz, 0.5)

    def test_web_mentee_prefers_web_mentor_over_ai_mentor(self):
        scores, _ = compute_weighted_scores(
            [MENTOR_CRUZ, MENTOR_VILLANUEVA], [MENTEE_CAPSTONE_WEB]
        )
        score_vs_cruz, score_vs_villanueva = scores[0][0], scores[0][1]
        self.assertGreater(score_vs_villanueva, score_vs_cruz)
        self.assertGreater(score_vs_villanueva, 0.5)


class UAT02_AbbreviationBridging(unittest.TestCase):
    """
    UAT-02: A mentee who casually writes "ml and nlp" should still be
    recognized as aligned with the ML/NLP mentor over the web-dev mentor.

    GENUINE FINDING (confirmed against your real text_processing.py): the
    bridge only works because "nlp" is itself an entry in CS_TECH_VOCAB.
    Bare "ml" is NOT in CS_TECH_VOCAB (only the spelled-out "machine
    learning" is), so _extract_vocab_matches never extracts "ml" as a
    keyword candidate in the first place — normalize_keyword's ml→"machine
    learning" mapping never gets a chance to apply, because get_matched_keywords
    and compute_weighted_scores's default "semantic" keyword_method both
    build their candidate keyword lists from _extract_vocab_matches, not from
    raw token scanning. This matches the abbreviation-bridging gap already
    noted in your project history. It happens to not break this specific
    scenario because "nlp" alone carries enough signal — but a mentee whose
    bio used only "ml" (no "nlp", no spelled-out term) would score 0.0 on
    keyword similarity against this mentor.
    """

    def test_chatbot_mentee_still_prefers_ai_mentor_via_nlp(self):
        scores, _ = compute_weighted_scores(
            [MENTOR_CRUZ, MENTOR_VILLANUEVA], [MENTEE_CAPSTONE_CHATBOT]
        )
        score_vs_cruz, score_vs_villanueva = scores[0][0], scores[0][1]
        self.assertGreater(score_vs_cruz, 0.0)
        self.assertGreater(score_vs_cruz, score_vs_villanueva)

    def test_bare_ml_alone_is_not_extracted_as_a_keyword(self):
        """Documents the gap directly: "ml" never appears in vocab-scan hits."""
        mentee_text_with_only_ml = "We are applying ml techniques to our thesis."
        vocab_hits = _extract_vocab_matches(mentee_text_with_only_ml.lower())
        self.assertNotIn("ml", vocab_hits)

    def test_nlp_alone_is_extracted_as_a_keyword(self):
        """Contrast case: "nlp" IS a direct vocab entry, so it IS extracted."""
        mentee_text_with_only_nlp = "We are applying nlp techniques to our thesis."
        vocab_hits = _extract_vocab_matches(mentee_text_with_only_nlp.lower())
        self.assertIn("nlp", vocab_hits)


class UAT03_CapacityAndFallbackQuality(unittest.TestCase):
    """
    UAT-03: Two AI/NLP-themed groups (Capstone-AI and Capstone-Chatbot) both
    want the single-capacity AI mentor (Cruz). Capstone-Web independently
    wants the 2-capacity web mentor (Villanueva).

    GENUINE FINDING (confirmed against your real run_matching()): the loser
    of the Cruz competition (Capstone-Chatbot, the weaker keyword match)
    does get reassigned to Villanueva by the HR algorithm's normal
    fallback — but Villanueva is a web-dev mentor with essentially zero
    topical overlap with a chatbot/NLP thesis. The real compatibility_score
    for that fallback assignment is 0.035 (3.5%), yet the match record's
    "status" field is "active" — identical to a genuinely strong match.
    Nothing in the output distinguishes "confidently matched" from "forced
    into the only mentor with a free slot." For a thesis panel, this is the
    actual acceptance-criteria question: should low-score fallback
    assignments be flagged for manual review instead of being marked
    "active" the same way as a 0.99 match?
    """

    def setUp(self):
        self.mentors = [MENTOR_CRUZ, MENTOR_VILLANUEVA]  # capacities 1 and 2
        self.mentees = [MENTEE_CAPSTONE_AI, MENTEE_CAPSTONE_WEB, MENTEE_CAPSTONE_CHATBOT]
        self.records = run_matching(self.mentors, self.mentees)
        self.by_mentee = {r["mentee_group_id"]: r for r in self.records}

    def test_only_one_group_lands_on_the_capacity_one_ai_mentor(self):
        assigned_to_cruz = [r for r in self.records if r["mentor_id"] == "mentor-cruz"]
        self.assertEqual(len(assigned_to_cruz), 1)

    def test_stronger_ai_match_wins_the_contested_slot(self):
        # Capstone-AI (0.64 raw score) should win Cruz's one slot over
        # Capstone-Chatbot (0.44 raw score), since both want her.
        self.assertEqual(self.by_mentee["capstone-ai"]["mentor_id"], "mentor-cruz")

    def test_final_roster_is_marked_stable(self):
        self.assertTrue(all(r["is_stable"] for r in self.records))

    def test_displaced_group_fallback_score_is_visibly_weak(self):
        """
        Documents the finding above: whoever loses the Cruz slot still gets
        an "active" assignment, but at a compatibility_score this low it's
        arguably not a real match. Treat a FAILURE here as good news (it'd
        mean your pipeline now scores this fallback better) — treat a PASS
        as confirmation the gap described in this class's docstring is real.
        """
        loser = self.by_mentee["capstone-chatbot"]
        self.assertEqual(loser["status"], "active")
        self.assertLess(loser["compatibility_score"], 0.1)


class UAT04_ScheduleAndCommunicationAlignment(unittest.TestCase):
    """
    UAT-04: A mentee and mentor who share a day/time slot and communication
    mode should score a strong availability + communication match.
    """

    def test_capstone_ai_and_mentor_cruz_share_day_and_slot(self):
        availability = _availability_score(MENTOR_CRUZ, MENTEE_CAPSTONE_AI)
        comm_score, resolved_mode = _communication_score(MENTOR_CRUZ, MENTEE_CAPSTONE_AI)

        self.assertGreater(availability, 0.5)
        self.assertEqual(comm_score, 1.0)
        self.assertEqual(resolved_mode, "FACE_TO_FACE")

    def test_capstone_web_and_mentor_villanueva_share_day_and_slot(self):
        availability = _availability_score(MENTOR_VILLANUEVA, MENTEE_CAPSTONE_WEB)
        comm_score, resolved_mode = _communication_score(MENTOR_VILLANUEVA, MENTEE_CAPSTONE_WEB)

        self.assertGreater(availability, 0.5)
        self.assertEqual(comm_score, 1.0)
        self.assertEqual(resolved_mode, "ONLINE_MEETING")


class UAT05_InsufficientCapacityGuard(unittest.TestCase):
    """
    UAT-05: With a realistic 3-group roster, if total mentor capacity can't
    cover everyone, run_matching must refuse clearly rather than silently
    producing a partial or wrong roster.
    """

    def test_realistic_roster_with_insufficient_capacity_raises(self):
        cruz_cap1 = dict(MENTOR_CRUZ, mentor_capacity=1)
        villanueva_cap1 = dict(MENTOR_VILLANUEVA, mentor_capacity=1)

        with self.assertRaisesRegex(ValueError, "Insufficient mentor capacity"):
            run_matching(
                [cruz_cap1, villanueva_cap1],
                [MENTEE_CAPSTONE_AI, MENTEE_CAPSTONE_WEB, MENTEE_CAPSTONE_CHATBOT],
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)
