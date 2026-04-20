import numpy as np
from scoring import compute_weighted_scores, get_matched_keywords
from text_processing import load_bert_model

# ─────────────────────────────────────────────
# 1. PREFERENCE GENERATION
# ─────────────────────────────────────────────

def generate_preferences(
    mentors, mentees, scores,
    top_k: int = None
):
    # for 10 mentors, k=10 means no truncation
    # for 100 mentors, set k=10 to keep it O(n)
    k = top_k or len(mentors)

    mentee_prefs = {}
    for i, mentee in enumerate(mentees):
        ranked = sorted(
            range(len(mentors)),
            key=lambda j: scores[i][j],
            reverse=True
        )[:k]
        mentee_prefs[mentee["id"]] = [mentors[j]["id"] for j in ranked]

    mentor_prefs = {}
    for j, mentor in enumerate(mentors):
        ranked = sorted(
            range(len(mentees)),
            key=lambda i: scores[i][j],
            reverse=True
        )[:k]
        mentor_prefs[mentor["id"]] = [mentees[i]["id"] for i in ranked]

    return mentee_prefs, mentor_prefs

# ─────────────────────────────────────────────
# 2. CORE GALE-SHAPLEY
# ─────────────────────────────────────────────

def _gale_shapley_core(
    proposers: list[dict],
    receivers: list[dict],
    proposer_prefs: dict,
    receiver_prefs: dict,
    receiver_capacity: dict,
) -> tuple[dict, dict]:
    receiver_rank = {
        r["id"]: {
            proposer_id: rank
            for rank, proposer_id in enumerate(receiver_prefs[r["id"]])
        }
        for r in receivers
    }

    free_proposers = list(proposer_prefs.keys())
    proposer_next = {p_id: 0 for p_id in free_proposers}
    receiver_assignments = {r["id"]: [] for r in receivers}
    proposer_assignment = {}

    while free_proposers:
        proposer_id = free_proposers.pop(0)
        prefs = proposer_prefs[proposer_id]

        if proposer_next[proposer_id] >= len(prefs):
            print(f"  ⚠️  {proposer_id} could not be matched")
            continue

        receiver_id = prefs[proposer_next[proposer_id]]
        proposer_next[proposer_id] += 1
        assigned = receiver_assignments[receiver_id]
        capacity = receiver_capacity.get(receiver_id, 1)

        if len(assigned) < capacity:
            assigned.append(proposer_id)
            proposer_assignment[proposer_id] = receiver_id
        else:
            worst_id = max(
                assigned,
                key=lambda p: receiver_rank[receiver_id].get(p, float("inf"))
            )
            current_rank = receiver_rank[receiver_id].get(proposer_id, float("inf"))
            worst_rank = receiver_rank[receiver_id].get(worst_id, float("inf"))

            if current_rank < worst_rank:
                assigned.remove(worst_id)
                assigned.append(proposer_id)
                proposer_assignment[proposer_id] = receiver_id
                del proposer_assignment[worst_id]
                free_proposers.append(worst_id)
            else:
                free_proposers.append(proposer_id)

    return proposer_assignment, receiver_assignments

# ─────────────────────────────────────────────
# 3. FIND LOCKED PAIRS (stable core)
# ─────────────────────────────────────────────

def find_locked_pairs(
    mentee_assignment_p1: dict,
    mentee_assignment_p2: dict,
) -> set[tuple]:
    """
    Returns set of (mentee_id, mentor_id) pairs that both phases agree on
    """
    locked = set()
    for mentee_id, mentor_id in mentee_assignment_p1.items():
        if mentee_assignment_p2.get(mentee_id) == mentor_id:
            locked.add((mentee_id, mentor_id))
    return locked

# ─────────────────────────────────────────────
# 4. THREE-PHASE GALE-SHAPLEY
# ─────────────────────────────────────────────

def three_phase_gale_shapley(
    mentors: list[dict],
    mentees: list[dict],
    mentee_prefs: dict,
    mentor_prefs: dict,
) -> tuple[dict, dict]:
    mentor_capacity = {m["id"]: m.get("mentor_capacity") or 1 for m in mentors}
    mentee_capacity = {m["id"]: 1 for m in mentees}

    # ── Phase 1: Mentee-proposing ──
    print("\n  🔄 Phase 1: Mentee-proposing...")
    mentee_assignment_p1, _ = _gale_shapley_core(
        proposers=mentees,
        receivers=mentors,
        proposer_prefs=mentee_prefs,
        receiver_prefs=mentor_prefs,
        receiver_capacity=mentor_capacity,
    )
    print(f"  Phase 1 matches: {len(mentee_assignment_p1)}")

    # ── Phase 2: Mentor-proposing ──
    print("\n  🔄 Phase 2: Mentor-proposing...")
    mentor_assignment_p2, _ = _gale_shapley_core(
        proposers=mentors,
        receivers=mentees,
        proposer_prefs=mentor_prefs,
        receiver_prefs=mentee_prefs,
        receiver_capacity=mentee_capacity,
    )
    # convert to mentee_assignment format
    mentee_assignment_p2 = {v: k for k, v in mentor_assignment_p2.items()}
    print(f"  Phase 2 matches: {len(mentee_assignment_p2)}")

    # ── Phase 3: Lock agreed pairs ──
    print("\n  🔒 Phase 3: Locking agreed pairs...")
    locked_pairs = find_locked_pairs(mentee_assignment_p1, mentee_assignment_p2)
    locked_mentee_ids = {mentee_id for mentee_id, _ in locked_pairs}
    locked_mentor_ids = {mentor_id for _, mentor_id in locked_pairs}

    print(f"  Locked pairs ({len(locked_pairs)}):")
    for mentee_id, mentor_id in locked_pairs:
        mentee_name = next((m["group_name"] for m in mentees if m["id"] == mentee_id), mentee_id)
        mentor_name = next((f"{m['first_name']} {m['last_name']}" for m in mentors if m["id"] == mentor_id), mentor_id)
        print(f"    ✅ {mentee_name} ↔ {mentor_name} (locked)")

    # remaining unmatched after locking
    remaining_mentees = [m for m in mentees if m["id"] not in locked_mentee_ids]

    # reduce mentor capacity by how many locked mentees they already have
    remaining_mentor_capacity = {}
    for mentor in mentors:
        locked_count = sum(1 for _, mid in locked_pairs if mid == mentor["id"])
        remaining_cap = (mentor.get("mentor_capacity") or 1) - locked_count
        if remaining_cap > 0:
            remaining_mentor_capacity[mentor["id"]] = remaining_cap

    remaining_mentors = [m for m in mentors if remaining_mentor_capacity.get(m["id"], 0) > 0]

    print(f"\n  Remaining unmatched mentees: {len(remaining_mentees)}")
    print(f"  Mentors with remaining capacity: {len(remaining_mentors)}")

    # ── Phase 4: Resolve remaining with mentee-proposing ──
    final_assignment = {mentee_id: mentor_id for mentee_id, mentor_id in locked_pairs}

    if remaining_mentees and remaining_mentors:
        print("\n  🔄 Phase 4: Resolving remaining unmatched...")

        remaining_mentee_prefs = {
            m["id"]: [mid for mid in mentee_prefs[m["id"]] if mid in remaining_mentor_capacity]
            for m in remaining_mentees
        }
        remaining_mentor_prefs = {
            m["id"]: [mid for mid in mentor_prefs[m["id"]] if mid in {rm["id"] for rm in remaining_mentees}]
            for m in remaining_mentors
        }

        resolved_assignment, _ = _gale_shapley_core(
            proposers=remaining_mentees,
            receivers=remaining_mentors,
            proposer_prefs=remaining_mentee_prefs,
            receiver_prefs=remaining_mentor_prefs,
            receiver_capacity=remaining_mentor_capacity,
        )
        print(f"  Resolved {len(resolved_assignment)} additional matches")
        final_assignment.update(resolved_assignment)
    else:
        print("\n  ✅ No remaining unmatched mentees")

    # build mentor_assignments
    final_mentor_assignments = {}
    for mentee_id, mentor_id in final_assignment.items():
        final_mentor_assignments.setdefault(mentor_id, []).append(mentee_id)

    return final_assignment, final_mentor_assignments

# ─────────────────────────────────────────────
# 5. RUN FULL PIPELINE
# ─────────────────────────────────────────────

def run_matching(mentors: list[dict], mentees: list[dict], tokenizer, model) -> list[dict]:
    mentee_index = {m["id"]: i for i, m in enumerate(mentees)}
    mentor_index = {m["id"]: j for j, m in enumerate(mentors)}

    print("\n📊 Step 1: Computing compatibility scores...")
    scores = compute_weighted_scores(mentors, mentees, tokenizer, model)

    print("\n📋 Step 2: Generating preferences...")
    mentee_prefs, mentor_prefs = generate_preferences(mentors, mentees, scores, top_k=3)

    print("\n🔗 Step 3: Running three-phase Gale-Shapley...")
    mentee_assignment, mentor_assignments = three_phase_gale_shapley(
        mentors, mentees, mentee_prefs, mentor_prefs
    )

    print("\n✅ Step 4: Building match records...")
    match_records = []
    for mentee_id, mentor_id in mentee_assignment.items():
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
        })

    return match_records

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
        },
        {
            "id": "mentee-3",
            "group_name": "Group Gamma",
            "research_title": "Deep Learning for Medical Imaging",
            "research_description": "Using convolutional neural networks to detect anomalies in medical images.",
            "mentor_preference": "Looking for a mentor with deep learning and computer vision experience.",
            "available_days": ["Monday"],
            "time_slot": ["10:00-11:00"]
        }
    ]

    print("🤖 Loading BERT model...")
    tokenizer, model = load_bert_model()

    match_records = run_matching(sample_mentors, sample_mentees, tokenizer, model)

    print("\n🎯 Final Matches:")
    print(f"{'Mentee':<20} {'Mentor':<20} {'Score':<10} {'Keywords'}")
    print("-" * 80)
    for record in match_records:
        mentee = next(m for m in sample_mentees if m["id"] == record["mentee_group_id"])
        mentor = next(m for m in sample_mentors if m["id"] == record["mentor_id"])
        print(
            f"{mentee['group_name']:<20} "
            f"{mentor['first_name']} {mentor['last_name']:<12} "
            f"{record['compatibility_score']:<10} "
            f"{record['matched_keywords']}"
        )
