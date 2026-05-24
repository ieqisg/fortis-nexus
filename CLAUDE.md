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

## Sequence Diagram

```mermaid
sequenceDiagram
    actor Admin
    actor Mentor
    actor Mentee
    participant Browser
    participant Middleware
    participant API Layer
    participant Backend Service
    participant Matching Engine
    participant Database

    rect rgb(230, 240, 255)
        Note over Browser, Database: Authentication & Role Routing
        Mentor->>Browser: Sign in
        Browser->>API Layer: signInWithPassword(email, password)
        API Layer->>Database: Validate credentials
        Database-->>API Layer: JWT + session
        API Layer-->>Browser: Session cookie

        Browser->>Middleware: Request protected route
        Middleware->>Middleware: Check role cache (5 min TTL)
        Middleware->>Database: Lookup role (mentor / mentee / admin)
        Database-->>Middleware: role + profile_completed
        Middleware->>Middleware: Cache signed role cookie

        alt Mentor — profile incomplete
            Middleware-->>Browser: Redirect → Complete Profile
        else Mentor — profile complete
            Middleware-->>Browser: Redirect → Mentor Dashboard
        else Mentee
            Middleware-->>Browser: Redirect → Mentee Dashboard
        else Admin
            Middleware-->>Browser: Redirect → Admin Panel
        end
    end

    rect rgb(230, 255, 240)
        Note over Mentor, Database: Mentor Onboarding
        Admin->>API Layer: Register mentor account
        API Layer->>Database: Create auth user + mentor row (incomplete)

        Mentor->>Browser: Submit profile form
        Browser->>API Layer: Save profile
        API Layer->>Database: Update mentor (profile_completed = true)
        API Layer->>API Layer: Invalidate role cache
        API Layer-->>Browser: Success
        Browser->>Browser: Sign out → redirect to login
    end

    rect rgb(255, 248, 230)
        Note over Browser, Database: Data Mutations (Profile & Meetings)
        Mentor->>Browser: Edit profile / schedule meeting
        Browser->>API Layer: Submit changes
        API Layer->>Database: Update mentor or meetings record
        Database-->>API Layer: Updated data
        API Layer-->>Browser: Success + fresh data
        Browser->>Browser: Re-render with updated state
    end

    rect rgb(255, 230, 230)
        Note over Admin, Database: Matching Pipeline
        Admin->>Browser: Trigger matching run
        Browser->>API Layer: POST /api/run-matching
        API Layer->>Backend Service: Forward request

        alt Already running
            Backend Service-->>API Layer: 409 — Already in progress
        end

        Backend Service->>Matching Engine: Spawn matching process
        Matching Engine->>Database: Fetch all mentor profiles
        Matching Engine->>Database: Fetch all mentee groups
        Database-->>Matching Engine: Profiles + groups

        Matching Engine->>Matching Engine: Extract & normalize keywords
        Matching Engine->>Matching Engine: Expand domains
        Matching Engine->>Matching Engine: Score compatibility (TF-IDF)
        Matching Engine->>Matching Engine: Run Gale-Shapley stable matching

        Matching Engine->>Database: Write match results
        Matching Engine-->>Backend Service: Log output (matched / unmatched counts)
        Backend Service-->>API Layer: Result summary
        API Layer-->>Browser: Match summary
        Browser->>Browser: Display results
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

## System Context File

`docs/context.md` is the living record of what this system is, what it does, and how it is structured. **Whenever a major change is made to the system, update `docs/context.md` to reflect it.**

A major change includes any of the following:
- A new feature or user-facing capability is added or removed
- A new database table or column is added, renamed, or dropped
- A new route, portal, or page is introduced
- The matching algorithm or its scoring weights are modified
- A new module, service, or integration is added
- Auth behavior or role routing logic is changed

When updating `docs/context.md`:
1. Edit the relevant section(s) to reflect the new state of the system
2. Add a row to the **Change Log** table at the bottom with the date, a one-line description of the change, and the affected area

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
