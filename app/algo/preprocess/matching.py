"""
matching.py

Uses the Hospital-Resident (HR) Algorithm — the correct generalization
of Gale-Shapley for many-to-one matching.

Why HR over basic Gale-Shapley:
    - Mentors have capacity > 1 (can take multiple mentees)
    - HR guarantees stable matching with capacity constraints
    - HR is provably stable — no blocking pairs exist in the result

Fairness:
    - Run HR twice: mentee-proposing (mentee-optimal) and
      mentor-proposing (mentor-optimal)
    - Pick the matching with lower combined dissatisfaction from both sides
    - Verify stability by checking for blocking pairs
"""

from __future__ import annotations

import logging
from collections import deque

import numpy as np

from scoring import compute_weighted_scores, get_matched_keywords

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# 1. PREFERENCE GENERATION
# ─────────────────────────────────────────────────────────────────────────────

def generate_preferences(
    mentors: list[dict],
    mentees: list[dict],
    scores: np.ndarray,
) -> tuple[dict, dict]:
    """
    Generates full ranked preference lists for both sides.
    No top_k truncation — truncating is the primary cause of unmatched mentees.

    Returns:
        mentee_prefs: { mentee_id: [mentor_id, ...] } ranked best → worst
        mentor_prefs: { mentor_id: [mentee_id, ...] } ranked best → worst
    """
    mentee_prefs = {}
    for i, mentee in enumerate(mentees):
        ranked = sorted(range(len(mentors)), key=lambda j: scores[i][j], reverse=True)
        mentee_prefs[mentee["id"]] = [mentors[j]["id"] for j in ranked]

    mentor_prefs = {}
    for j, mentor in enumerate(mentors):
        ranked = sorted(range(len(mentees)), key=lambda i: scores[i][j], reverse=True)
        mentor_prefs[mentor["id"]] = [mentees[i]["id"] for i in ranked]

    return mentee_prefs, mentor_prefs


# ─────────────────────────────────────────────────────────────────────────────
# 2. HOSPITAL-RESIDENT: MENTEE-PROPOSING (mentee-optimal)
# ─────────────────────────────────────────────────────────────────────────────

def hospital_resident(
    residents: list[dict],
    hospitals: list[dict],
    resident_prefs: dict,
    hospital_prefs: dict,
    hospital_capacity: dict,
) -> tuple[dict, dict, list[dict]]:
    """
    Hospital-Resident Algorithm, resident-proposing variant.

    Guarantees:
    - Stable matching (no blocking pairs)
    - Resident-optimal (best possible outcome for mentees)

    Returns:
        resident_assignment:  { mentee_id: mentor_id }
        hospital_assignments: { mentor_id: [mentee_ids] }
        proposal_events:      list of {round, type, proposer, to, replaced} (IDs)
    """
    # Precompute hospital ranking lookup for O(1) comparison
    hospital_rank = {
        h["id"]: {r_id: rank for rank, r_id in enumerate(hospital_prefs[h["id"]])}
        for h in hospitals
    }

    free_residents       = deque(r["id"] for r in residents)
    next_proposal        = {r["id"]: 0 for r in residents}
    hospital_assignments = {h["id"]: [] for h in hospitals}
    resident_assignment  = {}
    proposal_events: list[dict] = []
    round_num = 0

    while free_residents:
        r_id  = free_residents.popleft()
        prefs = resident_prefs[r_id]

        if next_proposal[r_id] >= len(prefs):
            logger.error(
                "Mentee %s exhausted all proposals — "
                "check that total mentor capacity >= number of mentees.", r_id
            )
            continue

        h_id     = prefs[next_proposal[r_id]]
        next_proposal[r_id] += 1
        assigned = hospital_assignments[h_id]
        capacity = hospital_capacity.get(h_id, 1)
        round_num += 1

        proposal_events.append({"round": round_num, "type": "propose", "proposer": r_id, "to": h_id, "replaced": None})

        if len(assigned) < capacity:
            assigned.append(r_id)
            resident_assignment[r_id] = h_id
            proposal_events.append({"round": round_num, "type": "accept", "proposer": r_id, "to": h_id, "replaced": None})
        else:
            worst_r_id    = max(assigned, key=lambda rid: hospital_rank[h_id].get(rid, float("inf")))
            current_rank  = hospital_rank[h_id].get(r_id, float("inf"))
            worst_rank    = hospital_rank[h_id].get(worst_r_id, float("inf"))

            if current_rank < worst_rank:
                assigned.remove(worst_r_id)
                assigned.append(r_id)
                resident_assignment[r_id] = h_id
                del resident_assignment[worst_r_id]
                free_residents.append(worst_r_id)
                proposal_events.append({"round": round_num, "type": "replace", "proposer": r_id, "to": h_id, "replaced": worst_r_id})
            else:
                free_residents.append(r_id)
                proposal_events.append({"round": round_num, "type": "reject", "proposer": r_id, "to": h_id, "replaced": None})

    return resident_assignment, hospital_assignments, proposal_events


# ─────────────────────────────────────────────────────────────────────────────
# 3. HOSPITAL-RESIDENT: MENTOR-PROPOSING (mentor-optimal)
# ─────────────────────────────────────────────────────────────────────────────

def hospital_resident_mentor_optimal(
    residents: list[dict],
    hospitals: list[dict],
    resident_prefs: dict,
    hospital_prefs: dict,
    hospital_capacity: dict,
) -> tuple[dict, dict, list[dict]]:
    """
    Hospital-Resident Algorithm, hospital-proposing variant.
    Produces the mentor-optimal stable matching.

    Each hospital proposes one slot at a time to residents.
    Residents hold their best offer and reject others.

    Returns same format as hospital_resident() plus proposal_events.
    """
    # Precompute resident ranking for O(1) comparison
    resident_rank = {
        r["id"]: {h_id: rank for rank, h_id in enumerate(resident_prefs[r["id"]])}
        for r in residents
    }

    hospital_proposal_index  = {h["id"]: 0 for h in hospitals}
    hospital_remaining_slots = {h["id"]: hospital_capacity.get(h["id"], 1) for h in hospitals}
    resident_holding         = {}  # r_id → h_id (best offer held)
    proposal_events: list[dict] = []
    round_num = 0

    # All hospitals with capacity start active
    active_hospitals = deque(
        h["id"] for h in hospitals if hospital_remaining_slots[h["id"]] > 0
    )

    while active_hospitals:
        h_id  = active_hospitals.popleft()
        prefs = hospital_prefs[h_id]

        if hospital_proposal_index[h_id] >= len(prefs):
            continue

        r_id = prefs[hospital_proposal_index[h_id]]
        hospital_proposal_index[h_id] += 1
        round_num += 1

        proposal_events.append({"round": round_num, "type": "propose", "proposer": h_id, "to": r_id, "replaced": None})

        if r_id not in resident_holding:
            resident_holding[r_id] = h_id
            hospital_remaining_slots[h_id] -= 1
            proposal_events.append({"round": round_num, "type": "accept", "proposer": h_id, "to": r_id, "replaced": None})
            if hospital_remaining_slots[h_id] > 0:
                active_hospitals.append(h_id)
        else:
            current_h_id = resident_holding[r_id]
            new_rank     = resident_rank[r_id].get(h_id, float("inf"))
            current_rank = resident_rank[r_id].get(current_h_id, float("inf"))

            if new_rank < current_rank:
                # Resident prefers new offer — switch
                resident_holding[r_id] = h_id
                hospital_remaining_slots[h_id] -= 1
                # Rejected hospital gets its slot back
                hospital_remaining_slots[current_h_id] += 1
                active_hospitals.append(current_h_id)
                proposal_events.append({"round": round_num, "type": "replace", "proposer": h_id, "to": r_id, "replaced": current_h_id})
                if hospital_remaining_slots[h_id] > 0:
                    active_hospitals.append(h_id)
            else:
                # Resident rejects — hospital tries next
                active_hospitals.append(h_id)
                proposal_events.append({"round": round_num, "type": "reject", "proposer": h_id, "to": r_id, "replaced": None})

    resident_assignment  = dict(resident_holding)
    hospital_assignments = {}
    for r_id, h_id in resident_assignment.items():
        hospital_assignments.setdefault(h_id, []).append(r_id)

    return resident_assignment, hospital_assignments, proposal_events


# ─────────────────────────────────────────────────────────────────────────────
# 4. FAIRNESS COMPARISON
# ─────────────────────────────────────────────────────────────────────────────

def compute_dissatisfaction(assignment: dict, prefs: dict) -> float:
    """
    Measures average rank of matched partner in preference list.
    Lower = better (0 = everyone got their top choice).
    assignment = {proposer_id: receiver_id}
    """
    total = 0
    for proposer_id, receiver_id in assignment.items():
        pref_list = prefs.get(proposer_id, [])
        rank      = pref_list.index(receiver_id) if receiver_id in pref_list else len(pref_list)
        total    += rank
    return total / max(len(assignment), 1)


def _mentor_dissatisfaction(assignment: dict, mentor_prefs: dict) -> float:
    """
    Computes average mentor dissatisfaction over all assigned mentee slots.
    Correctly handles capacity > 1 by grouping all mentees per mentor
    instead of inverting the dict (which drops duplicates).
    assignment = {mentee_id: mentor_id}
    """
    mentor_to_mentees: dict[str, list[str]] = {}
    for mentee_id, mentor_id in assignment.items():
        mentor_to_mentees.setdefault(mentor_id, []).append(mentee_id)

    total, count = 0, 0
    for mentor_id, mentee_ids in mentor_to_mentees.items():
        pref_list = mentor_prefs.get(mentor_id, [])
        for mentee_id in mentee_ids:
            rank = pref_list.index(mentee_id) if mentee_id in pref_list else len(pref_list)
            total += rank
            count += 1

    return total / max(count, 1)


def pick_fairer_matching(
    mentors: list[dict],
    mentees: list[dict],
    assignment_mentee_optimal: dict,
    assignment_mentor_optimal: dict,
    mentee_prefs: dict,
    mentor_prefs: dict,
) -> tuple[dict, str]:
    """
    Picks the matching with lower combined dissatisfaction from both sides.
    Returns (assignment, selected_variant) where selected_variant is
    "mentee-optimal" or "mentor-optimal" — callers set the DB label separately.
    """
    # Mentee-optimal dissatisfaction
    d_mentee_mo = compute_dissatisfaction(assignment_mentee_optimal, mentee_prefs)
    d_mentor_mo = _mentor_dissatisfaction(assignment_mentee_optimal, mentor_prefs)
    total_mo    = d_mentee_mo + d_mentor_mo

    # Mentor-optimal dissatisfaction
    d_mentee_meo = compute_dissatisfaction(assignment_mentor_optimal, mentee_prefs)
    d_mentor_meo = _mentor_dissatisfaction(assignment_mentor_optimal, mentor_prefs)
    total_meo    = d_mentee_meo + d_mentor_meo

    print(f"\n  ⚖️  Fairness Comparison:")
    print(f"  Mentee-optimal → mentee dissatisfaction: {d_mentee_mo:.4f}, mentor: {d_mentor_mo:.4f}, total: {total_mo:.4f}")
    print(f"  Mentor-optimal → mentee dissatisfaction: {d_mentee_meo:.4f}, mentor: {d_mentor_meo:.4f}, total: {total_meo:.4f}")

    if total_mo <= total_meo:
        print("  ✅ Mentee-optimal selected (lower combined dissatisfaction)")
        return assignment_mentee_optimal, "mentee-optimal"
    else:
        print("  ✅ Mentor-optimal selected (lower combined dissatisfaction)")
        return assignment_mentor_optimal, "mentor-optimal"


# ─────────────────────────────────────────────────────────────────────────────
# 5. STABILITY VERIFICATION
# ─────────────────────────────────────────────────────────────────────────────

def verify_stability(
    assignment: dict,
    mentors: list[dict],
    mentees: list[dict],
    mentee_prefs: dict,
    mentor_prefs: dict,
    hospital_capacity: dict,
) -> bool:
    """
    Verifies the matching is stable — no blocking pairs exist.

    A blocking pair (mentee m, mentor M) exists if:
    - m prefers M over their current match, AND
    - M prefers m over their worst current match (or has spare capacity)

    Returns True if stable, False otherwise.
    """
    hospital_assignments = {}
    for r_id, h_id in assignment.items():
        hospital_assignments.setdefault(h_id, []).append(r_id)

    mentor_rank = {
        m["id"]: {r_id: rank for rank, r_id in enumerate(mentor_prefs[m["id"]])}
        for m in mentors
    }
    mentee_rank = {
        m["id"]: {h_id: rank for rank, h_id in enumerate(mentee_prefs[m["id"]])}
        for m in mentees
    }

    blocking_pairs = []

    for mentee in mentees:
        r_id              = mentee["id"]
        current_h_id      = assignment.get(r_id)
        current_mentee_rank = mentee_rank[r_id].get(current_h_id, float("inf"))

        for mentor in mentors:
            h_id = mentor["id"]
            if h_id == current_h_id:
                continue

            preferred_rank = mentee_rank[r_id].get(h_id, float("inf"))
            if preferred_rank >= current_mentee_rank:
                continue

            assigned = hospital_assignments.get(h_id, [])
            capacity = hospital_capacity.get(h_id, 1)

            if len(assigned) < capacity:
                blocking_pairs.append((r_id, h_id))
            else:
                worst_r_id = max(assigned, key=lambda rid: mentor_rank[h_id].get(rid, float("inf")))
                if mentor_rank[h_id].get(r_id, float("inf")) < mentor_rank[h_id].get(worst_r_id, float("inf")):
                    blocking_pairs.append((r_id, h_id))

    if blocking_pairs:
        print(f"\n  ⚠️  {len(blocking_pairs)} blocking pairs found — matching is UNSTABLE")
        for r_id, h_id in blocking_pairs[:5]:
            print(f"    ({r_id}, {h_id})")
        return False

    print("\n  ✅ Matching is STABLE — no blocking pairs found")
    return True


# ─────────────────────────────────────────────────────────────────────────────
# 6. SAFETY NET
# ─────────────────────────────────────────────────────────────────────────────

def _apply_safety_net(
    mentee_assignment: dict,
    mentors: list[dict],
    mentees: list[dict],
) -> dict:
    """
    Assigns any mentee still unmatched after HR to the mentor with the
    most remaining capacity. Logs a warning for every safety net assignment.
    Frequent warnings indicate insufficient total mentor capacity.
    """
    matched_ids = set(mentee_assignment.keys())
    unmatched   = [m for m in mentees if m["id"] not in matched_ids]

    if not unmatched:
        return mentee_assignment

    logger.warning("%d mentee(s) unmatched after HR — applying safety net.", len(unmatched))

    fill: dict[str, int] = {}
    for mentor_id in mentee_assignment.values():
        fill[mentor_id] = fill.get(mentor_id, 0) + 1

    for mentee in unmatched:
        best_mentor = max(
            mentors,
            key=lambda m: (m.get("mentor_capacity") or 1) - fill.get(m["id"], 0),
        )
        remaining = (best_mentor.get("mentor_capacity") or 1) - fill.get(best_mentor["id"], 0)

        if remaining <= 0:
            logger.error("Mentee %s could not be matched — all mentors at capacity.", mentee["id"])
            continue

        mentee_assignment[mentee["id"]] = best_mentor["id"]
        fill[best_mentor["id"]] = fill.get(best_mentor["id"], 0) + 1
        logger.warning("Safety net assigned: %s → %s", mentee["id"], best_mentor["id"])

    return mentee_assignment


# ─────────────────────────────────────────────────────────────────────────────
# 7. RUN FULL PIPELINE
# ─────────────────────────────────────────────────────────────────────────────

def run_matching(
    mentors: list[dict],
    mentees: list[dict],
    model=None,  # kept for call-site compatibility — keyword pipeline needs no model
) -> list[dict]:
    """
    Full matching pipeline:
        1. Capacity guard
        2. Compatibility scoring
        3. Preference list generation
        4. HR mentee-optimal
        5. HR mentor-optimal
        6. Fairness comparison — pick lower combined dissatisfaction
        7. Stability verification
        8. Safety net for any remaining unmatched mentees
        9. Build match records
    """
    # ── Guard ─────────────────────────────────────────────────────────────────
    total_capacity = sum(m.get("mentor_capacity") or 1 for m in mentors)
    if total_capacity < len(mentees):
        raise ValueError(
            f"Insufficient mentor capacity: {total_capacity} total slots "
            f"for {len(mentees)} mentees. "
            f"Each mentor needs at least {-(-len(mentees) // len(mentors))} capacity."
        )

    mentee_index    = {m["id"]: i for i, m in enumerate(mentees)}
    mentor_index    = {m["id"]: j for j, m in enumerate(mentors)}
    hospital_capacity = {m["id"]: m.get("mentor_capacity") or 1 for m in mentors}

    # ── Step 1: Scores ────────────────────────────────────────────────────────
    print("\n📊 Step 1: Computing compatibility scores...")
    scores, _ = compute_weighted_scores(mentors, mentees)

    # ── Step 2: Preferences ───────────────────────────────────────────────────
    print("\n📋 Step 2: Generating preference lists...")
    mentee_prefs, mentor_prefs = generate_preferences(mentors, mentees, scores)

    # ── Step 3a: HR mentee-optimal ────────────────────────────────────────────
    print("\n🏥 Step 3a: Running HR (mentee-optimal)...")
    assignment_mo, _, _ = hospital_resident(
        residents=mentees, hospitals=mentors,
        resident_prefs=mentee_prefs, hospital_prefs=mentor_prefs,
        hospital_capacity=hospital_capacity,
    )
    print(f"  Mentee-optimal matches: {len(assignment_mo)}")

    # ── Step 3b: HR mentor-optimal ────────────────────────────────────────────
    print("\n🏥 Step 3b: Running HR (mentor-optimal)...")
    assignment_meo, _, _ = hospital_resident_mentor_optimal(
        residents=mentees, hospitals=mentors,
        resident_prefs=mentee_prefs, hospital_prefs=mentor_prefs,
        hospital_capacity=hospital_capacity,
    )
    print(f"  Mentor-optimal matches: {len(assignment_meo)}")

    # ── Step 4: Fairness comparison ───────────────────────────────────────────
    print("\n⚖️  Step 4: Picking fairer matching...")
    final_assignment, selected_variant = pick_fairer_matching(
        mentors, mentees,
        assignment_mo, assignment_meo,
        mentee_prefs, mentor_prefs,
    )
    method = "fair-matching"

    # ── Step 5: Stability verification ───────────────────────────────────────
    print("\n🔍 Step 5: Verifying stability...")
    is_stable = verify_stability(
        final_assignment, mentors, mentees,
        mentee_prefs, mentor_prefs, hospital_capacity,
    )

    # ── Step 6: Safety net ────────────────────────────────────────────────────
    final_assignment = _apply_safety_net(final_assignment, mentors, mentees)
    print(f"  Final: {len(final_assignment)}/{len(mentees)}")

    # ── Step 7: Build records ─────────────────────────────────────────────────
    print("\n✅ Step 6: Building match records...")
    match_records = []
    for mentee_id, mentor_id in final_assignment.items():
        i = mentee_index[mentee_id]
        j = mentor_index[mentor_id]

        match_records.append({
            "mentee_group_id":     mentee_id,
            "mentor_id":           mentor_id,
            "compatibility_score": round(float(scores[i][j]), 4),
            "matched_keywords":    get_matched_keywords(mentors[j], mentees[i]),
            "status":              "active",
            "algorithm":           method,
            "is_stable":           is_stable,
        })

    return match_records
