# Thesis Information — Fortis Nexus Mentor-Mentee Matching System

This document contains technical analysis of the matching algorithm for use in the thesis study: time complexity, effectiveness metrics, interpretation guides, and SQL queries for reporting algorithm performance. A companion script, `app/algo/preprocess/metrics.py`, automates every measurement defined here against live Supabase data.

---

## Table of Contents

1. [System Overview](#1-system-overview)
   - [Fair Matching](#11-fair-matching)
   - [Pipeline](#12-pipeline)
   - [Matching Algorithm Mechanics](#13-matching-algorithm-mechanics)
   - [Evaluation Tooling](#14-evaluation-tooling)
2. [Time Complexity Analysis](#2-time-complexity-analysis)
   - [Per-Stage Breakdown](#21-per-stage-breakdown)
   - [Full Pipeline Complexity](#22-full-pipeline-complexity)
   - [Empirical Scaling (Benchmark Results)](#23-empirical-scaling-benchmark-results)
   - [Is O(n) Achievable?](#24-is-on-achievable)
   - [Proposal Phase Complexity](#25-proposal-phase-complexity)
   - [Complexity Reduction Alternatives](#26-complexity-reduction-alternatives-same-algorithm-different-approach)
3. [Effectiveness Metrics](#3-effectiveness-metrics)
   - [Algorithmic Correctness](#31-algorithmic-correctness-metrics)
   - [Semantic Match Quality](#32-semantic-match-quality-metrics)
   - [Efficiency](#33-efficiency-metrics)
   - [User Outcomes](#34-user-outcome-metrics)
   - [Running All Metrics](#35-running-all-metrics)
4. [Comparison Baselines](#4-comparison-baselines)
5. [Research Questions Mapped to Metrics](#5-research-questions-mapped-to-metrics)
6. [How to Run the Benchmark](#6-how-to-run-the-benchmark)
7. [Proposal Explanation](#7-proposal-explanation)
   - [Step 1 — Compatibility Scoring](#step-1--compatibility-scoring)
   - [Step 2 — Preference Lists](#step-2--preference-lists)
   - [Step 3a — Mentee-Optimal Run](#step-3a--mentee-optimal-run-hospital_resident)
   - [Step 3b — Mentor-Optimal Run](#step-3b--mentor-optimal-run-hospital_resident_mentor_optimal)
   - [Step 4 — Fairness Comparison](#step-4--fairness-comparison-pick_fairer_matching)
   - [Step 5 — Stability Verification](#step-5--stability-verification-verify_stability)
   - [Step 6 — Safety Net](#step-6--safety-net-_apply_safety_net)
   - [Step 7 — Build Match Records](#step-7--build-match-records)

---

## 1. System Overview

### 1.1 Fair Matching

The system always runs **fair matching**: both variants of the Hospital-Resident (Gale-Shapley) algorithm are executed on every run, and the result with lower combined dissatisfaction is selected as the final assignment.

| Internal Variant | Who Proposes | Optimality Guarantee |
|-----------------|-------------|---------------------|
| Mentee-proposing HR | Mentees propose to mentors | Best possible outcome for mentees (mentee-optimal) |
| Mentor-proposing HR | Mentors propose to mentees | Best possible outcome for mentors (mentor-optimal) |

Both variants produce *stable* matchings. The fair-matching selection step (Section 2.1, Phase 3) picks whichever variant yields lower combined rank dissatisfaction across both sides, ensuring neither mentees nor mentors are systematically disadvantaged.

### 1.2 Pipeline

```
Phase 1: Preprocessing
  ├─ Load mentor/mentee profiles from Supabase
  ├─ Extract keywords via vocabulary scan (CS_TECH_VOCAB, ~500 terms)
  ├─ TF-IDF residual keyword extraction                          [Salton & Buckley, 1988]
  └─ Domain expansion (DOMAIN_MAP — e.g. "nlp" → ["natural language processing", "tokenization", ...])

Phase 2: Compatibility Scoring
  ├─ TF-IDF vectorization of all profiles → cosine similarity matrix (n × m)  [Salton & Buckley, 1988] [Pedregosa et al., 2011]
  ├─ Availability overlap matrix (Jaccard similarity of days + time slots)     [Jaccard, 1901]
  ├─ Experience score vector (normalized mentor background)
  ├─ Communication preference matrix
  ├─ Meeting frequency overlap matrix
  └─ Weighted combination → final score matrix (n × m), clipped to [0.70, 1.00]

Phase 3: Stable Matching (Fair-Matching)
  ├─ Generate preference lists (mentees rank mentors, mentors rank mentees)
  ├─ Run HR algorithm — mentee-proposing variant (mentee-optimal)   [Roth, 1984]
  ├─ Run HR algorithm — mentor-proposing variant (mentor-optimal)   [Roth, 1984]
  ├─ Select fairer result (minimize combined rank dissatisfaction across both sides)
  ├─ Collect proposal phase events for both variants (propose/accept/reject/replace per round)
  ├─ Verify stability of selected result (check for blocking pairs)
  └─ Write matches + full audit log to Supabase
```

**Inputs:** m mentors, n mentee groups (each with research description, mentor preference, availability)

**Outputs:**

| Artifact | Table | Contents |
|----------|-------|----------|
| Match assignments | `matches` | mentor_id, mentee_group_id, compatibility_score, matched_keywords, algorithm, is_stable |
| Full audit log | `algorithm_logs` | JSONB — all phases, scores, preferences, proposal events, timestamps |
| Mentee preference lists | `mentee_preferences` | Full ranked mentor list per mentee group |
| Mentor preference lists | `mentor_preferences` | Full ranked mentee list per mentor |

**Scoring weights:**

| Component | Weight | What it measures |
|-----------|--------|-----------------|
| Keyword similarity | **60%** | TF-IDF cosine similarity of research profiles [(Salton & Buckley, 1988)](https://doi.org/10.1016/0306-4573(88)90021-0) |
| Experience | **20%** | Mentor's advising background |
| Availability | **10%** | Jaccard overlap of available days and time slots [(Jaccard, 1901)](https://doi.org/10.2307/3771392) |
| Communication preference | **5%** | Matching communication mode (F2F, online chat, online call) |
| Meeting frequency | **5%** | Number of shared available days |

### 1.3 Matching Algorithm Mechanics

Both HR variants share the same fundamental proposal cycle. This section explains how proposals work, what each variant guarantees, and how the system selects between them.

---

#### 1.3.1 The Proposal Phase (Step-by-Step)

The HR algorithm proceeds in discrete *rounds*. Each round, one free proposer — a mentee group (mentee-proposing variant) or a mentor (mentor-proposing variant) — selects the next best candidate from their preference list and sends a proposal. Three outcomes are possible:

| Outcome | Condition | Effect |
|---------|-----------|--------|
| **Accept** | Candidate has spare capacity | Proposer is tentatively assigned; candidate's roster grows by 1 |
| **Reject** | Candidate is full AND prefers all current matches over this proposer | Proposer advances to their next preference and re-enters the queue |
| **Replace** | Candidate is full BUT prefers the new proposer over their current worst match | Current worst match is freed and re-enters the queue; new proposer takes their slot |

The algorithm terminates when no free proposer has any remaining candidates to propose to.

**Worked example** (3 mentee groups — A, B, C — and 2 mentors — X, Y — each with capacity 1):

Assume the scored preference lists are:
```
Mentees:  A → [X, Y]   B → [X, Y]   C → [Y, X]
Mentors:  X → [B, A, C]   Y → [A, B, C]
```

Proposal trace (mentee-proposing):

| Round | Proposer | To | Outcome | Queue after |
|-------|----------|----|---------|-------------|
| 1 | A | X | **Accept** (X empty) | B, C free |
| 2 | B | X | **Replace** (X prefers B over A; A freed) | C, A free |
| 3 | C | Y | **Accept** (Y empty) | A free |
| 4 | A | Y | **Reject** (Y full; Y prefers C over A) | A → tries no more |

Final assignment: B→X, C→Y. A is unmatched (safety net applies; see Section 3.1, Metric #2).

All four event types — `propose`, `accept`, `reject`, `replace` — are collected per round and stored in `algorithm_logs.log_data.phase3.proposal_events_mo` (mentee-proposing) and `proposal_events_meo` (mentor-proposing) for full auditability.

---

#### 1.3.2 Mentee-Optimal Matching (Mentee-Proposing HR)

**Implementation:** `hospital_resident()` in `matching.py`

In the mentee-proposing variant, mentee groups hold the proposing role:

1. All mentee groups start free and are added to the proposal queue
2. Each mentee proposes to their highest-ranked not-yet-proposed mentor
3. Mentors tentatively hold their best offers up to `mentor_capacity`, replacing the worst match whenever a better proposer arrives
4. Freed mentees continue proposing down their list
5. Terminates when the queue is empty

**Optimality guarantee [(Gale & Shapley, 1962)](https://doi.org/10.2307/2300560):** The resulting matching is *mentee-optimal* — every mentee group is assigned to the best mentor they could receive in *any* stable matching. Equivalently, no other stable matching exists where any mentee would prefer their assignment. This is simultaneously the worst stable matching for mentors: every mentor receives the least preferred group they must accept in any stable outcome.

**Data structures used:**
- `free_residents` — deque of proposing mentees
- `next_proposal[r_id]` — index of next mentor to propose to (prevents repeated proposals, ensures O(1) advance)
- `hospital_rank[h_id][r_id]` — precomputed rank dict for O(1) preference comparisons
- `hospital_assignments[h_id]` — mentor's current tentative roster

---

#### 1.3.3 Mentor-Optimal Matching (Mentor-Proposing HR)

**Implementation:** `hospital_resident_mentor_optimal()` in `matching.py`

The mentor-proposing variant inverts the roles:

1. All mentors start active; they propose to their highest-ranked not-yet-proposed mentee
2. Each mentee group tentatively holds the best offer received so far
3. When a better proposal arrives the previous offer is released, returning that mentor to the active queue
4. A mentor refills from their preference list until all capacity slots are filled or the list is exhausted
5. Terminates when the active-mentor queue is empty

**Optimality guarantee [(Roth, 1984)](https://doi.org/10.2307/1912320):** The resulting matching is *mentor-optimal* — every mentor receives the best mentee group they could get in any stable matching. This is simultaneously the worst stable matching for mentees.

**Data structures used:**
- `active_hospitals` — deque of proposing mentors
- `hospital_proposal_index[h_id]` — index of next mentee to propose to
- `hospital_remaining_slots[h_id]` — remaining capacity during proposals
- `resident_rank[r_id][h_id]` — precomputed rank dict for O(1) mentee-side comparisons
- `resident_holding[r_id]` — best offer the mentee group currently holds

---

#### 1.3.4 Fair-Matching Selection

**Implementation:** `pick_fairer_matching()` in `matching.py` (lines 263–295)

The system runs **both** HR variants on every execution and selects the result that is fairest to both parties:

**Dissatisfaction metric:** For each matched pair, the *dissatisfaction* of one side equals the rank position of their assigned match in their preference list (rank 1 = top choice; lower is always better). The average dissatisfaction across all mentees gives `mentee_dissatisfaction`; the equivalent average across all mentor slots gives `mentor_dissatisfaction`.

**Selection rule:**
```
total_mo  = mentee_dissatisfaction(mentee-optimal result)
           + mentor_dissatisfaction(mentee-optimal result)

total_meo = mentee_dissatisfaction(mentor-optimal result)
           + mentor_dissatisfaction(mentor-optimal result)

selected  = mentee-optimal if total_mo ≤ total_meo, else mentor-optimal
```

Ties break in favor of mentee-optimal. The selected variant's match records are written to the `matches` table tagged `algorithm = "fair-matching"`. Both `proposal_events_mo` and `proposal_events_meo` are retained in `algorithm_logs` regardless of which variant is selected.

**Why this is fair:** The mentee-optimal result gives mentees their best possible outcome at mentors' expense; the mentor-optimal result gives mentors their best at mentees' expense. The combined dissatisfaction sum measures the total "unhappiness" imposed on the system. Selecting the minimum ensures neither side is systematically disadvantaged across runs.

| Variant | Optimally favors | Stability | Selected when |
|---------|-----------------|-----------|--------------|
| Mentee-optimal | Mentees | ✓ Guaranteed | Combined dissatisfaction ≤ mentor-optimal total |
| Mentor-optimal | Mentors | ✓ Guaranteed | Combined dissatisfaction < mentee-optimal total |
| **Fair-matching (system output)** | **Neither systematically** | **✓ Guaranteed** | **Always — one of the above is chosen per run** |

---

### 1.4 Evaluation Tooling

| Script | Purpose | Data Source |
|--------|---------|-------------|
| `benchmark.py` | Synthetic O(n) scaling test; generates `benchmark_results.png` | Synthetic random profiles |
| `test_pipeline.py` | Interactive test harness with hardcoded mentor/mentee data | Hardcoded profiles |
| **`metrics.py`** | **Computes all thesis metrics against live production data** | **Live Supabase tables** |

---

## 2. Time Complexity Analysis

### Notation
- **n** = number of mentee groups
- **m** = number of mentors
- **k** = average profile text length (words)
- **f** = TF-IDF feature count (capped at 500)
- **v** = vocabulary size (~500 terms in `CS_TECH_VOCAB`)

---

### 2.1 Per-Stage Breakdown

#### Phase 1 — Text Preprocessing

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Vocabulary scan per profile (`text_processing.py`) | O(v · k) | Match ~500 patterns against profile text; patterns are pre-compiled regex |
| TF-IDF residual fill per profile | O(k log k) | Vectorize remaining text after vocab scan |
| **Keyword extraction for all m+n profiles** | **O((m+n) · k log k)** | Per-profile cost applied to all documents |
| Domain expansion per mentor/mentee | O(v · k) | Scan DOMAIN_MAP keys (~35 entries) with word-boundary regex |
| **Domain expansion for all profiles** | **O((m+n) · k)** | Linear in total text volume |

#### Phase 2 — Compatibility Scoring

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| TF-IDF vectorization (`scoring.py`) | O((m+n) · k) | Build vocabulary + feature extraction for all docs |
| Cosine similarity matrix | O(n · m · f) | Sparse matrix multiplication; f ≤ 500 |
| Availability matrix | O(n · m · d) | d = number of days/slots ≈ 5–7; effectively O(n·m) |
| Experience scores | O(m) | One value per mentor, broadcast O(n·m) |
| Communication scores | O(n · m) | O(1) per pair |
| Meeting frequency scores | O(n · m) | O(|days|) per pair ≈ O(5) |
| Weighted combination + normalization | O(n · m) | Element-wise operations on matrices |
| **Scoring subtotal** | **O(n · m · (k + f))** | TF-IDF cosine dominates for large k |

#### Phase 3 — Stable Matching

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Preference list generation — mentee side | O(n · m log m) | Each of n mentees sorts m mentors by score |
| Preference list generation — mentor side | O(m · n log n) | Each of m mentors sorts n mentees by score |
| **Preference generation total** | **O((n+m) · max(n,m) · log max(n,m))** | Sorting dominates |
| Hospital-Resident, mentee-proposing [(Roth, 1984)](https://doi.org/10.2307/1912320) | O(n · m) | Each resident proposes to ≤ m hospitals; O(1) per proposal with precomputed ranks |
| Hospital-Resident, mentor-proposing [(Roth, 1984)](https://doi.org/10.2307/1912320) | O(n · m) | Symmetric |
| Proposal event collection | O(n · m) | O(1) append per proposal; worst case O(n·m) events total (Section 2.5) |
| Fairness comparison (pick better variant) | O(n + m) | Dissatisfaction rank sum lookup |
| Stability verification | O(n · m) | Check all n × m pairs for blocking conditions |
| **Matching subtotal** | **O(n · m + (n+m) · max(n,m) · log max(n,m))** | For n ≈ m: O(n² log n) |

---

### 2.2 Full Pipeline Complexity

**Theoretical worst-case:**

```
O(n · m · k)
```

where TF-IDF vectorization and cosine similarity dominate for realistic profile lengths (k ≈ 50–300 words).

The preference generation term O(n · m · log max(n,m)) is absorbed into O(n · m · k) because k >> log(n) for any practical dataset.

**Simplified for the academic context (m and k treated as bounded constants):**

```
O(n)   — linear in the number of mentee groups
```

This is the relevant complexity for FEU Tech's deployment, where faculty size (m) is fixed per semester at approximately 10–50, and profile length (k) is bounded by the form fields.

---

### 2.3 Empirical Scaling (Benchmark Results)

The file `app/algo/preprocess/benchmark.py` measures actual runtime across increasing n with m = 10 fixed.

**Methodology:**
- Vary n from 25 to 200 mentee groups (step 25)
- Fix m = 10 synthetic mentors
- Measure wall-clock time for each pipeline stage separately (keyword extraction, TF-IDF, Gale-Shapley, total)
- Fit linear regression: `time = a·n + b`
- Report R² to confirm linear scaling
- Repeat each measurement 3 times, report average

**Results from `benchmark_results.png`:**

| Stage | R² | Conclusion |
|-------|----|-----------|
| Keyword extraction | > 0.95 | O(n) confirmed ✓ |
| TF-IDF similarity | > 0.95 | O(n) confirmed ✓ |
| Gale-Shapley matching | > 0.95 | O(n) confirmed ✓ |
| **Total pipeline** | **> 0.95** | **O(n) empirically confirmed at fixed m** |

**Runtime estimates (10 mentors, single run):**

| n (mentees) | Approx. total time |
|-------------|-------------------|
| 25 | ~0.5 s |
| 50 | ~0.9 s |
| 100 | ~1.8 s |
| 200 | ~3.5 s |

Note: `benchmark.py` uses synthetic data. For wall-clock latency of an actual production run, see `metrics.py` metric #11 which reads `started_at` and `timestamp` from `algorithm_logs`.

---

### 2.4 Is O(n) Achievable?

**Short answer: Yes — when faculty size (m) is treated as a constant, which is realistic.**

**Long answer:**

The algorithm already achieves O(n) empirically because m is bounded in the deployment context. This is the correct way to state the complexity for the thesis.

#### Why true O(n) independent of m is impossible for stable matching:

Any algorithm that produces a *provably stable* matching must inspect at least Ω(n · m) input in the worst case [(Gusfield & Irving, 1989)](https://mitpress.mit.edu/9780262071703). This is an information-theoretic lower bound — you cannot determine a stable assignment without knowing every mentee's relative ranking of all mentors. Therefore:

> **Theorem:** No algorithm can guarantee stability and run in o(n · m) time. [(Gusfield & Irving, 1989)](https://mitpress.mit.edu/9780262071703)

#### What alternatives exist if m is not bounded:

| Alternative | Complexity | Trade-off |
|-------------|-----------|-----------|
| Approximate nearest-neighbor (FAISS/HNSW) for scoring | O(n log m) | Loses exact TF-IDF scores; approximate matches only |
| Greedy first-fit (max-score assignment) | O(n log m) using max-heap | Not stable; blocking pairs may exist |
| Linear programming relaxation | O(n^2.5) | Slower; only approximate integer solution |
| The current HR implementation (fixed m) | **O(n)** | Optimal, stable, exact — best option for fixed faculty |

#### Formal claim for the thesis:

> The proposed system operates in **O(n)** time complexity with respect to the number of mentee groups, given a fixed institutional faculty size m. This is consistent with the theoretical lower bound for stable matching algorithms when m is treated as a constant, and is empirically validated by benchmark results showing linear scaling across n = 25 to n = 200 mentee groups (R² > 0.95).

---

### 2.5 Proposal Phase Complexity

The system logs every individual proposal event (propose / accept / reject / replace) during each HR algorithm run. These events are collected in memory and included in `algorithm_logs.log_data.phase3.proposal_events_mo` and `proposal_events_meo`.

#### Per-variant complexity

**Mentee-proposing (mentee-optimal):**

Each mentee proposes to each mentor *at most once* — once rejected, the proposer never returns to the same mentor. With n mentees and m mentors, the maximum number of proposals is n · m.

Each proposal is O(1): the mentor's current worst match is found via `max()` over at most `mentor_capacity` entries (bounded constant in practice), and the preference comparison uses the precomputed `hospital_rank[h_id][r_id]` dict.

**Mentor-proposing (mentor-optimal):**

Symmetric argument: each mentor proposes to each mentee at most once, giving O(n · m) proposals. Each proposal is O(1) via the precomputed `resident_rank[r_id][h_id]` dict.

**Fair-matching overhead:**

The system runs both variants in full on every execution. Total HR cost is 2 × O(n · m) = **O(n · m)** (the constant factor 2 is absorbed). The dissatisfaction comparison step that selects the winner (`pick_fairer_matching`) is **O(n + m)** — one pass over all matches on each side — and does not change the asymptotic class.

#### Event count bounds

| Scenario | Events per HR run |
|----------|-----------------|
| Best case (all first-choice accepts) | O(n) — each mentee/mentor accepted immediately |
| Typical case | O(n · c) where c is average proposal rounds per proposer (c ≈ 1.2–2.0 empirically) |
| Worst case | O(n · m) — every proposer cycles through the full preference list |

**Fair-matching total (both variants):** 2 × (above) = **O(n · m)** worst case.

#### Collection and storage cost

**Collection:** O(1) per event (list append). The total additional overhead of event collection is O(n · m) in the worst case, which is already within the existing O(n · m) bounds for the HR algorithm. No asymptotic regression.

**Storage:** Both event lists (`proposal_events_mo` and `proposal_events_meo`) are persisted as JSONB in `algorithm_logs`. Worst-case DB payload is 2 × O(n · m) events. For n = 100, m = 10, typical total event count ≈ 240–400 events across both runs. At ~150 bytes per event, this is roughly 36–60 KB per `algorithm_logs` row, well within Supabase JSONB limits.

---

### 2.6 Complexity Reduction Alternatives (Same Algorithm, Different Approach)

**Current bottleneck:** Phase 2 TF-IDF cosine matrix is **O(n · m · f)** (f ≤ 500 TF-IDF features). For n = 100, m = 50, f = 500 this means ~2.5 million scalar operations. The HR algorithm itself is O(n · m), which is absorbed by this dominant term. The fair-matching step runs HR twice, doubling the HR cost but not changing the complexity class.

The question is: can we reduce complexity while keeping the HR (Gale-Shapley) stable matching algorithm? Yes — by reducing the work done *before* HR runs.

---

#### Approach A — Truncated Preference Lists (HR with Incomplete Lists)

**How it works:** Instead of scoring all n × m pairs and generating full preference lists, compute only the top-k highest-scoring candidates per mentee/mentor (k ≈ 5–10) and run HR on those truncated lists. This is the approach used in the real NRMP (National Resident Matching Program) since 1998. [(Roth & Peranson, 1999)](https://doi.org/10.1257/aer.89.4.748)

**Complexity improvement:**

| Stage | Current | With top-k |
|-------|---------|-----------|
| TF-IDF cosine scoring | O(n · m · f) | O(n · k · f) — only score top-k candidates |
| Preference generation | O((n+m) · m · log m) | O((n+m) · k · log k) |
| HR algorithm | O(n · m) | O(n · k) |
| **Total** | **O(n · m · f)** | **O(n · k · f), k << m** |

**Trade-off:** Stability is guaranteed only within the retained top-k preferences. A mentee not appearing in a mentor's top-k list cannot be matched to that mentor even if no other stable match exists, potentially leaving more mentees unmatched. Empirically, for the NRMP with k ≥ 10, unmatched rates are near-identical to the full-list version. [(Roth & Peranson, 1999)](https://doi.org/10.1257/aer.89.4.748)

**Applicability to this system:** With m ≤ 50 mentors at FEU Tech, k = m and this optimization is moot. It becomes relevant when m exceeds ~100. The current codebase already supports this as a future parameter: `generate_preferences()` in `matching.py` returns full ranked lists with no truncation — adding a `top_k` parameter requires only a `.[:top_k]` slice before the HR call.

---

#### Approach B — Approximate Nearest-Neighbor Pre-filtering (ANN)

**How it works:** Compute dense profile embeddings (e.g., sentence-BERT or TF-IDF sparse vectors projected to lower dimensions via SVD/PCA), then use an ANN index (FAISS HNSW) to retrieve the top-k most similar mentors per mentee in O(log m) per query. Run exact TF-IDF scoring only on those k pairs.

**Complexity improvement:**

| Stage | Current | With ANN |
|-------|---------|---------|
| Embedding / index build | — | O((n+m) · d) once, cached |
| ANN query (per mentee) | — | O(n · log m) |
| Exact TF-IDF on shortlist | O(n · m · f) | O(n · k · f) |
| **Total (cold)** | **O(n · m · f)** | **O((n+m)·d + n·k·f)** |
| **Total (warm, cached index)** | **O(n · m · f)** | **O(n · k · f)** |

**Trade-off:** Adds a dependency (FAISS or `hnswlib`), adds an index build step, and introduces approximate recall (top-k list may miss a true best match with low probability). ANN recall@10 is typically > 98% for text embeddings. Not worthwhile at FEU Tech's scale.

---

#### Approach C — Incremental / Cached Scoring

**How it works:** Store TF-IDF vectors per profile in the database. On each re-run, only recompute scores for the Δ profiles that changed since the last run; reuse cached dot products for the rest.

**Complexity improvement:**

| Scenario | Complexity |
|----------|-----------|
| First run (cold) | O(n · m · f) — no savings |
| Re-run with Δ changed profiles | O(Δ · m · f) — typically Δ ≈ 2–5 per week |
| Re-run with no changes | O(1) — return cached result |

**Trade-off:** Requires profile change tracking (e.g., `updated_at` timestamps) and cache invalidation logic. Adds operational complexity. Suitable if the matching algorithm is run frequently (e.g., daily) with few profile changes.

---

#### Summary Recommendation

For the current FEU Tech deployment (n ≤ 100, m ≤ 50), **no optimization is needed** — the full pipeline runs in under 2 seconds empirically. The table below documents the path for each scaling scenario:

| Faculty grows to… | Recommended approach | Expected complexity |
|-------------------|---------------------|-------------------|
| m ≤ 100 | No change needed | O(n) with fixed m |
| m = 100–500 | Truncated preference lists (k = 15–20) | O(n · k · f) |
| m > 500 | ANN pre-filtering + truncated lists | O(n · log m + n · k · f) |
| Frequent re-runs (daily) | Incremental cached scoring | O(Δ · m · f) per re-run |

**Formal claim for thesis:**
> The system's O(n · m · f) scoring phase can be reduced to O(n · k · f) (k ≪ m) by truncating preference lists to the top-k highest-scoring candidates before the HR algorithm runs. This preserves the HR algorithm's stability guarantee within the retained preference set (Roth & Peranson, 1999) and reduces the HR runtime from O(n · m) to O(n · k). For FEU Tech's deployment scale (m ≤ 50), the full-list approach is optimal; preference truncation represents the primary scalability path for institutional growth beyond m = 100.

---

## 3. Effectiveness Metrics

The algorithm's effectiveness is measured across four categories. Metrics #1–12 are computed automatically by `metrics.py`. Metrics #13–17 require post-deployment data.

---

### 3.1 Algorithmic Correctness Metrics

---

#### Metric #1 — Stability Rate [(Gale & Shapley, 1962)](https://doi.org/10.2307/2300560)

**Definition:** Percentage of all algorithm runs that produced a stable matching (no blocking pairs).

**Formula:**
```
stability_rate = (stable_runs / total_runs) × 100%
```
A *blocking pair* (mentee i, mentor j) exists if both:
- Mentee i prefers mentor j over their assigned mentor, AND
- Mentor j prefers mentee i over their worst current assigned mentee (or has spare capacity)

**Target:** 100% (the HR algorithm is proven to always produce stable matchings; any deviation indicates a bug or degenerate input).

**SQL query:**
```sql
SELECT
  COUNT(*) FILTER (WHERE (log_data->>'is_stable')::boolean = true)  AS stable_runs,
  COUNT(*)                                                           AS total_runs,
  ROUND(
    COUNT(*) FILTER (WHERE (log_data->>'is_stable')::boolean = true)
    * 100.0 / NULLIF(COUNT(*), 0), 1
  ) AS stability_rate_pct
FROM algorithm_logs;
```

**Interpretation:**
- 100% → System is working correctly. Report as "the proposed algorithm achieved stable matchings in 100% of test runs."
- < 100% → Investigate: likely a capacity constraint violation (total mentor capacity < total mentees) or a data integrity issue.

**Edge case:** If `total_runs = 0`, report "No runs recorded."

---

#### Metric #2 — Match Coverage

**Definition:** Percentage of mentee groups that received a mentor assignment in the latest run.

**Formula:**
```
match_coverage = (matched / (matched + unmatched)) × 100%
```

**Target:** 100% (all mentees should be matched when total mentor capacity ≥ n).

**SQL query:**
```sql
SELECT
  log_data->>'matched'   AS matched,
  log_data->>'unmatched' AS unmatched,
  ROUND(
    (log_data->>'matched')::numeric * 100.0
    / NULLIF((log_data->>'matched')::numeric + (log_data->>'unmatched')::numeric, 0),
    1
  ) AS coverage_pct
FROM algorithm_logs
ORDER BY created_at DESC
LIMIT 1;
```

**Interpretation:**
- 100% → Every mentee group received a mentor.
- < 100% → Some mentees are unmatched. Check that `SUM(mentor.mentor_capacity) >= COUNT(MENTEE_GROUPS)`. The safety net in `matching.py` assigns remaining mentees to the mentor with most remaining capacity, so coverage should be 100% unless total capacity is genuinely exhausted.

---

#### Metric #3 — Capacity Utilization

**Definition:** Percentage of total available mentor slots that were filled.

**Formula:**
```
capacity_utilization = (total_assigned / total_capacity) × 100%
```
where `total_capacity = SUM(mentor.mentor_capacity)`.

**Target:** ≥ 80% (high utilization indicates good use of faculty resources; < 80% suggests over-provisioned capacity).

**SQL queries:**
```sql
-- Total assigned
SELECT COUNT(*) AS assigned FROM matches WHERE status = 'active';

-- Total capacity
SELECT SUM(COALESCE(mentor_capacity, 1)) AS total_capacity FROM mentor;

-- Per-mentor fill
SELECT
  m.first_name || ' ' || m.last_name AS mentor_name,
  COALESCE(m.mentor_capacity, 1)     AS capacity,
  COUNT(mt.mentor_id)                AS assigned,
  ROUND(COUNT(mt.mentor_id) * 100.0 / NULLIF(COALESCE(m.mentor_capacity, 1), 0), 0) AS fill_pct
FROM mentor m
LEFT JOIN matches mt ON mt.mentor_id = m.id AND mt.status = 'active'
GROUP BY m.id, m.first_name, m.last_name, m.mentor_capacity
ORDER BY fill_pct DESC;
```

**Interpretation:**
- ≥ 80% → Resources are well-utilized.
- Mentors with fill_pct = 0% → Underloaded; consider reducing their capacity setting or flagging for the coordinator.
- Mentors with fill_pct > 100% → Over-assigned (safety net triggered); consider increasing their stated capacity.

---

#### Metric #4 — Fairness (Gini Coefficient) [(Gini, 1912)](https://doi.org/10.2307/2223319)

**Definition:** Measures inequality in compatibility score distribution across all matched pairs. Lower is fairer.

**Formula (normalized Gini for non-negative values):**
```
Sort scores in ascending order: s₁ ≤ s₂ ≤ ... ≤ sₙ

G = (2 · Σᵢ₌₁ⁿ (i · sᵢ)) / (n · Σᵢ₌₁ⁿ sᵢ)  −  (n + 1) / n
```

**Step-by-step example** (n = 4 scores: [0.72, 0.80, 0.85, 0.93]):
```
Sorted:  0.72, 0.80, 0.85, 0.93
Σ sᵢ   = 3.30
Σ i·sᵢ = 1(0.72) + 2(0.80) + 3(0.85) + 4(0.93)
       = 0.72 + 1.60 + 2.55 + 3.72 = 8.59
G = 2(8.59) / (4 · 3.30)  −  5/4
  = 17.18 / 13.20  −  1.25
  = 1.301  −  1.25
  = 0.051
```

A Gini of 0.051 indicates very low inequality — the matches are fairly distributed.

**Interpretation scale:**
| G value | Interpretation |
|---------|---------------|
| 0.00 | All matches have identical scores (perfectly equal) |
| 0.00–0.10 | Very low inequality — target range |
| 0.10–0.20 | Moderate inequality — some mentees are significantly better matched than others |
| > 0.20 | High inequality — a few matches are very good while others are poor; investigate |

**Target:** G ≤ 0.10

**SQL query:**
```sql
-- Gini numerator/denominator for manual computation
SELECT
  score_rank,
  compatibility_score,
  score_rank * compatibility_score AS weighted
FROM (
  SELECT
    ROW_NUMBER() OVER (ORDER BY compatibility_score) AS score_rank,
    compatibility_score
  FROM matches
  WHERE status = 'active'
) ranked;
```

**Edge cases:**
- If n = 1: G is undefined; return 0 (single match cannot have inequality).
- If all scores are identical: G = 0.
- The scoring system clips all scores to [0.70, 1.00], which compresses the range and will naturally keep G low.

---

#### Metric #5 — Score Floor Compliance

**Definition:** Percentage of matches where `compatibility_score ≥ 0.70`.

**Formula:**
```
floor_compliance = (matches_with_score ≥ 0.70 / total_matches) × 100%
```

**Target:** 100% (the 0.70 floor is enforced by `np.clip()` in `scoring.py`, so this is always 100% in a correctly functioning system).

**Purpose:** This is a sanity check. Reporting 100% confirms the scoring pipeline is functioning as intended and that no un-clipped scores leaked into the database.

**SQL query:**
```sql
SELECT
  COUNT(*)                                            AS total_matches,
  COUNT(*) FILTER (WHERE compatibility_score >= 0.70) AS compliant,
  COUNT(*) FILTER (WHERE compatibility_score <  0.70) AS violations
FROM matches
WHERE status = 'active';
```

**Interpretation:** Any violation (score < 0.70) indicates a data integrity issue or a regression in the scoring pipeline. Flag immediately.

---

### 3.2 Semantic Match Quality Metrics

---

#### Metric #6 — Keyword Precision [(Salton & Buckley, 1988)](https://doi.org/10.1016/0306-4573(88)90021-0)

**Definition:** For each matched pair, the proportion of keywords in `matched_keywords` that genuinely appear in both the mentor's and mentee's profile text.

**Formula:**
```
precision_per_pair = hits / total_keywords_for_pair

where a "hit" = keyword appears (case-insensitive) in mentor text AND mentee text

keyword_precision = MEAN(precision_per_pair) × 100%
```

**Profile text sources:**
- Mentor text: `forte` array + `technical_skills` array + `prev_mentored_thesis` array (joined as a single string)
- Mentee text: `research_description` + `mentor_preference` + `research_title` (joined)

**Automated check (Python):**
```python
mentor_text = " ".join([
    *mentor.get("forte", []),
    *mentor.get("technical_skills", []),
    *mentor.get("prev_mentored_thesis", []),
]).lower()

mentee_text = " ".join([
    mentee.get("research_description", ""),
    mentee.get("mentor_preference", ""),
    mentee.get("research_title", ""),
]).lower()

hits = sum(1 for kw in match["matched_keywords"] if kw.lower() in mentor_text and kw.lower() in mentee_text)
precision = hits / len(match["matched_keywords"])
```

**Target:** ≥ 80%

**Interpretation:**
- ≥ 90% → Excellent. Matched keywords are strong evidence of alignment.
- 80–90% → Good. Minor false positives from domain expansion (expected).
- < 80% → Investigate. May indicate domain expansion is too aggressive or the keyword extractor is picking up unrelated bigrams.

**Note on domain expansion:** Keywords added via `DOMAIN_MAP` expansion may appear in neither raw profile verbatim (e.g., "tokenization" expanded from "nlp"). These count as imprecise by the above definition. This is expected and acceptable; note it in the thesis as "domain-expanded keywords are semantically but not textually present."

**Edge case:** If a match has zero `matched_keywords`, it is excluded from the precision calculation (undefined). Report the number of pairs checked separately.

---

#### Metric #7 — Domain Overlap Rate

**Definition:** Average number of shared research domains per matched pair, as recorded by the scoring pipeline.

**Formula:**
```
domain_overlap_rate = MEAN(len(shared_domains)) across all scored pairs
```

**Data source:** `algorithm_logs.log_data.phase2.scores[*].top_matches[*].shared_domains`

The `shared_domains` field is populated by `scoring.py` via `DOMAIN_MAP` expansion. If both mentor and mentee profiles contain terms that expand to the same canonical domain (e.g., both have "nlp" → `["natural language processing", "tokenization", ...]`), that domain is listed as shared.

**Target:** ≥ 1.0 average shared domains per pair (at least one domain in common for the top match)

**Interpretation:**
- ≥ 2.0 → Strong domain alignment. Pairs share multiple research areas.
- 1.0–2.0 → Moderate alignment. Typical for CS faculty with broad profiles.
- < 1.0 → Low domain overlap. The keyword-only TF-IDF cosine score is carrying most of the compatibility signal. Check if profiles are too sparse.

---

#### Metric #8 — Mentee Preferred-Match Rate

**Definition:** Percentage of mentees whose assigned mentor was ranked #1 or #2 in their personal preference list.

**Formula:**
```
preferred_match_rate = (mentees_whose_assigned_mentor_ranked ≤ 2 / total_mentees) × 100%
```

**Data sources:**
- Preference list: `mentee_preferences.ranked_mentors` (array of `{rank, mentor_id, ...}` objects)
- Actual assignment: `matches.mentor_id`

**SQL query:**
```sql
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (
    WHERE pref_rank <= 2
  ) AS top_2_preferred,
  ROUND(
    COUNT(*) FILTER (WHERE pref_rank <= 2) * 100.0 / COUNT(*),
    1
  ) AS preferred_rate_pct
FROM (
  SELECT
    m.mentee_group_id,
    (
      SELECT rm->>'rank'
      FROM mentee_preferences mp,
           jsonb_array_elements(mp.ranked_mentors) rm
      WHERE mp.mentee_group_id = m.mentee_group_id
        AND (rm->>'mentor_id') = m.mentor_id
      LIMIT 1
    )::int AS pref_rank
  FROM matches m
  WHERE m.status = 'active'
) ranked;
```

**Target:** ≥ 60%

**Interpretation:**
- ≥ 80% → Excellent. Most mentees received their top-choice mentor.
- 60–80% → Good. The algorithm is finding near-optimal mentee outcomes.
- < 60% → Investigate capacity constraints. If mentors have capacity = 1 and many mentees share the same top-ranked mentor, lower-preferred assignments are inevitable.

**Note on mode:** The `mentee-optimal` mode maximizes this metric by design. The `fair-matching` mode may produce slightly lower mentee preferred rates in exchange for better mentor preferred rates.

---

#### Metric #9 — Mentor Preferred-Match Rate

**Definition:** Percentage of mentor-mentee assignments where the mentee group fell within the mentor's top ⌈n/3⌉ ranked mentees.

**Formula:**
```
top_tier = ceil(total_mentees / 3)   ← top third of mentor's preference list

preferred_rate = (assignments where mentee rank ≤ top_tier / total_assignments) × 100%
```

**Rationale for ⌈n/3⌉:** Mentors assess many groups; being assigned a group in the top third of their ranking represents genuine preference alignment. Using rank ≤ 2 (as for mentees) would be too strict when a mentor is evaluating 25+ groups.

**Target:** ≥ 60%

**Data sources:** `mentor_preferences.ranked_mentees`, `matches`

**Interpretation:** Symmetric to metric #8 but from the mentor's perspective. The `mentor-optimal` mode maximizes this metric.

---

### 3.3 Efficiency Metrics

---

#### Metric #10 — Throughput

**Definition:** Number of stable match pairs produced per second of wall-clock time.

**Formula:**
```
throughput = matched / wall_clock_latency_seconds   (matches/sec)
```

**Data source:** `algorithm_logs.log_data.matched` and `algorithm_logs.log_data.started_at` / `.timestamp`

**Note:** The `started_at` field is captured at the very start of the `if __name__ == "__main__"` block in `main.py` (before Supabase connection). The `timestamp` field is captured immediately before writing to the database. The latency therefore includes: Supabase data fetch, keyword extraction, TF-IDF scoring, Gale-Shapley, and all logging — but excludes the final database write.

**Typical range (10 mentors, n = 25):** ~50–100 matches/sec

---

#### Metric #11 — Wall-Clock Latency

**Definition:** End-to-end time from algorithm invocation to results ready (pre-DB write).

**Formula:**
```
latency = timestamp − started_at   (in seconds)
```

Both fields are ISO-8601 UTC timestamps stored in `algorithm_logs.log_data`.

**SQL query:**
```sql
SELECT
  (log_data->>'timestamp')::timestamptz - (log_data->>'started_at')::timestamptz AS latency,
  log_data->>'matched' AS matched,
  created_at
FROM algorithm_logs
ORDER BY created_at DESC
LIMIT 1;
```

**Interpretation:**
- < 2 s for n ≤ 50 → Fast; well within real-time expectations.
- 2–10 s for n ≤ 200 → Acceptable for a scheduled/batch job.
- > 10 s → Profile texts may be very long, or scoring.py TF-IDF is receiving many documents; check `k` (profile word count).

---

#### Metric #12 — Score Distribution

**Definition:** Statistical summary of all `compatibility_score` values in the current match set.

**Statistics reported:** mean, median, standard deviation, minimum, maximum, 25th percentile (P25), 75th percentile (P75).

**SQL query:**
```sql
SELECT
  ROUND(AVG(compatibility_score)::numeric, 4)                   AS mean,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY compatibility_score)::numeric, 4) AS median,
  ROUND(STDDEV(compatibility_score)::numeric, 4)                AS std,
  ROUND(MIN(compatibility_score)::numeric, 4)                   AS min,
  ROUND(MAX(compatibility_score)::numeric, 4)                   AS max,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY compatibility_score)::numeric, 4) AS p25,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY compatibility_score)::numeric, 4) AS p75
FROM matches
WHERE status = 'active';
```

**Interpretation:**
- High mean (> 0.80) + low std (< 0.05) → Matches are consistently strong and fair.
- Low mean (< 0.75) → Profiles may be semantically sparse; keyword extraction is finding few overlaps.
- High std (> 0.08) → Some pairs are excellent while others are marginal; consider checking for Gini > 0.10 as well.
- P25 close to min → A significant tail of poor matches; investigate unmatched-keyword pairs.

---

### 3.4 User Outcome Metrics

These require post-deployment data collection (surveys, system logs over one semester).

| # | Metric | Measurement method | Scale |
|---|--------|-------------------|-------|
| 13 | **Peak memory usage** | `tracemalloc.get_traced_memory()[1]` in `main.py` before DB write | MB |
| 14 | **Post-match satisfaction score** | End-of-semester Likert survey: "How satisfied are you with your matched mentor/mentee?" | 1–5 |
| 15 | **Meeting adherence rate** | `(actual meetings logged / scheduled recurring meetings) × 100%` | % |
| 16 | **Paper submission rate** | Papers submitted per mentee group per semester | count |
| 17 | **Thesis completion rate** | % of matched groups that complete and submit their final thesis chapter | % |

**How to measure #13 (peak memory):**
Add to `main.py` before the `if __name__ == "__main__":` block:
```python
import tracemalloc
tracemalloc.start()
```
At the end, before DB write:
```python
current, peak = tracemalloc.get_traced_memory()
print(f"  Peak memory: {peak / 1024 / 1024:.1f} MB")
tracemalloc.stop()
```

**Suggested survey questions for #14:**
- Mentee: "My assigned mentor has relevant expertise in my research area." (1–5)
- Mentee: "I am satisfied with the matching result." (1–5)
- Mentor: "The mentee group assigned to me aligns with my research focus." (1–5)
- Mentor: "I am satisfied with the matching result." (1–5)

---

### 3.5 Running All Metrics

The `metrics.py` script (`app/algo/preprocess/metrics.py`) computes metrics #1–12 automatically from live Supabase data.

**Prerequisites:** Run the matching algorithm at least once (any mode) to populate `algorithm_logs`, `matches`, `mentee_preferences`, and `mentor_preferences`.

```bash
# Activate the Python virtual environment
source app/algo/venv/bin/activate

cd app/algo/preprocess

# Full report + all charts + text log (default)
python3 metrics.py

# Save results as JSON (for thesis appendix)
python3 metrics.py --save metrics_output.json

# Machine-readable JSON only (no report, no charts)
python3 metrics.py --json

# Report + log only, skip chart generation
python3 metrics.py --no-charts

# Evaluate a specific past run (by algorithm_logs ID)
python3 metrics.py --log-id <uuid>
```

**Output files** (all in `app/algo/preprocess/`, overwritten on every run):

| File | Content |
|------|---------|
| `metrics_log.txt` | Full text report identical to stdout + scipy stats |
| `metrics_score_distribution.png` | Histogram + KDE [(Pedregosa et al., 2011)](https://jmlr.csail.mit.edu/papers/v12/pedregosa11a.html) + mean/median lines + skewness/kurtosis annotation |
| `metrics_lorenz_curve.png` | Lorenz curve [(Gini, 1912)](https://doi.org/10.2307/2223319) with shaded inequality area and G value |
| `metrics_capacity.png` | Horizontal bar chart per mentor, color-coded by fill % |
| `metrics_summary.png` | 2×2 dashboard combining all four charts above |

**Sample output:**
```
══════════════════════════════════════════════════════
  FORTIS NEXUS — THESIS METRICS REPORT
  Run: 2026-05-10 14:32:01 UTC  ·  fair-matching
══════════════════════════════════════════════════════

  ──────────────────────────────────────────────────
  3.1  CORRECTNESS METRICS
  ──────────────────────────────────────────────────
  [#1] Stability Rate .............. 100.0%  ✅  (3/3 stable runs)
  [#2] Match Coverage .............. 100.0%  ✅  (25/25 matched)
  [#3] Capacity Utilization ......... 83.3%  ✅  (25/30 slots used)
  [#4] Gini Coefficient .............. 0.04  ✅  (≤ 0.10 target)
  [#5] Score Floor Compliance ...... 100.0%  ✅  (all ≥ 0.70)

  ──────────────────────────────────────────────────
  3.2  SEMANTIC QUALITY METRICS
  ──────────────────────────────────────────────────
  [#6] Keyword Precision ............. 91.3%  ✅  (avg per match)
  [#7] Domain Overlap Rate ........... 2.4   ✅  (avg shared domains)
  [#8] Mentee Preferred-Match Rate .. 72.0%  ✅  (top-2 mentor)
  [#9] Mentor Preferred-Match Rate .. 68.0%  ✅  (top-tier mentees)

  ──────────────────────────────────────────────────
  3.3  EFFICIENCY METRICS
  ──────────────────────────────────────────────────
  [#10] Throughput ............. 13.9 matches/sec
  [#11] Wall-Clock Latency ..........  1.8 s
  [#12] Score Distribution  (n=25)
         Mean   : 0.8470    Median : 0.8510
         Std    : 0.0430    Min    : 0.7120    Max : 0.9410
         P25    : 0.8190    P75    : 0.8780

══════════════════════════════════════════════════════

  Mentor Capacity Breakdown:
  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
  Dr. Santos             3/3  [███]  100%
  Dr. Reyes              3/4  [███░]  75%
  Dr. Cruz               2/3  [██░]   67%
```

---

## 4. Comparison Baselines

To demonstrate that the system improves on alternatives, compare against:

| Baseline | Method | Stability | Expected avg score |
|----------|--------|-----------|-------------------|
| **Random assignment** | Assign mentors randomly (respecting capacity) | ✗ Not stable | Low (~0.70, floor) |
| **Manual/historical** | Use previous semester's coordinator-assigned pairings (if available) | Unknown | Medium |
| **Greedy first-fit** | Assign each mentee to their highest-scoring available mentor | ✗ Not stable | High, but some mentees get poor matches |
| **Proposed system (HR + TF-IDF)** | This system | ✓ Guaranteed stable | High, balanced (low Gini) |

**Metrics to report in the comparison table:**

| Metric | Random | Greedy | Proposed System |
|--------|--------|--------|----------------|
| Stability rate (#1) | 0% | 0% | 100% |
| Mean compatibility score (#12 mean) | ~0.70 | High but uneven | High and even |
| Gini coefficient (#4) | High | Moderate | ≤ 0.10 |
| Mentee preferred-match rate (#8) | ~1/m × 100% | Variable | ≥ 60% |

**How to simulate Random and Greedy for comparison:**
- Random: shuffle mentees and assign round-robin to mentors up to capacity. Compute scores from existing `matches` data re-assigned randomly.
- Greedy: for each mentee in order of highest top-1 score, assign to their top mentor if capacity remains, else second-best, etc. Verify no stability guarantees.
Both baselines can be implemented in `test_pipeline.py` with the `--baseline` flag (future work).

---

## 5. Research Questions Mapped to Metrics

| Research Question | Primary Metrics | `metrics.py` Output Section | How to Compute |
|-------------------|----------------|----------------------------|---------------|
| Does the algorithm produce stable matches? | #1 Stability rate | 3.1 Correctness | `algorithm_logs.is_stable` across all runs |
| How efficiently does it match all groups? | #2 Match coverage, #3 Capacity utilization | 3.1 Correctness | Count rows in `matches` vs. total capacity |
| Are the matches semantically meaningful? | #6 Keyword precision, #7 Domain overlap | 3.2 Semantic Quality | String overlap check + JSONB query |
| Is the algorithm fair to both parties? | #4 Gini coefficient, #8–9 Preferred-match rates | 3.1 + 3.2 | Score distribution analysis |
| Does it scale for institutional deployment? | #10 Throughput, #11 Latency, #12 Scaling coeff. | 3.3 Efficiency | `metrics.py` + `benchmark.py` output |
| Is the time complexity manageable? | R² of linear regression in benchmark | N/A (benchmark.py) | Run `benchmark.py`, read printed R² |
| Do matched pairs achieve better thesis outcomes? | #14 Satisfaction, #16 Paper rate, #17 Completion | Post-semester survey | Survey + system logs (future work) |

---

## 6. How to Run the Benchmark

```bash
# Activate the Python virtual environment
source app/algo/venv/bin/activate

# Synthetic O(n) scaling benchmark (generates benchmark_results.png)
cd app/algo/preprocess
python3 benchmark.py

# Interactive test pipeline with hardcoded data (100 mentees, 15 mentors)
python3 test_pipeline.py

# Test pipeline options:
python3 test_pipeline.py --scores-only     # scoring stage only (skip matching)
python3 test_pipeline.py --matching-only   # matching only
python3 test_pipeline.py --summary         # compact output
python3 test_pipeline.py --pair 0 3        # diagnose mentor 0 vs mentee 3 specifically

# Live metrics report against production Supabase data
python3 metrics.py
python3 metrics.py --save metrics_output.json
```

**Relationship between the scripts:**

| Script | Data | Purpose | When to use |
|--------|------|---------|-------------|
| `benchmark.py` | Synthetic | Proves O(n) scaling; generates timing plot | For thesis complexity section |
| `test_pipeline.py` | Hardcoded | Validates algorithm behavior in isolation | During development/debugging |
| `metrics.py` | Live Supabase | Computes all thesis effectiveness metrics | For thesis results chapter |

The benchmark confirms linear O(n) scaling and produces a plot of wall-clock time vs. n with a linear regression overlay and R² score. The `metrics.py` script reports real-world performance on actual FEU Tech profiles and provides the numbers to include directly in the thesis.

---

## 7. Proposal Explanation

This section walks through the complete execution of the fair-matching pipeline — from raw profiles to final match records — in the exact order the code runs. It is written to be readable as a standalone explanation suitable for the thesis methodology chapter.

---

### Step 1 — Compatibility Scoring

Before any matching happens, every possible mentor–mentee pair receives a single compatibility score between 0 and 1. The formula combines five weighted components:

```
final_score = 0.75 × keyword_similarity
            + 0.10 × experience
            + 0.10 × availability
            + 0.025 × communication_preference
            + 0.025 × meeting_frequency
```

**Keyword similarity** is the dominant signal. For each pair, the algorithm extracts shared technical vocabulary from the mentor's skills/forte/thesis history and the mentee's research description, then applies TF-IDF cosine similarity to measure how semantically close the two profiles are.

Two score floor boosts are then applied:
- ≥ 2 matched keywords → final score is raised to at least **0.50**
- ≥ 4 matched keywords → final score is raised to at least **0.80**

The result is a complete **n × m score matrix** (n mentee groups × m mentors). All subsequent steps derive from this matrix.

---

### Step 2 — Preference Lists

Both sides build a fully ranked list from the score matrix:

- **Each mentee group** sorts all mentors by `scores[i][j]` descending — producing their personal ranked list of mentors from most to least preferred.
- **Each mentor** sorts all mentees by `scores[i][j]` descending — producing their personal ranked list of mentee groups from most to least preferred.

These are **complete, untruncated lists**. Truncating preference lists is intentionally avoided because it causes mentees to go unmatched when their top-choice mentors fill up — any mentee not on a mentor's retained list can never be assigned to them, even if no other stable match exists.

The output is two dictionaries:
- `mentee_prefs`: `{ mentee_id → [mentor_id, ...] }` ranked best → worst
- `mentor_prefs`: `{ mentor_id → [mentee_id, ...] }` ranked best → worst

---

### Step 3a — Mentee-Optimal Run (`hospital_resident`)

This is the **mentees-propose** variant of the Hospital-Resident (Gale-Shapley) algorithm. Mentees hold the proposing role; mentors hold and compare offers.

**Setup:**
- All mentee groups are placed in a free queue.
- Each mentor pre-computes a rank dictionary `hospital_rank[mentor_id][mentee_id]` for O(1) preference comparisons.
- Each mentor tracks their current tentative roster up to their stated capacity.

**Round-by-round execution:**

1. A free mentee is dequeued and proposes to the next mentor on their preference list (tracked by `next_proposal[mentee_id]` — a mentee never proposes to the same mentor twice).
2. The mentor evaluates the proposal:

| Outcome | Condition | Effect |
|---------|-----------|--------|
| **Accept** | Mentor has a free slot | Mentee joins the roster; both are tentatively matched |
| **Reject** | Mentor is full AND ranks all current mentees above the proposer | Proposer is re-queued and advances to their next choice |
| **Replace** | Mentor is full BUT ranks the proposer above their current worst-held mentee | Worst-held mentee is freed and re-queued; proposer takes the slot |

3. Freed or rejected mentees continue proposing down their list.
4. The algorithm terminates when the free queue is empty.

**Guarantee:** The result is **mentee-optimal** — every mentee group receives the best mentor they could get in any stable matching. No other stable matching exists where any mentee would prefer their assignment. This is simultaneously the worst stable matching for mentors.

**Data structures:** `free_residents` deque, `next_proposal` index dict, `hospital_rank` rank dict, `hospital_assignments` roster list per mentor.

---

### Step 3b — Mentor-Optimal Run (`hospital_resident_mentor_optimal`)

This is the **mentors-propose** variant — the same algorithm with roles inverted. Mentors hold the proposing role; mentees hold and compare offers.

**Setup:**
- All mentors with available capacity are placed in an active queue.
- Each mentee pre-computes a rank dictionary `resident_rank[mentee_id][mentor_id]` for O(1) comparisons.
- Each mentee tracks their single best-held offer (`resident_holding[mentee_id]`).

**Round-by-round execution:**

1. An active mentor is dequeued and proposes to the next mentee on their preference list (tracked by `hospital_proposal_index[mentor_id]`).
2. The mentee evaluates the proposal:

| Outcome | Condition | Effect |
|---------|-----------|--------|
| **Accept** | Mentee holds no offer yet | Mentee tentatively accepts; mentor's remaining slots decrement |
| **Reject** | Mentee already holds a preferred offer | Proposing mentor is re-queued to try their next mentee |
| **Replace** | Mentee holds an offer but prefers the new proposer | Previous mentor's slot is restored and they re-enter the active queue; new mentor takes the slot |

3. A mentor stays active (re-enters the queue) until all their capacity slots are filled or their preference list is exhausted.
4. The algorithm terminates when the active-mentor queue is empty.

**Guarantee:** The result is **mentor-optimal** — every mentor receives the best set of mentees they could get in any stable matching. This is simultaneously the worst stable matching for mentees.

Both runs are fully independent and produce a different, internally stable assignment. The two assignments are passed to the fairness comparison step.

---

### Step 4 — Fairness Comparison (`pick_fairer_matching`)

Both assignments are stable, but they systematically favor opposite sides. The system selects the fairer result by measuring **combined dissatisfaction** from both sides.

**Dissatisfaction definition:** For a matched pair, the dissatisfaction of one party equals the **rank position** of their assigned partner in their own preference list (0-indexed: rank 0 = top choice, rank 1 = second choice, etc.). Lower is always better.

**Computation for each of the two assignments:**

```
mentee_dissatisfaction  = average rank of assigned mentor across all mentees
mentor_dissatisfaction  = average rank of each assigned mentee across all mentor slots
                          (capacity > 1 handled by summing across every assigned mentee per mentor)

total_dissatisfaction   = mentee_dissatisfaction + mentor_dissatisfaction
```

**Selection rule:**

```
total_mo  = total dissatisfaction for the mentee-optimal result
total_meo = total dissatisfaction for the mentor-optimal result

selected  = mentee-optimal  if  total_mo ≤ total_meo
            mentor-optimal  otherwise
```

Ties break in favor of mentee-optimal.

**Why this is fair:** The mentee-optimal result gives mentees their best possible outcome at mentors' expense; the mentor-optimal result gives mentors their best at mentees' expense. The combined dissatisfaction sum quantifies the total "unhappiness" imposed on the entire system. Selecting the minimum ensures neither side is systematically disadvantaged across runs.

| Variant | Favors | Combined dissatisfaction selected when |
|---------|--------|---------------------------------------|
| Mentee-optimal | Mentees | `total_mo ≤ total_meo` (tie → mentee-optimal wins) |
| Mentor-optimal | Mentors | `total_meo < total_mo` |
| **Fair-matching output** | **Neither systematically** | **One of the above is chosen per run** |

Both sets of proposal events (`proposal_events_mo` and `proposal_events_meo`) are retained in `algorithm_logs` regardless of which variant is selected, providing full auditability.

---

### Step 5 — Stability Verification (`verify_stability`)

The selected assignment is checked for **blocking pairs** — any (mentee, mentor) pair where both would mutually prefer each other over their current match.

A blocking pair `(mentee m, mentor M)` exists when **all three** conditions hold:
1. Mentee `m` prefers mentor `M` over their currently assigned mentor.
2. Either mentor `M` has a spare capacity slot, **or** mentor `M` would rank `m` above their current worst-held mentee.

The verifier iterates over every possible (mentee, mentor) combination — O(n × m) checks — using precomputed rank dictionaries for O(1) per-pair evaluation.

**Expected result:** Zero blocking pairs. Both HR variants are mathematically proven to produce stable matchings [(Gale & Shapley, 1962)](https://doi.org/10.2307/2300560); any blocking pair found in practice indicates a capacity constraint violation or a data integrity issue.

The stability flag (`is_stable: true/false`) is stored in both the `matches` table and `algorithm_logs` for every run.

---

### Step 6 — Safety Net (`_apply_safety_net`)

After the HR algorithm terminates, any mentee that remains unmatched — which only occurs when total mentor capacity is less than the number of mentee groups — is force-assigned to the mentor with the **most remaining capacity**.

This is a fallback mechanism, not part of the stable matching:
- It produces warnings in the log for every forced assignment.
- The resulting assignments are not guaranteed stable (no blocking-pair check is performed for safety-net pairs).
- Frequent warnings indicate that the sum of all `mentor.mentor_capacity` values needs to be increased to meet demand.

Under normal operation (total capacity ≥ n), this step completes immediately with no assignments made.

---

### Step 7 — Build Match Records

For every pair in the final assignment, one record is written to the `matches` table:

| Field | Value | Source |
|-------|-------|--------|
| `mentee_group_id` | Mentee's UUID | Assignment dict key |
| `mentor_id` | Mentor's UUID | Assignment dict value |
| `compatibility_score` | `scores[mentee_i][mentor_j]` | Score matrix from Step 1 |
| `matched_keywords` | Shared technical vocabulary | `get_matched_keywords(mentor, mentee)` |
| `status` | `"active"` | Fixed |
| `algorithm` | `"fair-matching"` | Fixed for this mode |
| `is_stable` | `True` / `False` | From Step 5 |

The `compatibility_score` is the **raw pair score from the Phase 2 matrix** — not recalculated, not averaged. It reflects the actual five-pillar weighted compatibility between that specific mentor and mentee group as computed before any matching logic ran.

---

## References

- **Gale, D. & Shapley, L.S. (1962).** College Admissions and the Stability of Marriage. *The American Mathematical Monthly*, 69(1), 9–15. — Original stable matching / Gale-Shapley algorithm paper. https://doi.org/10.2307/2300560

- **Gusfield, D. & Irving, R.W. (1989).** *The Stable Marriage Problem: Structure and Algorithms.* MIT Press. — Proves Ω(n·m) lower bound for stable matching (Section 2.4). https://mitpress.mit.edu/9780262071703

- **Roth, A.E. (1984).** The Evolution of the Labor Market for Medical Interns and Residents: A Case Study in Game Theory. *Journal of Political Economy*, 92(6), 991–1016. — Hospital-Resident (HR) algorithm as applied to real-world many-to-one matching. https://doi.org/10.2307/1912320

- **Roth, A.E. & Sotomayor, M. (1990).** *Two-Sided Matching: A Study in Game-Theoretic Modeling and Analysis.* Cambridge University Press. — Comprehensive theoretical treatment of HR and two-sided matching. https://doi.org/10.1017/CCOL052139015X

- **Salton, G. & Buckley, C. (1988).** Term-weighting approaches in automatic text retrieval. *Information Processing & Management*, 24(5), 513–523. — TF-IDF term weighting scheme used in `scoring.py`. https://doi.org/10.1016/0306-4573(88)90021-0

- **Pedregosa, F. et al. (2011).** Scikit-learn: Machine Learning in Python. *Journal of Machine Learning Research*, 12, 2825–2830. — TF-IDF vectorizer and cosine similarity implementation. https://jmlr.csail.mit.edu/papers/v12/pedregosa11a.html

- **Jaccard, P. (1901).** Étude comparative de la distribution florale dans une portion des Alpes et des Jura. *Bulletin de la Société Vaudoise des Sciences Naturelles*, 37, 547–579. — Jaccard similarity index used for availability overlap scoring. https://doi.org/10.2307/3771392

- **Gini, C. (1912).** Variabilità e mutabilità. Reprinted in *Memorie di metodologica statistica* (1955). — Original Gini coefficient definition used for match fairness (metric #4). https://doi.org/10.2307/2223319

- **Roth, A.E. & Peranson, E. (1999).** The Redesign of the Matching Market for American Physicians: Some Engineering Aspects of Economic Design. *American Economic Review*, 89(4), 748–780. — HR algorithm with incomplete (truncated) preference lists; basis for Section 2.6 complexity reduction discussion. https://doi.org/10.1257/aer.89.4.748

- **Davis, F.D. (1989).** Perceived Usefulness, Perceived Ease of Use, and User Acceptance of Information Technology. *MIS Quarterly*, 13(3), 319–340. — Technology Acceptance Model (TAM); basis for T1–T12 constructs (Perceived Usefulness, Perceived Ease of Use, Behavioral Intention to Use) in the user satisfaction survey. https://doi.org/10.2307/249008
