# Fortis Nexus — System Context

This file is the living record of what Fortis Nexus is, what it does, and how it works. It must be kept up to date whenever a major change is made to the system (see `CLAUDE.md` for the update rule).

---

## Purpose

Fortis Nexus is a web platform built for a Computer Science department that automatically pairs faculty mentors with student research groups, then supports the ongoing mentoring relationship through scheduling, paper review, and milestone tracking.

---

## Users

| Role | Who they are | How they access the system |
|---|---|---|
| **Admin** | Program administrators | Created directly in the database; access the Admin Portal |
| **Mentor** | Faculty members | Accounts created by admins; complete a profile on first login |
| **Mentee** | Student research groups | Self-register; one account per group |

---

## What the System Does

### Matching
The core feature. An admin triggers a matching run that automatically assigns each mentee group to a mentor. Compatibility is scored across five factors:

| Factor | Weight | What it measures |
|---|---|---|
| Research topic overlap | 60% | Keyword similarity between mentor expertise and group research |
| Mentoring experience | 20% | Prior thesis projects guided, publications, certifications |
| Availability overlap | 10% | Shared days (60%) and time slots (40%) |
| Communication style | 5% | Shared preference for in-person, online chat, or video call |
| Meeting frequency | 5% | How often both sides can meet |

> **Note:** The weights shown above are the baseline reference values for documentation purposes. The actual weights used at runtime may be tuned in the codebase (`scoring.py`). **Do not update the weights in this table** — it serves as a stable reference for stakeholders and panelists, not a live reflection of runtime configuration.

A soft additive keyword bonus is applied on top of the weighted score: +0.08 for ≥4 shared keywords, +0.04 for ≥2, +0.02 for ≥1. An additional +0.05 top-1 boost is applied to each person's single best match before preference list generation (not stored in the database).

Both sides of the Gale-Shapley stable matching algorithm are run (mentor-proposing and mentee-proposing). The result with lower combined dissatisfaction is selected. Stability is verified by checking for blocking pairs. Any unmatched mentee after the main algorithm is assigned by a safety net to the mentor with the most remaining capacity. Mentors with `mentor_capacity = 0` are excluded from the safety net.

### Profile Management
- Mentors fill in expertise, research background, availability, communication preference, and prior mentored theses.
- Mentee groups fill in their research title, description, team members, availability, and communication preference.
- Admins can view, edit, create, or delete any profile.

### Paper Review
Mentee groups submit one research paper at a time (PDF, max 5 MB). Their mentor downloads the paper, leaves written feedback, and marks it as reviewed. The submission slot reopens only after a review is posted.

### Meeting Scheduling
Mentors set recurring meeting schedules for each assigned group. Both sides can view upcoming sessions. Mentors can add notes after each session.

### Milestone Tracking
Mentors create goals (milestones) for each group — with a title, description, and due date. Mentors mark milestones as complete. Mentees see a read-only checklist showing done, overdue, and upcoming milestones.

### Announcements
- **Admin announcements** — broadcast to all users, only mentors, or only mentees.
- **Mentor announcements** — posted by a mentor and visible only to their assigned groups.

---

## System Layers

| Layer | What it is | Examples |
|---|---|---|
| **Presentation** | The website portals users interact with | Admin Portal, Mentor Portal, Mentee Portal, Login & Registration |
| **Application** | Business logic and data processing | Access Control, Profile Management, Matching Engine, Paper Review, Meeting Scheduler, Milestone Tracker, Announcements |
| **Data** | Persistent storage | User accounts, profiles, matches, meetings, papers, milestones, announcements, uploaded files |

---

## Key Files and Directories

| Path | What it is |
|---|---|
| `/app` | Next.js frontend (App Router) |
| `/app/context/` | React context providers for auth, mentor, and mentee state |
| `/app/algo/preprocess/` | Python matching engine (5-stage pipeline) |
| `/backend/` | Express server that spawns the Python process |
| `/lib/actions/` | Server actions — sole interface between Next.js and the database |
| `/lib/rateLimit.ts` | In-memory rate limiting (login: 5/5 min, password reset: 3/hr) |
| `/components/ui/` | Shared UI components wrapping Radix UI primitives |
| `/tests/unit/` | Unit tests (Vitest + React Testing Library) |
| `proxy.ts` | Middleware handling auth checks and role-based routing |
| `/docs/architecture.md` | Plain-language system architecture document |
| `/docs/system-diagrams.md` | Sequence, use-case, and class diagrams |

---

## Database Tables

| Table | What it stores |
|---|---|
| `mentor` | Mentor profiles; `profile_completed` flag gates the onboarding redirect |
| `MENTEE_GROUPS` | Mentee group profiles |
| `matches` | Pairing results: `mentor_id`, `mentee_group_id`, `compatibility_score`, `matched_keywords`, `algorithm`, `is_stable` |
| `meetings` | Recurring meeting schedules and session notes |
| `papers` | Paper submissions with status (`pending` / `reviewed`) |
| `paper_comments` | Mentor feedback on submitted papers |
| `milestones` | Goals assigned to mentee groups with completion tracking |
| `announcements` | Admin-created announcements with audience targeting |
| `mentor_announcements` | Mentor-to-group announcements |
| `mentor_preferences` | Ranked mentor preference lists produced by the matching engine |
| `mentee_preferences` | Ranked mentee preference lists produced by the matching engine |
| `algorithm_logs` | Outcome records from each matching run |

---

## Matching Engine Pipeline

Located at `/app/algo/preprocess/`. Triggered by admin via `POST /api/run-matching` → Express backend → Python subprocess.

| Stage | File | What it does |
|---|---|---|
| 1 | `text_processing.py` | Extracts and normalizes keywords from profiles |
| 2 | `domain_expander.py` | Expands research domains to related terms |
| 3 | `scoring.py` | Computes weighted compatibility scores using TF-IDF cosine similarity |
| 4 | `matching.py` | Runs Gale-Shapley stable matching (both directions) |
| 5 | `main.py` | Orchestrates the pipeline; reads from and writes to the database |

Completion is signaled by `__MATCHING_LOG_START__` / `__MATCHING_LOG_END__` markers in stdout.

---

## Auth and Access Control

- Authentication is handled by Supabase Auth (email + password).
- Sessions are stored in cookies using `@supabase/ssr`.
- User role is determined by which table the auth ID appears in (`mentor`, `MENTEE_GROUPS`, or `admin`).
- Role + `profile_completed` are cached in a signed cookie (`x-role-cache`) with a 5-minute TTL to avoid a database round-trip on every page load.
- Middleware (`proxy.ts`) enforces all routing rules:
  - Unauthenticated → `/` (login)
  - Mentor with incomplete profile → `/mentor/complete-profile`
  - Mentor complete → `/mentor/mentor-dashboard`
  - Mentee → `/mentee/mentee-dashboard`
  - Admin → `/admin`

---

## Change Log

Track significant system changes here. Add a new entry whenever `CLAUDE.md` instructs an update to this file.

| Date | Change | Affected area |
|---|---|---|
| 2026-05-24 | Initial context file created | — |
| 2026-05-24 | Matching engine improvements — plural abbreviation prenorms (CNNs/LLMs/etc.), depluralize guard against word mangling, synonym normalization (ml↔machine learning, dl↔deep learning, etc.), corpus-level TF-IDF priming, matched_vocab denominator changed to mentee-size, hard keyword floor replaced with soft additive bonus (+0.04/+0.08), communication inference from days removed (defaults to FLEXIBLE), experience years field added to experience score, mentor_preference excluded from matched-keyword computation | Matching Engine (`text_processing.py`, `scoring.py`, `main.py`) |
| 2026-05-24 | Communication preference auto-inferred from selected days (Tuesday/Friday → ONLINE_MEETING, Mon/Wed/Thu/Sat → FACE_TO_FACE); ONLINE_CHAT removed; all manual communication preference inputs removed from mentor, mentee, and admin forms; legacy DB values normalized at display and scoring time | Forms (`compelete-profile.tsx`, `mentee-create-profile.tsx`, `edit-profile.tsx`, `admin.tsx`), Server Actions, Types, Python Scoring |
| 2026-05-25 | Scoring weights updated — keyword similarity raised from 60% to 75%; experience lowered from 20% to 10%; communication and meeting frequency each halved from 5% to 2.5%; soft keyword bonus tiers added (+0.08/+0.04/+0.02 for ≥4/≥2/≥1 shared keywords) | Matching Engine (`scoring.py`) |
| 2026-05-25 | Vocabulary expanded with 29 modern AI/ML terms (embedding, foundation model, genai, multimodal, LoRA, RLHF, DPO, PEFT, etc.); 11 new synonym mappings added; 9 new prenorm rules for hyphenated compound forms (multi-modal, fine-tune, pre-train, ViTs, VLMs, LoRAs) | Matching Engine (`text_processing.py`) |
| 2026-05-25 | DB check constraint on `MENTEE_GROUPS.communication_preference` and `mentor.communication_preference` updated — old values (FLEXIBLE, ONLINE_CHAT, ONLINE_CALL) removed; only FACE_TO_FACE and ONLINE_MEETING are now valid; empty-array truthiness bug fixed in admin server actions that caused null to be written when days field was cleared | Server Actions (`adminActions.ts`), Database |
| 2026-05-25 | Mentor capacity enforcement hardened — `clear_matches()` now raises on Supabase error instead of silently continuing (prevents stale match stacking); admin capacity display now filters by `status = "active"` to exclude stale rows; safety net respects `mentor_capacity = 0` by using a None-check instead of the `or 1` pattern | Matching Engine (`main.py`, `matching.py`), Admin Portal (`admin.tsx`) |
| 2026-05-25 | Algorithm log final matches list now sorted by compatibility score descending | Matching Engine (`main.py`) |
| 2026-05-25 | Explicit stopword removal added to `clean_text()` — sklearn's `ENGLISH_STOP_WORDS` (~318 common English function words) are now stripped from all profile text before any downstream processing (vocab scan, corpus fitting, TF-IDF cosine similarity vectors). `ACADEMIC_STOP_WORDS` intentionally excluded from this step to preserve CS bigrams like "language model" and "foundation model". | Matching Engine (`text_processing.py`) |
| 2026-05-25 | Keyword similarity formula updated — `_kw_sim_from_sets()` now averages mentee-coverage and min-set-coverage instead of using mentee size alone as denominator; eliminates undervaluation of specialist mentors matched to broad-topic mentees. Availability day score changed from Jaccard (union denominator) to smaller-set coverage so overlapping days are rewarded proportionally without penalising either side for listing more days. | Matching Engine (`scoring.py`) |
| 2026-05-25 | Keyword scoring replaced with semantic pairwise cosine similarity — new `"semantic"` method (now default) extracts keyword lists from each profile, computes TF-IDF cosine similarity for every mentor-keyword ↔ mentee-keyword pair, and counts pairs exceeding a configurable threshold (`KW_SIMILARITY_THRESHOLD = 0.45`) as "matched". Score uses the same mentee-coverage + min-set-coverage blend. Fixes cases where 2 matched keywords out of 2 total incorrectly scored as high as 10 matched keywords out of 10. `get_matched_keywords()` extended to include semantic near-matches for display consistency. | Matching Engine (`scoring.py`) |
| 2026-05-25 | Tiered keyword score floor added — matched_count > 4 → keyword_score = 1.0; matched_count > 2 → keyword_score = 0.7; otherwise uses coverage ratio. Threshold (0.45) still controls what counts as a match. | Matching Engine (`scoring.py`) |
| 2026-05-25 | Keyword extraction paths unified — semantic scoring now uses `_extract_vocab_matches()` (same clean CS vocab terms as the display layer) instead of the noisy raw-skill strings from `_extract_mentor_kw_list()`. Eliminates mismatch between displayed matched-keyword count and the count used in scoring. | Matching Engine (`scoring.py`) |
| 2026-05-25 | Vocabulary expanded with operations research / optimization terms (milp, mixed integer linear programming, integer programming, linear programming, convex optimization, combinatorial optimization, constraint programming, operations research, etc.); software testing terms (mutation testing, mutation operator, test case generation, fault injection, fuzz testing); code analysis terms (code clone detection, clone detection, abstract syntax tree, source code analysis); stable matching terms (stable matching, gale shapley, hospital resident, bipartite matching); synonym mappings added for milp, ilp, lp, qp; prenorm rule added for "Mixed-Integer" → "mixed integer" | Matching Engine (`text_processing.py`) |
| 2026-05-25 | Algorithm documentation expanded — `docs/algorithm-flowchart.md` now includes: semantic keyword scoring method detail (pairwise TF-IDF cosine, threshold, tiered score floor, soft bonus), top-1 boost explanation, dissatisfaction metric formula, algorithmic guarantees table (stability, mentee/mentor optimality, fairness, completeness), full per-stage time complexity table with notation, space complexity, and current deployment scale figures | Documentation (`docs/algorithm-flowchart.md`) |
| 2026-05-25 | Match effectiveness metrics section added to `docs/algorithm-flowchart.md` — covers formal stability guarantee and blocking pair verification, per-run quantitative metrics (match rate, unmatched count, stability flag, dissatisfaction scores), per-pair score breakdown with interpretation benchmarks, matched keywords as explainability evidence, and post-assignment effectiveness signals (milestones, paper review, meetings) | Documentation (`docs/algorithm-flowchart.md`) |
| 2026-05-25 | Data structures section added to `docs/algorithm-flowchart.md` — documents the four core data structures used in the matching engine (hash map, set, queue, matrix) in plain language with no technical jargon, explaining where each is used and why it was chosen over a plain list | Documentation (`docs/algorithm-flowchart.md`) |
| 2026-05-26 | Keyword scoring changed from hybrid coverage-ratio+tier to pure count-based tiers — eliminates sparse-profile score inflation where a mentee with only 2 vocab terms in their research description scored 95% because 2/2 coverage = 100%; tiers: 1→0.35, 2→0.60, 3→0.85, ≥4→1.00; score now depends only on matched count, not profile density | Matching Engine (`scoring.py`) |
| 2026-05-26 | `_kw_similarity_semantic()` rewritten to guarantee exact vocab intersections are always counted — two-step approach: Step 1 counts normalized exact matches directly (no TF-IDF needed); Step 2 runs semantic near-matching only on remaining unmatched mentee keywords; eliminates TF-IDF corpus artifacts that could miss obvious exact matches, ensuring score reflects what the matched keywords display shows | Matching Engine (`scoring.py`) |
| 2026-05-26 | FLEXIBLE communication preference re-introduced — inferred when selected days include both face-to-face days (Mon/Wed/Thu/Sat) AND online days (Tue/Fri); only online days → ONLINE_MEETING; only face-to-face days → FACE_TO_FACE; DB check constraint updated on both `mentor` and `MENTEE_GROUPS` tables | Server Actions (`mentorActions.ts`, `menteeActions.ts`, `adminActions.ts`), Database |
| 2026-05-29 | Mock data demo mode added — four new tables (`mock_mentor`, `mock_mentee_groups`, `mock_matches`, `mock_algorithm_logs`) seeded with 6 mentors and 20 synthetic mentees; Python pipeline reads from and writes to mock tables when `--source mock`; admin dashboard data source toggle now also controls which dataset is displayed; new server actions: `getMockUserData`, `getLatestMockAlgorithmLog`, `rollbackMockMatches` | Database (migration), Matching Engine (`main.py`), Server Actions (`adminActions.ts`), Admin Portal (`admin.tsx`) |
