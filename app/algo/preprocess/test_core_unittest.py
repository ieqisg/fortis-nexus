"""
Standard-library unit tests for the Python matching engine.

Run from the project root:
    python3 -m unittest app.algo.preprocess.test_core_unittest

Or run from this directory:
    python3 -m unittest test_core_unittest.py
"""

import unittest
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from domain_expander import detect_domains, expand_domains
from matching import (
    generate_preferences,
    hospital_resident,
    run_matching,
    verify_stability,
)
from scoring import (
    ScoringWeights,
    _availability_score,
    _communication_score,
    apply_top1_boost,
    infer_communication_mode,
)
from text_processing import clean_text, normalize_keyword


class TextProcessingTests(unittest.TestCase):
    def test_clean_text_lowercases_removes_punctuation_and_stopwords(self):
        cleaned = clean_text("The AI-powered system, with CNNs and LLMs!")

        self.assertNotIn("the", cleaned.split())
        self.assertNotIn("with", cleaned.split())
        self.assertIn("ai", cleaned)
        self.assertIn("cnn", cleaned)
        self.assertIn("llm", cleaned)
        self.assertNotIn("-", cleaned)
        self.assertNotIn("!", cleaned)

    def test_normalize_keyword_maps_abbreviations(self):
        self.assertEqual(normalize_keyword("ml"), "machine learning")
        self.assertEqual(normalize_keyword("NLP"), "natural language processing")
        self.assertEqual(normalize_keyword("custom topic"), "custom topic")


class DomainExpansionTests(unittest.TestCase):
    def test_detect_and_expand_domains(self):
        domains = detect_domains(
            "A machine learning and stable matching system for adviser allocation."
        )
        expanded = expand_domains(domains)

        self.assertIn("machine learning", domains)
        self.assertIn("stable matching", domains)
        self.assertIn("neural networks", expanded)
        self.assertIn("hospital resident", expanded)


class ScoringUtilityTests(unittest.TestCase):
    def test_scoring_weights_must_sum_to_one(self):
        ScoringWeights()

        with self.assertRaises(ValueError):
            ScoringWeights(keyword_similarity=0.5)

    def test_infer_communication_mode_from_days(self):
        self.assertEqual(infer_communication_mode(["Tuesday"]), "ONLINE_MEETING")
        self.assertEqual(infer_communication_mode(["Monday"]), "FACE_TO_FACE")
        self.assertEqual(infer_communication_mode(["Monday", "Friday"]), "FLEXIBLE")
        self.assertEqual(infer_communication_mode([]), "FLEXIBLE")

    def test_communication_score_normalizes_legacy_online_values(self):
        mentor = {"communication_preference": "ONLINE_CHAT", "available_days": []}
        mentee = {"communication_preference": "ONLINE_MEETING", "available_days": []}

        score, resolved = _communication_score(mentor, mentee)

        self.assertEqual(score, 1.0)
        self.assertEqual(resolved, "ONLINE_MEETING")

    def test_availability_score_combines_day_overlap_and_slot_jaccard(self):
        mentor = {
            "available_days": ["Monday", "Tuesday"],
            "time_slot": ["Monday:7:00-8:00", "Tuesday:8:00-9:00"],
        }
        mentee = {
            "available_days": ["Monday"],
            "time_slot": ["Monday:7:00-8:00"],
        }

        self.assertAlmostEqual(_availability_score(mentor, mentee), 0.8)

    def test_top1_boost_preserves_shape_and_clips_to_one(self):
        scores = np.array([[0.98, 0.20], [0.40, 0.90]], dtype=np.float32)

        boosted = apply_top1_boost(scores, boost=0.05)

        self.assertEqual(boosted.shape, scores.shape)
        self.assertAlmostEqual(float(boosted[0, 0]), 1.0)
        self.assertAlmostEqual(float(boosted[1, 1]), 0.9999999, places=5)
        self.assertAlmostEqual(float(scores[0, 0]), 0.98, places=5)


class MatchingAlgorithmTests(unittest.TestCase):
    def setUp(self):
        self.mentors = [
            {"id": "mentor-a", "mentor_capacity": 1},
            {"id": "mentor-b", "mentor_capacity": 1},
        ]
        self.mentees = [
            {"id": "group-1"},
            {"id": "group-2"},
        ]
        self.scores = np.array(
            [
                [0.90, 0.10],
                [0.20, 0.80],
            ],
            dtype=np.float32,
        )

    def test_generate_preferences_sorts_scores_descending_for_both_sides(self):
        mentee_prefs, mentor_prefs = generate_preferences(
            self.mentors,
            self.mentees,
            self.scores,
        )

        self.assertEqual(mentee_prefs["group-1"], ["mentor-a", "mentor-b"])
        self.assertEqual(mentee_prefs["group-2"], ["mentor-b", "mentor-a"])
        self.assertEqual(mentor_prefs["mentor-a"], ["group-1", "group-2"])
        self.assertEqual(mentor_prefs["mentor-b"], ["group-2", "group-1"])

    def test_hospital_resident_respects_capacity_and_replaces_worse_match(self):
        residents = [{"id": "group-1"}, {"id": "group-2"}]
        hospitals = [{"id": "mentor-a"}]
        resident_prefs = {
            "group-1": ["mentor-a"],
            "group-2": ["mentor-a"],
        }
        hospital_prefs = {"mentor-a": ["group-2", "group-1"]}
        hospital_capacity = {"mentor-a": 1}

        assignment, hospital_assignments, events = hospital_resident(
            residents,
            hospitals,
            resident_prefs,
            hospital_prefs,
            hospital_capacity,
        )

        self.assertEqual(assignment, {"group-2": "mentor-a"})
        self.assertEqual(hospital_assignments, {"mentor-a": ["group-2"]})
        self.assertTrue(any(event["type"] == "replace" for event in events))

    def test_verify_stability_identifies_stable_and_unstable_assignments(self):
        mentee_prefs = {
            "group-1": ["mentor-a", "mentor-b"],
            "group-2": ["mentor-b", "mentor-a"],
        }
        mentor_prefs = {
            "mentor-a": ["group-1", "group-2"],
            "mentor-b": ["group-2", "group-1"],
        }
        capacity = {"mentor-a": 1, "mentor-b": 1}

        stable, blocking_pairs = verify_stability(
            {"group-1": "mentor-a", "group-2": "mentor-b"},
            self.mentors,
            self.mentees,
            mentee_prefs,
            mentor_prefs,
            capacity,
        )
        unstable, unstable_pairs = verify_stability(
            {"group-1": "mentor-b", "group-2": "mentor-a"},
            self.mentors,
            self.mentees,
            mentee_prefs,
            mentor_prefs,
            capacity,
        )

        self.assertTrue(stable)
        self.assertEqual(blocking_pairs, 0)
        self.assertFalse(unstable)
        self.assertGreater(unstable_pairs, 0)

    def test_run_matching_raises_when_total_capacity_is_insufficient(self):
        mentors = [{"id": "mentor-a", "mentor_capacity": 1}]
        mentees = [{"id": "group-1"}, {"id": "group-2"}]

        with self.assertRaisesRegex(ValueError, "Insufficient mentor capacity"):
            run_matching(mentors, mentees)


if __name__ == "__main__":
    unittest.main()
