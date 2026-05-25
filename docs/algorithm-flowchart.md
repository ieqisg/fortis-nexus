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
