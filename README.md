# Fortis Nexus — Mentor-Mentee Matching System

A web application for matching thesis research groups with faculty mentors at FEU Tech. It uses the **Gale-Shapley Hospital-Resident algorithm** combined with **TF-IDF cosine similarity** and weighted compatibility scoring to produce stable, fair matches.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [Database](#database)
- [Matching Algorithm](#matching-algorithm)
- [User Roles](#user-roles)
- [Features](#features)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Overview

Fortis Nexus automates the mentor-mentee matching process for CS thesis advising. Admins run the matching algorithm from a dashboard, and the system assigns mentee groups to mentors based on research alignment, availability, and communication preferences. Both mentors and mentees get dedicated dashboards to track their pairing, meetings, and paper submissions.

---

## Architecture

The app runs as three concurrent processes:

```
┌─────────────────────┐     ┌──────────────────────┐     ┌────────────────────────────┐
│  Next.js Frontend   │────▶│  Express Backend      │────▶│  Python Matching Engine    │
│  (port 3000)        │     │  (port 8000)          │     │  (subprocess)              │
│  App Router / React │     │  Proxies /api/run-    │     │  Gale-Shapley + TF-IDF     │
│  Server Actions     │     │  matching to Python   │     │  Reads/writes Supabase     │
└─────────────────────┘     └──────────────────────┘     └────────────────────────────┘
         │                                                            │
         └────────────────────────────────────────────────────────────┘
                                  Supabase (PostgreSQL + Auth)
```

- **Next.js frontend** — all UI, server actions, and Supabase queries
- **Express backend** — thin server that spawns the Python subprocess when an admin triggers matching
- **Python engine** — reads mentor/mentee profiles from Supabase, computes scores, runs Gale-Shapley, writes results back

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, Radix UI |
| Backend | Express 5, Node.js |
| Algorithm | Python 3, scikit-learn, numpy |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT + cookies via `@supabase/ssr`) |
| UI Components | shadcn/ui, Lucide React |
| Testing | Vitest, React Testing Library |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Python** 3.10+ with a virtual environment
- **Supabase** project (local or cloud)

### Environment Variables

Create a `.env` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Hugging Face (optional — used for BERT embeddings in scoring)
HF_TOKEN=your_hf_token
```

### Installation

```bash
# 1. Install Node.js dependencies (frontend + backend)
npm install
cd backend && npm install && cd ..

# 2. Set up the Python environment
python3 -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Running the App

Both the Next.js frontend and the Express backend must run simultaneously:

```bash
# Terminal 1 — Next.js frontend (http://localhost:3000)
npm run dev

# Terminal 2 — Express backend (http://localhost:8000)
npm run backend
```

---

## Project Structure

```
fortis-nexus/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Login page
│   ├── admin/                  # Admin dashboard
│   ├── mentor/
│   │   ├── mentor-dashboard/   # Mentor dashboard (6 tabs)
│   │   │   ├── dashboard.tsx       # Root layout + tab shell
│   │   │   ├── my-mentees.tsx      # Mentee cards + profile modal
│   │   │   ├── progress-mentee.tsx # Progress tracking
│   │   │   ├── submitted-papers.tsx# Paper review + comments
│   │   │   ├── meeting.tsx         # Recurring meetings + notes
│   │   │   ├── milestones.tsx      # Task/milestone management
│   │   │   └── mentor-announcements.tsx # Mentor-to-mentee broadcasts
│   │   └── complete-profile/   # First-login profile setup
│   ├── mentee/
│   │   └── mentee-dashboard/   # Mentee dashboard (3 tabs)
│   │       └── dashboard.tsx       # Dashboard / Paper Submission / Tasks & Milestones
│   ├── register/               # Mentee self-registration
│   ├── algo/preprocess/        # Python matching engine
│   │   ├── main.py             # Orchestrator (reads/writes Supabase)
│   │   ├── scoring.py          # Weighted compatibility scoring
│   │   ├── matching.py         # Gale-Shapley algorithm
│   │   ├── domain_expander.py  # Domain keyword expansion
│   │   └── text_processing.py  # Text normalization & keyword extraction
│   ├── api/run-matching/       # Next.js API route → proxies to Express
│   └── context/                # React context (auth, mentor, mentee state)
├── backend/                    # Express server
│   ├── server.js
│   ├── routes/                 # POST /run, GET /status
│   ├── controller/
│   └── services/               # Spawns Python subprocess
├── lib/
│   └── actions/                # Server actions (sole Supabase interface from Next.js)
│       ├── adminActions.ts
│       ├── mentorActions.ts
│       ├── menteeActions.ts
│       ├── authActions.ts
│       ├── announcementActions.ts
│       ├── mentorAnnouncementActions.ts  # Mentor-to-mentee announcements
│       ├── milestoneActions.ts           # Milestone CRUD
│       ├── meetingActions.ts             # Meetings + notes
│       └── paperActions.ts
├── components/ui/              # shadcn/ui + custom components
├── types/                      # TypeScript type definitions
│   ├── mentorTypes.ts          # Milestone, MentorAnnouncement, MeetingRecord
│   └── menteeTypes.ts          # MenteeMeeting, Matches (with mentor availability)
├── supabase/migrations/        # SQL migration files
└── tests/unit/                 # Vitest unit tests
```

---

## Database

Key tables in Supabase:

| Table | Description |
|-------|-------------|
| `mentor` | Mentor profiles (`profile_completed` flag gates first-login redirect) |
| `MENTEE_GROUPS` | Mentee group profiles and research info |
| `matches` | Algorithm output — `mentor_id`, `mentee_group_id`, `compatibility_score`, `matched_keywords` |
| `meetings` | Recurring meeting schedules; includes a `notes` text column for session notes |
| `papers` | Papers submitted by mentee groups (one active paper at a time enforced) |
| `paper_comments` | Mentor feedback on submitted papers |
| `announcements` | Admin broadcast messages (targets: all / mentor / mentee) |
| `mentor_announcements` | Mentor-to-mentee broadcasts scoped to matched mentees only |
| `milestones` | Tasks/deadlines set by a mentor for a specific mentee group |
| `algorithm_logs` | Full JSON log of each matching run |
| `mentor_preferences` | Ranked mentor list per mentee (pre-computed) |
| `mentee_preferences` | Ranked mentee list per mentor (pre-computed) |

### Applying Migrations

```bash
# Using Supabase CLI (local)
supabase db push

# Or run the SQL manually in the Supabase dashboard SQL editor:
# supabase/migrations/20260510_algorithm_logs.sql
# supabase/migrations/20260510_preference_tables.sql
# supabase/migrations/20260511_milestones_notes_announcements.sql
```

---

## Matching Algorithm

The matching pipeline runs in three phases:

### Phase 1 — Data Collection & Preprocessing

- Fetches mentor and mentee profiles from Supabase
- Runs keyword extraction and text normalization (`text_processing.py`)
- Expands domain keywords using a curated `DOMAIN_MAP` (e.g. `"nlp"` → `"natural language processing"`, `"tokenization"`, etc.) via `domain_expander.py`

### Phase 2 — Compatibility Scoring

Each mentor-mentee pair receives a weighted score:

| Component | Weight | Description |
|-----------|--------|-------------|
| Keyword similarity | 60% | TF-IDF cosine similarity on expanded text |
| Experience | 20% | Mentor years of experience |
| Availability | 10% | Overlapping available days |
| Communication | 5% | Matching communication preference |
| Meeting frequency | 5% | Time-slot overlap |

### Phase 3 — Stable Matching (Gale-Shapley)

- Builds preference lists from the compatibility scores
- Runs both **mentee-optimal** and **mentor-optimal** Hospital-Resident variants
- Selects the fairer result (minimizes combined dissatisfaction from both sides)
- Verifies stability — no blocking pairs
- Writes results to the `matches` table and logs the full run to `algorithm_logs`

---

## User Roles

### Admin
- Runs the matching algorithm
- Manages mentor/mentee accounts (create, edit, delete)
- Overrides mentor capacities
- Posts announcements
- Views algorithm flow logs

### Mentor
- Completes profile on first login (skills, forte, availability, capacity)
- Views assigned mentee groups and compatibility scores; click any mentee card to open a full profile modal
- Sets recurring meeting schedules and writes per-session meeting notes
- Reviews and comments on submitted papers
- Creates milestones (tasks + due dates) per mentee group; ticks off completed items
- Broadcasts announcements visible only to their matched mentees

### Mentee
- Self-registers via the registration flow
- Views assigned mentor profile (expertise, skills, about, previously mentored theses) and compatibility score
- Sees ranked list of all mentors by compatibility
- Sees mentor's available days and time slots on the dashboard
- Submits papers for review (5 MB limit; one active paper at a time — form locks while a paper is pending; prior reviewed paper is replaced automatically on re-submission)
- Views mentor feedback and downloads submitted files
- Reads tasks and milestones set by their mentor, including due dates and completion status
- Receives mentor announcements scoped to them alongside admin broadcasts

---

## Features

- **Stable matching** — Gale-Shapley guarantees no mentor-mentee pair would both prefer each other over their current assignments
- **Domain expansion** — short abbreviations (`"ai"`, `"nlp"`, `"cv"`) are expanded to full topic vocabularies before scoring
- **Atomic registration** — mentee signup is a single server action; orphaned auth users are detected and cleaned up automatically
- **Session enforcement** — a user can only be logged in on one device at a time
- **Rate limiting** — login (5 attempts / 5 min) and password reset (3 / hour) are rate-limited in memory
- **Milestones** — mentors assign tasks with optional descriptions and due dates per mentee group; overdue items are highlighted in red; mentees see a read-only checklist
- **Meeting notes** — mentors write freeform session notes on each recurring meeting record; notes are visible on the mentee's dashboard
- **Mentor announcements** — mentors broadcast messages that are scoped to their matched mentees only (separate from admin announcements)
- **Paper submission rules** — mentees can only have one active paper at a time; the submit form is locked while a paper is pending review; when a reviewed paper is replaced, the old file is deleted from storage automatically; file size is validated at 5 MB
- **Mentor availability on mentee dashboard** — mentees can see their mentor's available days and time slots directly on their dashboard
- **Mentee profile modal** — mentors can click any matched mentee card to view a full profile modal (research details, group members, availability, match score)
- **Tab-based dashboards** — mentor dashboard has 6 tabs (Mentees, Progress, Papers, Meetings, Milestones, Announcements); mentee dashboard has 3 tabs (Dashboard, Paper Submission, Tasks & Milestones)
- **Announcements** — admins broadcast messages to mentors, mentees, or everyone; mentors broadcast to their own mentees only
- **Responsive UI** — works on mobile with collapsible sidebar navigation

---

## Testing

```bash
# Run all unit tests once
npm test

# Run in watch mode
npm run test:watch

# Run a specific test file
npx vitest run tests/unit/profile_validators.test.ts
```

Tests live in `tests/unit/` and use **Vitest** + **React Testing Library**. They cover utility functions and validators. Database calls and full component trees are not tested in unit tests.

---

## Deployment

The app is deployed on **Railway** (see `railway.toml`) with the Supabase cloud project as the database.

```bash
# Build for production
npm run build

# Start production server
npm run start
```

> The Express backend and Python engine must also be running in production. Railway runs all processes defined in the `Procfile` or `railway.toml`.
