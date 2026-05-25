# Mentor-Mentee Matching Algorithm — Flowchart

## Overview

The matching pipeline runs as a Python subprocess triggered by the admin dashboard. It performs keyword extraction, multi-pillar compatibility scoring, and a fair Hospital-Resident (Gale-Shapley) stable matching. Results are written back to Supabase.

---

## Full Pipeline Flowchart

```mermaid
flowchart TD
    A([Admin clicks\nRun Matching]) --> B[POST /api/run-matching\nNext.js API Route]
    B --> C[Express Backend\nport 8000]
    C -->|already running?| D{{409 — Already\nin progress}}
    C --> E[Spawn Python subprocess\nmain.py]

    %% ── PHASE 1: DATA ──────────────────────────────────────
    E --> F1

    subgraph PHASE1 ["Phase 1 · Data Collection & Preprocessing"]
        F1[Connect to Supabase\nvia service role key]
        F1 --> F2[Fetch all mentor profiles\nfrom mentor table]
        F1 --> F3[Fetch all mentee groups\nfrom MENTEE_GROUPS table]
        F2 & F3 --> F4[Normalize array fields\nJSON strings → Python lists]
        F4 --> F5{Any mentors\nor mentees missing?}
        F5 -->|Yes| F6([Exit — insufficient data])
        F5 -->|No| F7

        subgraph KEYWORD ["Keyword Extraction — per profile"]
            F7[Phase 1: Vocabulary scan\nMatch CS_TECH_VOCAB longest-first\ne.g. support vector machine before vector]
            F7 --> F8[Phase 2: TF-IDF residuals\nFill remaining slots from TF-IDF\nfiltered by ACADEMIC_STOP_WORDS]
            F8 --> F9[Pre-normalization\nc++ → cpp  node.js → nodejs\nscikit-learn → scikit learn  etc.]
        end
    end

    %% ── PHASE 2: SCORING ───────────────────────────────────
    F9 --> S1

    subgraph PHASE2 ["Phase 2 · Compatibility Scoring  —  5 Pillars"]
        S1[Build TF-IDF vectors\nfor all mentor & mentee texts]
        S1 --> S2[Cosine similarity\non keyword vectors]
        S2 --> S3[Domain expansion\nexpand_pair — broaden keyword overlap\nacross related CS subfields]
        S3 --> S4[Availability score\nOverlapping days × time slots]
        S3 --> S5[Experience score\nprev_mentored_thesis + certifications\n+ published_papers]
        S3 --> S6[Communication score\nInfer ONLINE / FACE_TO_FACE / FLEXIBLE\nfrom available_days]
        S3 --> S7[Meeting frequency score\nNo. overlapping days ÷ 3]
        S4 & S5 & S6 & S7 --> S8

        subgraph WEIGHTS ["Weighted Final Score"]
            S8["final = keyword×0.75\n+ experience×0.10\n+ availability×0.10\n+ communication×0.025\n+ meeting_freq×0.025"]
        end

        S8 --> S9[Score matrix\nmentees × mentors\nall pairwise scores]
    end

    %% ── PHASE 3: MATCHING ──────────────────────────────────
    S9 --> P1

    subgraph PHASE3 ["Phase 3 · Preference Lists + Hospital-Resident Matching"]
        P1[Generate preference lists\nEach mentee ranks all mentors by score\nEach mentor ranks all mentees by score]

        P1 --> HR1
        P1 --> HR2

        subgraph HR_MO ["HR — Mentee-Optimal  mentee-proposing"]
            HR1[Mentees propose to\ntheir top-ranked mentor]
            HR1 --> HR1b{Mentor has\nfree slot?}
            HR1b -->|Yes| HR1c[Tentatively accept]
            HR1b -->|No| HR1d{Is proposing mentee\nbetter ranked than\nworst current match?}
            HR1d -->|Yes| HR1e[Replace worst match\nRejected mentee re-proposes]
            HR1d -->|No| HR1f[Reject — mentee\nproposes next on list]
            HR1c & HR1e & HR1f --> HR1g{All mentees\nmatched or\nexhausted?}
            HR1g -->|No| HR1[loop]
            HR1g -->|Yes| HR1h[Mentee-optimal\nassignment A₁]
        end

        subgraph HR_MEO ["HR — Mentor-Optimal  mentor-proposing"]
            HR2[Mentors propose one slot\nat a time to top-ranked mentee]
            HR2 --> HR2b{Mentee holds\nan offer?}
            HR2b -->|No| HR2c[Mentee holds\nthis offer]
            HR2b -->|Yes| HR2d{Does mentee prefer\nnew mentor over\ncurrent held offer?}
            HR2d -->|Yes| HR2e[Switch to new offer\nRejected mentor re-proposes]
            HR2d -->|No| HR2f[Reject — mentor\nproposes next on list]
            HR2c & HR2e & HR2f --> HR2g{All mentor slots\nfilled or lists\nexhausted?}
            HR2g -->|No| HR2[loop]
            HR2g -->|Yes| HR2h[Mentor-optimal\nassignment A₂]
        end

        HR1h & HR2h --> FAIR

        subgraph FAIR ["Fairness Comparison"]
            FAIR1[Compute dissatisfaction\nfor A₁ — avg rank of matched partner\nfor both sides]
            FAIR2[Compute dissatisfaction\nfor A₂ — avg rank of matched partner\nfor both sides]
            FAIR1 & FAIR2 --> FAIR3{Which has lower\ncombined dissatisfaction\nmentee + mentor?}
            FAIR3 -->|A₁ lower or equal| FAIR4[Select mentee-optimal\nassignment]
            FAIR3 -->|A₂ lower| FAIR5[Select mentor-optimal\nassignment]
        end

        FAIR4 & FAIR5 --> STAB

        subgraph STAB ["Stability Verification"]
            STAB1[Check all mentee-mentor pairs\nnot in assignment]
            STAB1 --> STAB2{Does any pair\nboth prefer each other\nover current matches?}
            STAB2 -->|Yes — blocking pair| STAB3[Flag as UNSTABLE\nlog warning]
            STAB2 -->|No blocking pairs| STAB4[Confirm STABLE]
        end
    end

    %% ── PHASE 4: SAVE ──────────────────────────────────────
    STAB3 & STAB4 --> OUT1

    subgraph PHASE4 ["Phase 4 · Output & Persistence"]
        OUT1[Build match records\nmentee_group_id, mentor_id\ncompatibility_score, matched_keywords\nstatus, algorithm, is_stable]
        OUT1 --> OUT2[Clear existing matches\nfrom matches table]
        OUT2 --> OUT3[Insert new match records]
        OUT3 --> OUT4[Upsert preference lists\nto mentee_preferences\nand mentor_preferences tables]
        OUT4 --> OUT5[Insert structured JSON log\nto algorithm_logs table]
        OUT5 --> OUT6[Print JSON between\n__MATCHING_LOG_START__\n__MATCHING_LOG_END__ markers]
    end

    OUT6 --> RESULT[Express reads stdout\nParses JSON log]
    RESULT --> NEXT[Next.js API returns\nsummary to admin dashboard]
    NEXT --> DONE([Admin sees results:\nmatched count, algorithm\nstability, phase logs])
```

---

## Scoring Weights Reference

| Pillar | Weight | Signal |
|---|---|---|
| Keyword similarity | 75% | TF-IDF cosine similarity on research text |
| Experience | 10% | Mentor's previous theses, certifications, papers |
| Availability | 10% | Overlapping available days and time slots |
| Communication preference | 2.5% | ONLINE / FACE_TO_FACE / FLEXIBLE alignment |
| Meeting frequency | 2.5% | Number of overlapping available days (max 3) |

---

## Communication Mode Inference

| Available Days | Inferred Mode |
|---|---|
| Tuesday, Friday only | ONLINE |
| Monday, Wednesday, Thursday, Saturday only | FACE_TO_FACE |
| Mix of both sets, or unrecognized | FLEXIBLE |

FLEXIBLE is compatible with both ONLINE and FACE_TO_FACE partners.

---

## HR Algorithm — Why Two Variants?

| Property | Mentee-Optimal (A₁) | Mentor-Optimal (A₂) |
|---|---|---|
| Who proposes | Mentees | Mentors |
| Favors | Mentees get their top choices | Mentors get their top choices |
| Both are | Stable — no blocking pairs | Stable — no blocking pairs |

The **fair-matching** mode runs both, then picks the one with lower **combined dissatisfaction** (sum of average rank for both sides). This prevents systematically favoring one side.

---

## Keyword Scoring — Semantic Method (Default)

The default `"semantic"` method replaces exact keyword intersection with pairwise cosine similarity between individual keyword vectors.

**How it works — per pair:**

1. Extract CS vocab keywords from both profiles using `_extract_vocab_matches()` — a longest-first scan against a ~950-term CS technology vocabulary (`CS_TECH_VOCAB`).
2. Normalize abbreviations via `normalize_keyword()` (e.g. `"nlp"` → `"natural language processing"`, `"milp"` → `"mixed integer linear programming"`).
3. Fit a word-level TF-IDF vectorizer on the combined keyword list (mentor + mentee keywords together).
4. Compute an `n_mentee × n_mentor` cosine similarity matrix.
5. A mentee keyword is counted as **matched** if its best cosine similarity with any mentor keyword ≥ 0.45 (the `KW_SIMILARITY_THRESHOLD`).

**Tiered keyword score from matched count:**

| Matched keywords | Score |
|---|---|
| > 4 | 1.0 (ceiling) |
| > 2 | 0.7 (floor) |
| ≤ 2 | `(mentee_coverage + min_set_coverage) / 2` |

**Soft additive bonus** applied on top of the weighted score:

| Matched keywords | Bonus |
|---|---|
| ≥ 4 | +0.08 |
| ≥ 2 | +0.04 |
| ≥ 1 | +0.02 |

**Why pairwise instead of set intersection?**  
Set intersection requires an exact string match after normalization. Pairwise cosine catches semantic relatives — for example, `"machine learning"` and `"deep learning"` share the token `"learning"` and score ~0.45–0.55, clearing the threshold. Two profiles that share 2 highly related terms now score differently from two profiles that share 2 distantly related terms.

---

## Top-1 Boost

Before preference lists are built, a `+0.05` bonus is added to each mentee's single highest-scoring mentor, and each mentor's single highest-scoring mentee. This makes mutual top-1 pairs stickier in the HR algorithm without changing the stored compatibility scores (boosted scores are discarded after preference generation).

---

## Dissatisfaction Metric

After both HR variants run, the one with lower **combined dissatisfaction** is chosen.

```
dissatisfaction(side) = average rank of matched partner in that side's preference list
combined = mentee_dissatisfaction + mentor_dissatisfaction
```

Rank 0 means "got their top choice." Higher rank = worse outcome. Lower combined score = fairer result overall.

---

## Algorithmic Guarantees

| Property | Guarantee |
|---|---|
| **Stability** | No blocking pair exists in the output — no unmatched mentee-mentor pair where both would prefer each other over their current assignment |
| **Mentee-optimality** | The mentee-proposing HR produces the best stable matching possible for mentees — no other stable matching exists where every mentee is at least as well-off |
| **Mentor-optimality** | The mentor-proposing HR produces the best stable matching possible for mentors — same guarantee from the other side |
| **Fairness** | Running both variants and selecting the lower combined dissatisfaction prevents systematically favoring one side |
| **Completeness** | Every mentee is matched — the safety net catches any mentee left unmatched after HR (e.g. due to insufficient total capacity) |

A **blocking pair** `(mentee m, mentor M)` exists if:
- `m` prefers `M` over their current assigned mentor, **and**
- `M` prefers `m` over their worst currently assigned mentee (or has an open slot)

The stability check runs in O(N×M) after matching completes and logs any violations.

---

## Match Effectiveness Metrics

The algorithm produces two categories of effectiveness evidence: **formal algorithmic guarantees** and **quantitative performance metrics** computed and stored for every run.

---

### Formal Guarantee — Stability

The most rigorous indicator of match effectiveness is **stability**. A matching is stable when no blocking pair exists — no mentor-mentee pair outside the assignment where *both* would prefer each other over their current assigned partner.

This is verified explicitly after every run by checking all unassigned pairs against the final preference lists. The result is stored as `is_stable` in the `matches` table and `blocking_pairs_count` in `algorithm_logs`. A stable matching guarantees there is no "obviously better" pairing the algorithm missed.

---

### Per-Run Quantitative Metrics

Every run computes and stores the following in `algorithm_logs`:

| Metric | What it measures | Good value |
|---|---|---|
| **Match rate** | Fraction of mentee groups successfully paired | 100% |
| **Unmatched count** | Mentees not paired by HR — handled by safety net | 0 |
| **Stability flag** | Whether any blocking pairs exist | `true` |
| **Blocking pair count** | Number of unstable pairs found | 0 |
| **Mentee dissatisfaction** | Average rank of assigned mentor in each mentee's preference list | As low as possible |
| **Mentor dissatisfaction** | Average rank of assigned mentees in each mentor's preference list | As low as possible |
| **Combined dissatisfaction** | Sum of both sides — the selection criterion between HR variants | Minimized |

**Dissatisfaction interpretation:**

| Combined dissatisfaction | What it means |
|---|---|
| < 1.0 | Both sides got, on average, a top-2 match |
| 1.0 – 3.0 | Both sides got, on average, a top-3 or top-4 match |
| > 5.0 | Some participants received lower-ranked matches — may indicate insufficient mentor diversity for the mentee pool |

A rank of **0** means a participant received their top choice. The algorithm selects whichever HR variant (mentee-proposing or mentor-proposing) yields the lower combined score, so neither side is systematically disadvantaged.

---

### Per-Pair Score Breakdown

Every match record stores a compatibility score (0–1) decomposed across five pillars:

| Pillar | Weight | Effectiveness signal |
|---|---|---|
| **Keyword similarity** | 75% | Degree of research topic alignment — the primary driver |
| **Experience** | 10% | Mentor's depth of prior mentoring (theses, papers, certifications) |
| **Availability** | 10% | Fraction of schedule that overlaps — determines whether meetings can happen |
| **Communication mode** | 2.5% | Whether both prefer online or face-to-face meetings |
| **Meeting frequency** | 2.5% | Number of shared available days as a proxy for how regularly they can meet |

**Compatibility score interpretation:**

| Score | Interpretation |
|---|---|
| ≥ 0.80 | Strong match — substantial keyword overlap with good schedule and experience fit |
| 0.60 – 0.79 | Good match — meaningful research alignment with reasonable availability |
| 0.40 – 0.59 | Moderate match — some keyword overlap, or strong non-keyword factors compensating |
| < 0.40 | Constrained match — limited research alignment; likely no higher-scoring option remained in the pool |

---

### Matched Keywords as Explainability Evidence

Each stored match record includes a list of **matched keywords** — the shared CS vocabulary terms between the mentor's profile and the mentee's research description. These are extracted from raw profile text against a ~950-term CS technology vocabulary, normalized for abbreviations and synonyms (e.g. `MILP` → `mixed integer linear programming`), and verified via pairwise cosine similarity ≥ 0.45.

The matched keyword list provides human-readable justification for each compatibility score, visible to admins in the algorithm log dashboard. A pair showing `machine learning, deep learning, neural network` as matched keywords is explainably well-matched; a pair showing zero matched keywords signals a mismatch the score alone cannot convey.

---

### Post-Assignment Effectiveness Signals

The algorithm measures *compatibility potential* from profile data at the time of matching. Ongoing relationship quality is tracked through the platform's activity modules:

| Signal | Source | What it indicates |
|---|---|---|
| **Milestone completion rate** | Milestone tracker | Whether research goals are being met on schedule |
| **Paper submission and review activity** | Paper review module | Whether the mentoring relationship is academically productive |
| **Meeting regularity** | Meeting scheduler | Whether scheduled meetings are being created and maintained |
| **Mentor announcement activity** | Mentor announcements | Whether mentors are actively communicating with their groups |

These signals are not fed back into the algorithm automatically, but they provide ground-truth data for evaluating whether high-scoring matches correlate with active, productive mentoring relationships.

---

## Time Complexity

Let:
- **N** = number of mentors
- **M** = number of mentees
- **K** = average number of CS vocab keywords extracted per profile (~15)
- **V** = CS_TECH_VOCAB size (~950 terms)
- **T** = average token count of a cleaned profile text (~200 tokens)

| Stage | Operation | Complexity |
|---|---|---|
| Keyword extraction | Vocab scan per profile (longest-first) | O((N+M) × V × T) |
| Semantic keyword scoring | Per-pair TF-IDF cosine on K-keyword lists | O(N × M × K²) |
| Availability scoring | Set intersection per pair | O(N × M × D) where D ≤ 7 days |
| Experience scoring | Per-mentor component average | O(N) |
| Communication + frequency | Per-pair day-set lookups | O(N × M) |
| Weighted combination | Numpy broadcast | O(N × M) |
| Soft keyword bonus | Numpy where on count matrix | O(N × M) |
| Preference generation | Sort per mentee + per mentor | O(N × M × log M + M × N × log N) = O(N × M × log(max(N,M))) |
| HR matching (each variant) | Proposals with O(1) rank lookup | O(N × M) worst case |
| Fairness comparison | Rank lookup over assignments | O(N + M) |
| Stability verification | All non-assigned pairs checked | O(N × M) |
| Safety net | Unmatched × mentors | O(U × N) where U = unmatched count (typically 0) |
| DB writes | Insert matches + preferences + log | O(N × M) |

**Overall dominant cost: O(N × M × K²)** — the semantic pairwise scoring step.

All other stages are O(N × M) or below, which is dominated by the keyword scoring cost.

**Space complexity: O(N × M)** — the score matrix and preference lists are the largest structures.

---

## Current Deployment Scale

| Parameter | Value |
|---|---|
| Mentors (N) | 8 |
| Mentees (M) | 21 |
| Pairs scored per run | 168 |
| Avg keywords per profile (K) | ~15 |
| Pairwise similarity computations | ~168 × 15² ≈ 37,800 |
| HR proposals (worst case) | 168 per variant × 2 variants |
| Typical full run duration | < 10 seconds |

The algorithm scales comfortably to hundreds of participants before the O(N × M × K²) cost becomes a bottleneck. At 50 mentors × 200 mentees × 15 keywords, the pair count is 10,000 and semantic scoring would produce ~2.25M cosine operations — still well within a single Python process in seconds.

---

## Data Structures Used in the System

The matching engine relies on four core data structures. Each was chosen because it is the most efficient tool for a specific job the algorithm needs to perform.

---

### Hash Map (Lookup Table)

A hash map stores information as a collection of paired entries — a unique identifier on one side and a value on the other. Looking up any entry by its identifier takes the same amount of time regardless of how many entries are stored.

**Where it is used in Fortis Nexus:**

During the matching process, the algorithm frequently needs to answer questions like "what is this mentor's ranking of that mentee?" and "how many groups has this mentor already been assigned?" Rather than scanning through a list every time, these answers are stored in hash maps before the matching loop begins, making every lookup instant.

Specific uses:

| What is stored | What it enables |
|---|---|
| Each mentor's ranking of every mentee (and vice versa) | Instant comparison during proposal decisions — "is this applicant better than the current worst match?" |
| Each mentor's current assignment count | Instant check of whether a mentor still has open capacity |
| Profile lookup by user ID | Instant retrieval of any mentor or mentee's full profile when building the results log |
| Score matrix row/column position by user ID | Instant navigation into the compatibility score grid |

**Why the panelists' recommendation is valid — and already applied:**

Without hash maps, every time the algorithm compares two candidates during a proposal, it would scan through the entire preference list to find their positions. With 21 mentees and 8 mentors, that inner scan runs hundreds of times per matching round. Hash maps eliminate this scan entirely, reducing that step from a search to a single direct lookup. This is the reason the algorithm completes in under 10 seconds regardless of how many proposals are made.

---

### Set (Unique Collection)

A set stores a collection of unique items with no duplicates and no ordering. Checking whether an item belongs to a set, and finding the common items between two sets, are both extremely fast operations.

**Where it is used in Fortis Nexus:**

Availability matching uses sets. Each mentor and each mentee records which days of the week they are free. To find the days both sides share, the system computes the intersection of their two sets — one operation that instantly returns only the overlapping days. The same applies to time slot overlap.

The technology vocabulary used for keyword extraction (`CS_TECH_VOCAB`, approximately 950 terms) is also stored as a set, so checking whether any given word is a recognized CS term is an instant yes/no operation rather than a search through a list.

---

### Queue (First-In First-Out List)

A queue is an ordered waiting line where items are added to the back and removed from the front, in the same order they arrived.

**Where it is used in Fortis Nexus:**

The Hospital-Resident matching algorithm uses a queue to manage which mentee groups still need to be matched. When a group is displaced by a higher-ranked applicant, it is placed back in the queue and will propose again on its next turn. This ensures every group gets a fair chance to find a match and that the algorithm terminates predictably once the queue is empty.

---

### Matrix (Two-Dimensional Grid)

A matrix is a rectangular grid of numbers organized in rows and columns. In this system, rows represent mentee groups and columns represent mentors, so every cell in the grid holds the compatibility score for one specific mentor-mentee pair.

**Where it is used in Fortis Nexus:**

After the five-pillar scoring is computed, all 168 compatibility scores (21 mentees × 8 mentors) are stored in a single matrix. This allows the system to apply the scoring weights, add the keyword bonus, and generate ranked preference lists for everyone in one efficient operation across the entire grid at once, rather than computing each pair individually in sequence.

---

### Summary Table

| Data Structure | Plain-language role | Where it appears |
|---|---|---|
| **Hash Map** | Instant lookup by ID — eliminates searching | Rank lookups during HR matching, profile lookups, assignment tracking |
| **Set** | Fast membership check and overlap detection | Available days matching, time slot overlap, CS vocabulary scan |
| **Queue** | Ordered waiting line for unmatched groups | HR algorithm's pending-proposals list |
| **Matrix** | Grid of all pairwise scores | Compatibility score storage, preference list generation |

Each structure was selected because the alternative — using a plain unsorted list — would require scanning from the beginning every time a value is needed, which compounds into a significant performance cost when the same operation is repeated hundreds of times per matching run.

---

## Key Files

| File | Role |
|---|---|
| `app/algo/preprocess/main.py` | Pipeline orchestrator — fetches, scores, matches, saves |
| `app/algo/preprocess/text_processing.py` | Keyword extraction — vocab scan + TF-IDF residuals |
| `app/algo/preprocess/domain_expander.py` | Domain expansion — broadens keyword overlap |
| `app/algo/preprocess/scoring.py` | 5-pillar weighted scoring + cosine similarity |
| `app/algo/preprocess/matching.py` | HR algorithm — both variants, fairness, stability check |
| `backend/MatchingService.js` | Express wrapper — spawns Python, parses stdout markers |
| `app/api/run-matching/route.ts` | Next.js API route — proxies to Express on port 8000 |
