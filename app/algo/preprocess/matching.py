"""
matching.py

Uses Hospital-Resident (HR) Algorithm — the correct generalization
of Gale-Shapley for many-to-one matching.

Why HR over basic Gale-Shapley:
- Mentors have capacity > 1 (can take multiple mentees)
- Basic GS doesn't handle capacity correctly
- HR guarantees mentee-optimal stable matching
- HR is provably stable — no pair would prefer each other over current match

Fairness addition:
- Run HR twice (mentee-proposing + mentor-optimal)
- Compare and pick the matching with lower combined dissatisfaction
"""

import numpy as np
from scoring import compute_weighted_scores, get_matched_keywords

# ─────────────────────────────────────────────
# 1. PREFERENCE GENERATION
# ─────────────────────────────────────────────

def generate_preferences(
    mentors: list[dict],
    mentees: list[dict],
    scores: np.ndarray,
) -> tuple[dict, dict]:
    """
    Generate ranked preference lists for both sides.
    No top_k truncation — every mentee can propose to every mentor.
    Truncating risks leaving mentees unmatched unnecessarily.
    """
    mentee_prefs = {}
    for i, mentee in enumerate(mentees):
        ranked = sorted(
            range(len(mentors)),
            key=lambda j: scores[i][j],
            reverse=True
        )
        mentee_prefs[mentee["id"]] = [mentors[j]["id"] for j in ranked]

    mentor_prefs = {}
    for j, mentor in enumerate(mentors):
        ranked = sorted(
            range(len(mentees)),
            key=lambda i: scores[i][j],
            reverse=True
        )
        mentor_prefs[mentor["id"]] = [mentees[i]["id"] for i in ranked]

    return mentee_prefs, mentor_prefs

# ─────────────────────────────────────────────
# 2. HOSPITAL-RESIDENT ALGORITHM
# ─────────────────────────────────────────────

def hospital_resident(
    residents: list[dict],       # mentees
    hospitals: list[dict],       # mentors
    resident_prefs: dict,        # mentee → [mentor_ids ranked]
    hospital_prefs: dict,        # mentor → [mentee_ids ranked]
    hospital_capacity: dict,     # mentor_id → capacity
) -> tuple[dict, dict]:
    """
    Hospital-Resident Algorithm (resident-proposing variant).
    
    Guarantees:
    - Stable matching (no blocking pairs)
    - Resident-optimal (best possible for mentees)
    - Hospital-pessimal (worst stable matching for mentors — tradeoff for mentee optimality)
    
    Returns:
        resident_assignment: { mentee_id: mentor_id }
        hospital_assignments: { mentor_id: [mentee_ids] }
    """

    # precompute hospital ranking for O(1) comparison
    # lower rank = more preferred by hospital
    hospital_rank = {
        h["id"]: {
            r_id: rank
            for rank, r_id in enumerate(hospital_prefs[h["id"]])
        }
        for h in hospitals
    }

    # state
    free_residents = list(resident_prefs.keys())
    next_proposal = {r_id: 0 for r_id in free_residents}
    hospital_assignments = {h["id"]: [] for h in hospitals}
    resident_assignment = {}

    while free_residents:
        r_id = free_residents.pop(0)
        prefs = resident_prefs[r_id]

        # resident exhausted all proposals — truly unmatched
        if next_proposal[r_id] >= len(prefs):
            print(f"  ⚠️  {r_id} exhausted all proposals — unmatched")
            continue

        h_id = prefs[next_proposal[r_id]]
        next_proposal[r_id] += 1
        assigned = hospital_assignments[h_id]
        capacity = hospital_capacity.get(h_id, 1)

        if len(assigned) < capacity:
            # hospital has space — tentatively assign
            assigned.append(r_id)
            resident_assignment[r_id] = h_id

        else:
            # hospital is full — find worst currently assigned resident
            worst_r_id = max(
                assigned,
                key=lambda rid: hospital_rank[h_id].get(rid, float("inf"))
            )
            current_rank = hospital_rank[h_id].get(r_id, float("inf"))
            worst_rank = hospital_rank[h_id].get(worst_r_id, float("inf"))

            if current_rank < worst_rank:
                # hospital prefers current over worst — replace
                assigned.remove(worst_r_id)
                assigned.append(r_id)
                resident_assignment[r_id] = h_id
                del resident_assignment[worst_r_id]
                # worst goes back to propose to next on their list
                free_residents.append(worst_r_id)
            else:
                # hospital rejects current — try next hospital
                free_residents.append(r_id)

    return resident_assignment, hospital_assignments

# ─────────────────────────────────────────────
# 3. MENTOR-OPTIMAL HR
# ─────────────────────────────────────────────

def hospital_resident_mentor_optimal(
    residents: list[dict],
    hospitals: list[dict],
    resident_prefs: dict,
    hospital_prefs: dict,
    hospital_capacity: dict,
) -> tuple[dict, dict]:
    """
    Mentor-optimal variant: hospitals (mentors) propose to residents (mentees).
    
    To use HR from hospital side:
    - Each hospital proposes to residents one slot at a time
    - Residents hold best offer and reject others
    
    Returns result in same format as hospital_resident()
    """

    # precompute resident ranking for O(1) comparison
    resident_rank = {
        r["id"]: {
            h_id: rank
            for rank, h_id in enumerate(resident_prefs[r["id"]])
        }
        for r in residents
    }

    # hospitals propose slot by slot
    # track how many slots each hospital has proposed
    hospital_proposal_index = {h["id"]: 0 for h in hospitals}
    hospital_remaining_slots = {h["id"]: hospital_capacity.get(h["id"], 1) for h in hospitals}

    # residents hold at most 1 offer
    resident_holding = {}  # r_id → h_id (best offer so far)

    # hospitals with remaining slots to fill
    active_hospitals = [h["id"] for h in hospitals if hospital_remaining_slots[h["id"]] > 0]

    while active_hospitals:
        h_id = active_hospitals.pop(0)
        prefs = hospital_prefs[h_id]

        if hospital_proposal_index[h_id] >= len(prefs):
            # hospital exhausted all proposals for this slot
            continue

        r_id = prefs[hospital_proposal_index[h_id]]
        hospital_proposal_index[h_id] += 1

        if r_id not in resident_holding:
            # resident has no offer — accept
            resident_holding[r_id] = h_id
            hospital_remaining_slots[h_id] -= 1

            if hospital_remaining_slots[h_id] > 0:
                # hospital still has slots — keep proposing
                active_hospitals.append(h_id)
        else:
            # resident already holds an offer — compare
            current_h_id = resident_holding[r_id]
            new_rank = resident_rank[r_id].get(h_id, float("inf"))
            current_rank = resident_rank[r_id].get(current_h_id, float("inf"))

            if new_rank < current_rank:
                # resident prefers new offer — switch
                resident_holding[r_id] = h_id
                hospital_remaining_slots[h_id] -= 1

                # rejected hospital gets its slot back — keep proposing
                hospital_remaining_slots[current_h_id] += 1
                active_hospitals.append(current_h_id)

                if hospital_remaining_slots[h_id] > 0:
                    active_hospitals.append(h_id)
            else:
                # resident rejects — hospital tries next
                active_hospitals.append(h_id)

    # convert resident_holding to standard format
    resident_assignment = dict(resident_holding)
    hospital_assignments = {}
    for r_id, h_id in resident_assignment.items():
        hospital_assignments.setdefault(h_id, []).append(r_id)

    return resident_assignment, hospital_assignments

# ─────────────────────────────────────────────
# 4. FAIRNESS COMPARISON
# ─────────────────────────────────────────────

def compute_dissatisfaction(
    assignment: dict,
    prefs: dict,
) -> float:
    """
    Measures average rank of matched partner in preference list.
    Lower = better (0 means everyone got top choice).
    """
    total = 0
    for proposer_id, receiver_id in assignment.items():
        pref_list = prefs.get(proposer_id, [])
        rank = pref_list.index(receiver_id) if receiver_id in pref_list else len(pref_list)
        total += rank
    return total / max(len(assignment), 1)

def pick_fairer_matching(
    mentors: list[dict],
    mentees: list[dict],
    assignment_mentee_optimal: dict,
    assignment_mentor_optimal: dict,
    mentee_prefs: dict,
    mentor_prefs: dict,
) -> tuple[dict, str]:
    """
    Compares both matchings and picks the one with lower
    combined dissatisfaction from both sides.
    """
    # mentee-optimal: great for mentees, worse for mentors
    d_mentee_mo = compute_dissatisfaction(assignment_mentee_optimal, mentee_prefs)
    # reverse for mentor side
    mentor_view_mo = {v: k for k, v in assignment_mentee_optimal.items()}
    d_mentor_mo = compute_dissatisfaction(mentor_view_mo, mentor_prefs)
    total_mo = d_mentee_mo + d_mentor_mo

    # mentor-optimal: great for mentors, worse for mentees
    d_mentee_meo = compute_dissatisfaction(assignment_mentor_optimal, mentee_prefs)
    mentor_view_meo = {v: k for k, v in assignment_mentor_optimal.items()}
    d_mentor_meo = compute_dissatisfaction(mentor_view_meo, mentor_prefs)
    total_meo = d_mentee_meo + d_mentor_meo

    print(f"\n  ⚖️  Fairness Comparison:")
    print(f"  Mentee-optimal  → mentee dissatisfaction: {d_mentee_mo:.4f}, mentor: {d_mentor_mo:.4f}, total: {total_mo:.4f}")
    print(f"  Mentor-optimal  → mentee dissatisfaction: {d_mentee_meo:.4f}, mentor: {d_mentor_meo:.4f}, total: {total_meo:.4f}")

    if total_mo <= total_meo:
        print(f"  ✅ Mentee-optimal selected (lower combined dissatisfaction)")
        return assignment_mentee_optimal, "mentee-optimal"
    else:
        print(f"  ✅ Mentor-optimal selected (lower combined dissatisfaction)")
        return assignment_mentor_optimal, "mentor-optimal"

# ─────────────────────────────────────────────
# 5. VERIFY STABILITY
# ─────────────────────────────────────────────

def verify_stability(
    assignment: dict,
    mentors: list[dict],
    mentees: list[dict],
    mentee_prefs: dict,
    mentor_prefs: dict,
    hospital_capacity: dict,
) -> bool:
    """
    Verifies that the matching is stable — no blocking pairs exist.
    
    A blocking pair (mentee m, mentor M) exists if:
    - m prefers M over their current match AND
    - M prefers m over their worst current match (or has capacity)
    
    Returns True if stable, False if blocking pairs found.
    """
    hospital_assignments = {}
    for r_id, h_id in assignment.items():
        hospital_assignments.setdefault(h_id, []).append(r_id)

    mentor_rank = {
        m["id"]: {
            r_id: rank
            for rank, r_id in enumerate(mentor_prefs[m["id"]])
        }
        for m in mentors
    }
    mentee_rank = {
        m["id"]: {
            h_id: rank
            for rank, h_id in enumerate(mentee_prefs[m["id"]])
        }
        for m in mentees
    }

    blocking_pairs = []

    for mentee in mentees:
        r_id = mentee["id"]
        current_h_id = assignment.get(r_id)
        current_mentee_rank = mentee_rank[r_id].get(current_h_id, float("inf"))

        for mentor in mentors:
            h_id = mentor["id"]
            if h_id == current_h_id:
                continue

            # would mentee prefer this mentor?
            preferred_rank = mentee_rank[r_id].get(h_id, float("inf"))
            if preferred_rank >= current_mentee_rank:
                continue

            # would mentor prefer this mentee over worst current?
            assigned = hospital_assignments.get(h_id, [])
            capacity = hospital_capacity.get(h_id, 1)

            if len(assigned) < capacity:
                # mentor has space — blocking pair
                blocking_pairs.append((r_id, h_id))
            else:
                worst_r_id = max(
                    assigned,
                    key=lambda rid: mentor_rank[h_id].get(rid, float("inf"))
                )
                if mentor_rank[h_id].get(r_id, float("inf")) < mentor_rank[h_id].get(worst_r_id, float("inf")):
                    blocking_pairs.append((r_id, h_id))

    if blocking_pairs:
        print(f"\n  ⚠️  {len(blocking_pairs)} blocking pairs found — matching is UNSTABLE")
        for r_id, h_id in blocking_pairs[:5]:
            print(f"    ({r_id}, {h_id})")
        return False

    print(f"\n  ✅ Matching is STABLE — no blocking pairs found")
    return True

# ─────────────────────────────────────────────
# 6. RUN FULL PIPELINE
# ─────────────────────────────────────────────

def run_matching(mentors: list[dict], mentees: list[dict], model=None) -> list[dict]:
    mentee_index = {m["id"]: i for i, m in enumerate(mentees)}
    mentor_index = {m["id"]: j for j, m in enumerate(mentors)}
    hospital_capacity = {m["id"]: m.get("mentor_capacity") or 1 for m in mentors}

    print("\n📊 Step 1: Computing compatibility scores...")
    scores, _ = compute_weighted_scores(mentors, mentees)

    print("\n📋 Step 2: Generating preferences...")
    mentee_prefs, mentor_prefs = generate_preferences(mentors, mentees, scores)

    print("\n🏥 Step 3a: Running HR (mentee-optimal)...")
    assignment_mo, _ = hospital_resident(
        residents=mentees,
        hospitals=mentors,
        resident_prefs=mentee_prefs,
        hospital_prefs=mentor_prefs,
        hospital_capacity=hospital_capacity,
    )
    print(f"  Mentee-optimal matches: {len(assignment_mo)}")

    print("\n🏥 Step 3b: Running HR (mentor-optimal)...")
    assignment_meo, _ = hospital_resident_mentor_optimal(
        residents=mentees,
        hospitals=mentors,
        resident_prefs=mentee_prefs,
        hospital_prefs=mentor_prefs,
        hospital_capacity=hospital_capacity,
    )
    print(f"  Mentor-optimal matches: {len(assignment_meo)}")

    print("\n⚖️  Step 4: Picking fairer matching...")
    final_assignment, method = pick_fairer_matching(
        mentors, mentees,
        assignment_mo, assignment_meo,
        mentee_prefs, mentor_prefs,
    )

    print("\n🔍 Step 5: Verifying stability...")
    is_stable = verify_stability(
        final_assignment, mentors, mentees,
        mentee_prefs, mentor_prefs, hospital_capacity
    )

    print("\n✅ Step 6: Building match records...")
    match_records = []
    for mentee_id, mentor_id in final_assignment.items():
        i = mentee_index[mentee_id]
        j = mentor_index[mentor_id]
        score = float(scores[i][j])
        keywords = get_matched_keywords(mentors[j], mentees[i])

        match_records.append({
            "mentee_group_id": mentee_id,
            "mentor_id": mentor_id,
            "compatibility_score": round(score, 4),
            "matched_keywords": keywords,
            "status": "active",
            "algorithm": method,
            "is_stable": is_stable,
        })

    unmatched = len(mentees) - len(final_assignment)
    if unmatched > 0:
        print(f"\n  ⚠️  {unmatched} mentees unmatched (likely due to mentor capacity constraints)")

    return match_records
