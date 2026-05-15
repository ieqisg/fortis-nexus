# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (both servers must run simultaneously)
npm run dev          # Next.js frontend on port 3000
npm run backend      # Express backend on port 8000 (required for matching algorithm)

# Build & production
npm run build
npm run start

# Linting & testing
npm run lint
npm test             # Run tests once (vitest)
npm run test:watch   # Watch mode
```

To run a single test file:
```bash
npx vitest run tests/unit/profile_validators.test.ts
```

## Architecture

This is a three-process application:

1. **Next.js frontend** (`/app`) — App Router, React 19, Tailwind CSS, Radix UI
2. **Express backend** (`/backend`) — Thin server on port 8000 that spawns the Python process
3. **Python matching engine** (`/app/algo/preprocess`) — Reads from Supabase, runs Gale-Shapley hospital-resident algorithm with TF-IDF cosine similarity scoring, writes results back to Supabase

The Next.js API route `/api/run-matching` proxies to the Express backend, which runs `python3 app/algo/preprocess/main.py` as a subprocess. The Python script signals completion with `__MATCHING_LOG_START__`/`__MATCHING_LOG_END__` markers in stdout.

## Sequence Diagrams

### 1. Auth & Role-Based Routing

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant Middleware as proxy.ts (Middleware)
    participant AuthCtx as AuthContext
    participant Action as lib/actions/authActions.ts
    participant Supabase

    User->>Browser: Enter email + password
    Browser->>AuthCtx: signIn(email, password)
    AuthCtx->>Supabase: signInWithPassword()
    Supabase-->>AuthCtx: JWT + session cookie

    Browser->>Middleware: Next request (any protected route)
    Middleware->>Middleware: Check x-role-cache cookie (HMAC + expiry)
    alt Cache miss or expired
        Middleware->>Action: getUserRole(userId)
        Action->>Supabase: SELECT from mentor / MENTEE_GROUPS / admin
        Supabase-->>Action: role + profile_completed
        Action-->>Middleware: { role, profileCompleted }
        Middleware->>Middleware: Set signed x-role-cache cookie (5 min TTL)
    end

    alt role = mentee
        Middleware-->>Browser: Redirect → /mentee/mentee-dashboard
    else role = mentor, profileCompleted = false
        Middleware-->>Browser: Redirect → /mentor/complete-profile
    else role = mentor, profileCompleted = true
        Middleware-->>Browser: Redirect → /mentor/mentor-dashboard
    else role = admin
        Middleware-->>Browser: Redirect → /admin
    else unauthenticated
        Middleware-->>Browser: Redirect → / (login)
    end
```

### 2. Mentor Onboarding

```mermaid
sequenceDiagram
    actor Admin
    actor Mentor
    participant Browser
    participant Action as lib/actions/mentorActions.ts
    participant Supabase
    participant Middleware as proxy.ts

    Admin->>Action: registerMentor(email, password)
    Action->>Supabase: auth.admin.createUser()
    Action->>Supabase: mentor.insert({ profile_completed: false })

    Mentor->>Browser: Log in
    Browser->>Middleware: Request /mentor/*
    Middleware->>Supabase: getUserRole() → profile_completed = false
    Middleware-->>Browser: Redirect → /mentor/complete-profile

    Mentor->>Browser: Fill out profile form
    Browser->>Action: createMentorProfile(payload)
    Action->>Supabase: mentor.update(payload, { profile_completed: true })
    Action->>Action: Delete x-role-cache cookie
    Action-->>Browser: { success: true }

    Browser->>Browser: signOut() → router.push("/")
    Mentor->>Browser: Log in again
    Browser->>Middleware: Request /mentor/*
    Middleware->>Supabase: getUserRole() → profile_completed = true
    Middleware-->>Browser: Redirect → /mentor/mentor-dashboard
```

### 3. Matching Pipeline

```mermaid
sequenceDiagram
    actor Admin
    participant Browser
    participant NextAPI as app/api/run-matching/route.ts
    participant Express as Express (port 8000)
    participant Service as matchingService.js
    participant Python as app/algo/preprocess/main.py
    participant Supabase

    Admin->>Browser: Click "Run Matching"
    Browser->>NextAPI: POST /api/run-matching
    NextAPI->>Express: POST BACKEND_URL/api/matching/run

    Express->>Service: runMatchingScript(mode)
    alt Already running
        Service-->>Express: 409 { error: "Already running" }
    end
    Service->>Service: Set isRunning = true
    Service->>Python: spawn python3 main.py

    Python->>Supabase: mentor.select("*")
    Python->>Supabase: MENTEE_GROUPS.select("*")
    Supabase-->>Python: mentors[], menteeGroups[]

    Python->>Python: text_processing.py — keyword extraction
    Python->>Python: domain_expander.py — domain expansion
    Python->>Python: scoring.py — weighted TF-IDF compatibility scores
    Python->>Python: matching.py — Gale-Shapley stable matching

    Python->>Supabase: matches.upsert(results)
    Python->>Python: Print JSON between __MATCHING_LOG_START__ / __MATCHING_LOG_END__
    Python-->>Service: stdout (log JSON + matched/unmatched counts)

    Service->>Service: Parse log markers, set isRunning = false
    Service-->>Express: { success, log }
    Express-->>NextAPI: { success, message, log }
    NextAPI-->>Browser: { success, log }
    Browser->>Browser: Display match summary
```

### 4. Server Actions Pattern (Client → Supabase)

```mermaid
sequenceDiagram
    participant ClientComp as Client Component
    participant Action as lib/actions/*.ts (Server Action)
    participant SupabaseSSR as @supabase/ssr
    participant Supabase
    participant Context as React Context

    ClientComp->>Action: await someAction(payload)
    Action->>SupabaseSSR: createServerClient() reads JWT from cookie
    SupabaseSSR-->>Action: authenticated Supabase client
    Action->>Supabase: .from("table").select/update/insert
    Supabase-->>Action: { data, error }
    Action-->>ClientComp: { success, data?, message? }

    alt Context-managed data
        ClientComp->>Context: trigger refetch()
        Context->>Action: getMentorData() / getMenteeData()
        Action->>Supabase: select with joins (e.g., mentor + matches)
        Supabase-->>Action: full profile data
        Action-->>Context: updated state
        Context-->>ClientComp: re-render with fresh data
    end
```

## Data Layer

**Database:** Supabase (PostgreSQL). All DB access from Next.js is through server actions in `/lib/actions/`. There should be **no direct Supabase client calls from client components** — only from server actions and the Python script.

Key tables:
- `mentor` — mentor profiles (`profile_completed` flag gates onboarding redirect)
- `MENTEE_GROUPS` — mentee group profiles
- `matches` — results from the matching algorithm (`mentor_id`, `mentee_group_id`, `compatibility_score`, `matched_keywords`)
- `meetings` — recurring meeting schedules

**Local Supabase stack** is configured in `supabase/config.toml` (ports 54321–54323). Run via Supabase CLI if needed.

## Auth & Routing

Supabase Auth with JWTs stored in cookies via `@supabase/ssr`. The middleware (`proxy.ts`) enforces:
- Unauthenticated users → `/` (login)
- Role-based routing: `/mentee/*`, `/mentor/*`, `/admin/*`
- Mentors with `profile_completed=false` → `/mentor/complete-profile`

User role is determined by which table the user's auth ID appears in (`mentor`, `MENTEE_GROUPS`, or `admin`). To avoid a DB round-trip on every request, the resolved role + `profile_completed` are stored in a signed `x-role-cache` cookie with a 5-minute TTL. Creating a mentor profile deletes this cookie so the next request re-fetches.

## Code Conventions

- **Path alias:** `@/` maps to the repo root
- **Server actions** live in `/lib/actions/` and are the sole interface to Supabase from the Next.js layer
- **React Context** (`/app/context/`) manages auth, mentor, and mentee state — no Redux/Zustand
- **Rate limiting** (`/lib/rateLimit.ts`) is in-memory and resets on server restart; applies to login (5/5 min) and password reset (3/hr)
- UI components in `/components/ui/` wrap Radix UI primitives

## Testing

Tests live in `/tests/unit/` and use Vitest + React Testing Library with jsdom. Setup file: `tests/setup.ts`. Tests cover utility functions and validators, not database calls or full component trees.

## Python Matching Pipeline

Algorithm stages in `/app/algo/preprocess/`:
1. `text_processing.py` — keyword extraction and normalization
2. `domain_expander.py` — domain expansion
3. `scoring.py` — weighted compatibility scoring
4. `matching.py` — hospital-resident stable matching
5. `main.py` — orchestrator; reads from and writes to Supabase

The Python environment uses a venv; `HF_TOKEN` in `.env` is used for Hugging Face embeddings within scoring.
