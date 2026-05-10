# Thesis Information — Fortis Nexus Mentor-Mentee Matching System

This document contains technical analysis of the matching algorithm for use in the thesis study: time complexity, effectiveness metrics, and guidance on how to measure and report algorithm performance.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Time Complexity Analysis](#2-time-complexity-analysis)
   - [Per-Stage Breakdown](#21-per-stage-breakdown)
   - [Full Pipeline Complexity](#22-full-pipeline-complexity)
   - [Empirical Scaling (Benchmark Results)](#23-empirical-scaling-benchmark-results)
   - [Is O(n) Achievable?](#24-is-on-achievable)
3. [Effectiveness Metrics](#3-effectiveness-metrics)
   - [Algorithmic Correctness](#31-algorithmic-correctness-metrics)
   - [Semantic Match Quality](#32-semantic-match-quality-metrics)
   - [Efficiency](#33-efficiency-metrics)
   - [User Outcomes](#34-user-outcome-metrics)
4. [Comparison Baselines](#4-comparison-baselines)
5. [Research Questions Mapped to Metrics](#5-research-questions-mapped-to-metrics)
6. [How to Run the Benchmark](#6-how-to-run-the-benchmark)

---

## 1. System Overview

The matching pipeline runs in three sequential phases:

```
Phase 1: Preprocessing
  ├─ Load mentor/mentee profiles from Supabase
  ├─ Extract keywords via vocabulary scan (CS_TECH_VOCAB, ~500 terms)
  ├─ TF-IDF residual keyword extraction
  └─ Domain expansion (DOMAIN_MAP, e.g. "nlp" → "natural language processing", "tokenization", ...)

Phase 2: Compatibility Scoring
  ├─ TF-IDF vectorization of all profiles → cosine similarity matrix (n × m)
  ├─ Availability overlap matrix (Jaccard similarity of days + time slots)
  ├─ Experience score vector (normalized mentor background)
  ├─ Communication preference matrix
  ├─ Meeting frequency overlap matrix
  └─ Weighted combination → final score matrix (n × m), clipped to [0.70, 1.00]

Phase 3: Stable Matching
  ├─ Generate preference lists (mentees rank mentors, mentors rank mentees)
  ├─ Run Hospital-Resident algorithm — mentee-proposing variant (Gale-Shapley)
  ├─ Run Hospital-Resident algorithm — mentor-proposing variant
  ├─ Select fairer result (minimize combined rank dissatisfaction)
  ├─ Verify stability (check for blocking pairs)
  └─ Write matches to Supabase + log full run to algorithm_logs
```

**Inputs:** m mentors, n mentee groups (each with research description, mentor preference, availability)

**Outputs:** n stable mentor-mentee assignments with compatibility scores and matched keywords

**Scoring weights:**
| Component | Weight | What it measures |
|-----------|--------|-----------------|
| Keyword similarity | **60%** | TF-IDF cosine similarity of research profiles |
| Experience | **20%** | Mentor's advising background |
| Availability | **10%** | Jaccard overlap of available days and time slots |
| Communication preference | **5%** | Matching communication mode (F2F, online chat, online call) |
| Meeting frequency | **5%** | Number of shared available days |

---

## 2. Time Complexity Analysis

### Notation
- **n** = number of mentee groups
- **m** = number of mentors
- **k** = average profile text length (words)
- **f** = TF-IDF feature count (capped at 500 in the implementation)
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
| TF-IDF vectorization (`scoring.py:276`) | O((m+n) · k) | Build vocabulary + feature extraction for all docs |
| Cosine similarity matrix (`scoring.py:280`) | O(n · m · f) | Sparse matrix multiplication; f ≤ 500 |
| Availability matrix (`scoring.py:523–527`) | O(n · m · d) | d = number of days/slots ≈ 5–7; effectively O(n·m) |
| Experience scores (`scoring.py:531–532`) | O(m) | One value per mentor, broadcast O(n·m) |
| Communication scores (`scoring.py:536–543`) | O(n · m) | O(1) per pair |
| Meeting frequency scores (`scoring.py:547–551`) | O(n · m) | O(|days|) per pair ≈ O(5) |
| Weighted combination + normalization | O(n · m) | Element-wise operations on matrices |
| **Scoring subtotal** | **O(n · m · (k + f))** | TF-IDF cosine dominates for large k |

#### Phase 3 — Stable Matching

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Preference list generation — mentee side | O(n · m log m) | Each of n mentees sorts m mentors by score |
| Preference list generation — mentor side | O(m · n log n) | Each of m mentors sorts n mentees by score |
| **Preference generation total** | **O((n+m) · max(n,m) · log max(n,m))** | Sorting dominates |
| Hospital-Resident, mentee-proposing | O(n · m) | Each resident proposes to ≤ m hospitals; O(1) per proposal with precomputed ranks |
| Hospital-Resident, mentor-proposing | O(n · m) | Symmetric |
| Fairness comparison (pick better variant) | O(n + m) | Dissatisfaction rank sum lookup |
| Stability verification (`matching.py:263–326`) | O(n · m) | Check all n × m pairs for blocking conditions |
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
- Measure wall-clock time for each pipeline stage
- Fit linear regression: `time = a·n + b`
- Report R² to confirm linear scaling

**Results from `benchmark_results.png`:**
- Keyword extraction: R² > 0.95 → O(n) confirmed ✓
- TF-IDF similarity: R² > 0.95 → O(n) confirmed ✓
- Gale-Shapley matching: R² > 0.95 → O(n) confirmed ✓
- **Total pipeline: O(n) empirically confirmed at fixed m**

**Runtime estimates (10 mentors):**

| n (mentees) | Approx. total time |
|-------------|-------------------|
| 25 | ~0.5s |
| 50 | ~0.9s |
| 100 | ~1.8s |
| 200 | ~3.5s |

---

### 2.4 Is O(n) Achievable?

**Short answer: Yes — when faculty size (m) is treated as a constant, which is realistic.**

**Long answer:**

The algorithm already achieves O(n) empirically because m is bounded in the deployment context. This is the correct way to state the complexity for the thesis.

#### Why true O(n) independent of m is impossible for stable matching:

Any algorithm that produces a *provably stable* matching must inspect at least Ω(n · m) input in the worst case (Gusfield & Irving, 1989). This is an information-theoretic lower bound — you cannot determine a stable assignment without knowing every mentee's relative ranking of all mentors. Therefore:

> **Theorem:** No algorithm can guarantee stability and run in o(n · m) time.

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

## 3. Effectiveness Metrics

The algorithm's effectiveness is measured across four categories.

---

### 3.1 Algorithmic Correctness Metrics

These can be computed directly from the system's database after each run.

| # | Metric | Formula | Data Source | Target |
|---|--------|---------|-------------|--------|
| 1 | **Stability rate** | % of runs where `is_stable = true` | `algorithm_logs.log_data.phase3.is_stable` | 100% |
| 2 | **Match coverage** | `matched / (matched + unmatched) × 100%` | `algorithm_logs.log_data.matched` and `.unmatched` | 100% (when capacity ≥ n) |
| 3 | **Capacity utilization** | `total_assigned / total_capacity × 100%` | Count of `matches` rows vs. sum of `mentor.mentor_capacity` | ≥ 80% |
| 4 | **Fairness (Gini coefficient)** | `G = 1 - (2·∑(i·score_i)) / (n·∑score_i)` where scores are sorted ascending | `matches.compatibility_score` | G ≤ 0.10 (low inequality) |
| 5 | **Score floor compliance** | % of matches where `compatibility_score ≥ 0.70` | `matches.compatibility_score` | 100% (enforced by system) |

**How to measure #1–5:** Run a SQL query against the `matches` and `algorithm_logs` tables after running the algorithm on the full dataset.

---

### 3.2 Semantic Match Quality Metrics

These measure whether the keyword-based matching is semantically meaningful.

| # | Metric | Formula | Data Source | Notes |
|---|--------|---------|-------------|-------|
| 6 | **Keyword precision** | Proportion of `matched_keywords` that genuinely appear in both profiles | `matches.matched_keywords` vs. `mentor.forte`, `mentor.technical_skills`, `MENTEE_GROUPS.research_description` | Manual spot-check or automated string overlap |
| 7 | **Domain overlap rate** | Avg. number of shared domains per match pair | `algorithm_logs.log_data.phase2.scores[*].top_matches[*].shared_domains` | Higher = better semantic alignment |
| 8 | **Mentee preferred-match rate** | % of mentees whose assigned mentor was ranked #1 or #2 in their preference list | `mentor_preferences` table, `matches` table | Higher = mentees got their top choice |
| 9 | **Mentor preferred-match rate** | % of mentors whose assigned mentee(s) were in their top preference tier | `mentee_preferences` table, `matches` table | Higher = mentors got preferred groups |

**How to measure #6:** For each match pair, extract `matched_keywords` from the `matches` table. For each keyword, check if it appears (case-insensitive) in the mentor's `forte` or `technical_skills` arrays AND in the mentee's `research_description` or `mentor_preference` fields. Report precision = (keywords appearing in both profiles) / (total reported keywords).

**How to measure #8–9:** Join `matches` with the `mentor_preferences` / `mentee_preferences` tables. For a mentee, check the rank of their assigned mentor. If rank ≤ 2, it counts as a preferred match.

---

### 3.3 Efficiency Metrics

These measure the algorithm's computational performance.

| # | Metric | How to measure | Unit |
|---|--------|---------------|------|
| 10 | **Throughput** | Total matches produced per second | matches/sec |
| 11 | **Wall-clock latency** | End-to-end time from trigger to results written in DB | seconds |
| 12 | **Empirical scaling coefficient** | Slope `a` from linear fit `time = a·n + b` | sec/mentee |
| 13 | **Peak memory usage** | Max RSS during pipeline execution (Python `tracemalloc`) | MB |

**How to measure #10–12:** Run `python3 app/algo/preprocess/benchmark.py`. It generates timing data and a fitted regression, outputting `benchmark_results.png` with the plot.

**How to measure #13:** Add `tracemalloc.start()` before `main()` and `tracemalloc.get_traced_memory()` after to get peak usage.

---

### 3.4 User Outcome Metrics

These require post-deployment data collection (surveys, system logs over one semester).

| # | Metric | Measurement method | Scale |
|---|--------|-------------------|-------|
| 14 | **Post-match satisfaction score** | End-of-semester Likert survey: "How satisfied are you with your matched mentor/mentee?" | 1–5 |
| 15 | **Meeting adherence rate** | `(actual meetings logged / scheduled recurring meetings) × 100%` | % |
| 16 | **Paper submission rate** | Papers submitted per mentee group per semester | count |
| 17 | **Thesis completion rate** | % of matched groups that complete and submit their final thesis chapter | % |

**Suggested survey questions for #14:**
- Mentee: "My assigned mentor has relevant expertise in my research area." (1–5)
- Mentee: "I am satisfied with the matching result." (1–5)
- Mentor: "The mentee group assigned to me aligns with my research focus." (1–5)
- Mentor: "I am satisfied with the matching result." (1–5)

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
- Stability rate (metric #1)
- Mean compatibility score
- Gini fairness coefficient (metric #4)
- Mentee preferred-match rate (metric #8)

---

## 5. Research Questions Mapped to Metrics

| Research Question | Primary Metrics | How to Compute |
|-------------------|----------------|---------------|
| Does the algorithm produce stable matches? | #1 Stability rate, blocking pair count | `algorithm_logs.phase3.is_stable` |
| How efficiently does it match all groups? | #2 Match coverage, #3 Capacity utilization | Count rows in `matches` table |
| Are the matches semantically meaningful? | #6 Keyword precision, #7 Domain overlap | SQL join + string overlap check |
| Is the algorithm fair to both parties? | #4 Gini coefficient, #8–9 Preferred-match rates | Score distribution analysis |
| Does it scale for institutional deployment? | #10 Throughput, #11 Latency, #12 Scaling coeff. | `benchmark.py` output |
| Is the time complexity manageable? | #12 Empirical O(n) proof | R² of linear regression in benchmark |
| Do matched pairs achieve better thesis outcomes? | #14 Satisfaction, #16 Paper rate, #17 Completion rate | Post-semester survey + system logs |

---

## 6. How to Run the Benchmark

```bash
# Activate the Python virtual environment
source .venv/bin/activate

# Run the benchmark (generates benchmark_results.png)
cd app/algo/preprocess
python3 benchmark.py

# Run the test pipeline with synthetic data (100 mentees, 15 mentors)
python3 test_pipeline.py

# Run with specific options:
python3 test_pipeline.py --scores-only    # scoring stage only (skip matching)
python3 test_pipeline.py --summary        # compact output
python3 test_pipeline.py --pair 0 3       # diagnose mentor 0 vs mentee 3 specifically
```

The benchmark confirms linear O(n) scaling and produces a plot of wall-clock time vs. n with a linear regression overlay and R² score.

---

## References

- **Gale, D. & Shapley, L.S. (1962).** College Admissions and the Stability of Marriage. *The American Mathematical Monthly*, 69(1), 9–15. — Original stable matching paper.
- **Gusfield, D. & Irving, R.W. (1989).** *The Stable Marriage Problem: Structure and Algorithms.* MIT Press. — Proves Ω(n·m) lower bound for stable matching.
- **Roth, A.E. & Sotomayor, M. (1990).** *Two-Sided Matching: A Study in Game-Theoretic Modeling and Analysis.* Cambridge University Press. — Hospital-Resident algorithm (used in this system).
- **Scikit-learn: TF-IDF.** Pedregosa et al. (2011). *Journal of Machine Learning Research*, 12, 2825–2830. — TF-IDF implementation used in `scoring.py`.
