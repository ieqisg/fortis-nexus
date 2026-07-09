# CODEX.md

This file gives Codex project context for working in this repository. Treat `docs/context.md` as the living system record and update it whenever a major system change is made.

## Project Snapshot

Fortis Nexus is a mentor-mentee matching platform for FEU Tech Computer Science thesis groups. It lets admins manage users and trigger automated matching, mentors manage assigned groups, and mentee groups track their mentor relationship, submissions, meetings, and milestones.

The system is a three-process application:

1. Next.js frontend in `/app`
2. Express backend in `/backend`
3. Python matching engine in `/app/algo/preprocess`

Supabase provides authentication, PostgreSQL storage, and uploaded paper storage.

## Commands

```bash
npm run dev          # Next.js frontend on http://localhost:3000
npm run backend      # Express backend on http://localhost:8000
npm run build
npm run start
npm run lint
npm test             # Vitest once
npm run test:watch   # Vitest watch mode
```

Run one test file with:

```bash
npx vitest run tests/unit/profile_validators.test.ts
```

Python dependencies are listed in `requirements.txt`. The Express matching service currently expects the Python binary at `app/algo/venv/bin/python3`.

## Architecture Notes

- `/app` uses the Next.js App Router with React 19 and Tailwind CSS.
- `/app/api/run-matching/route.ts` proxies matching requests to the Express backend.
- `/backend/services/matchingService.js` spawns `app/algo/preprocess/main.py` and parses logs between `__MATCHING_LOG_START__` and `__MATCHING_LOG_END__`.
- `/app/algo/preprocess/` contains the matching pipeline: text processing, domain expansion, scoring, stable matching, and the `main.py` orchestrator.
- `/lib/actions/` contains server actions and should remain the Next.js layer's database interface.
- `/components/ui/` contains shared shadcn/Radix-style UI primitives and custom UI helpers.
- `/types/` contains shared TypeScript domain types.
- `/tests/unit/` contains Vitest unit tests.

## Data And Auth Rules

- Supabase Auth stores user sessions in cookies via `@supabase/ssr`.
- `proxy.ts` handles protected routing, role lookup, and mentor onboarding redirects.
- Roles are inferred from the auth user ID's presence in `mentor`, `MENTEE_GROUPS`, or `admin`.
- Role data is cached in the signed `x-role-cache` cookie for 5 minutes when `ROLE_CACHE_SECRET` is set.
- Client components should not make direct Supabase data calls. Use server actions in `/lib/actions/`.

## Matching Rules

The matching engine combines compatibility scoring with a Gale-Shapley hospital-resident stable matching process. It scores pairs using research overlap, experience, availability, communication style, and meeting frequency, then writes matches, preferences, and logs back to Supabase.

Important documentation rule: `docs/context.md` contains a baseline stakeholder-facing scoring-weight table. Do not change the weight values in that table even if runtime weights in `scoring.py` change. Instead, update code and add a `docs/context.md` Change Log entry.

## Key Database Tables

- `mentor`
- `MENTEE_GROUPS`
- `matches`
- `meetings`
- `papers`
- `paper_comments`
- `milestones`
- `announcements`
- `mentor_announcements`
- `mentor_preferences`
- `mentee_preferences`
- `algorithm_logs`
- mock demo tables: `mock_mentor`, `mock_mentee_groups`, `mock_matches`, `mock_algorithm_logs`

## Environment Variables

Common variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ROLE_CACHE_SECRET=
BACKEND_URL=http://localhost:8000
HF_TOKEN=
```

Do not commit real secrets. `.env.example` documents expected local configuration.

## Documentation Maintenance

Update `docs/context.md` for major system changes, including:

- new or removed user-facing features
- database table or column changes
- new routes, portals, or pages
- matching algorithm or scoring behavior changes
- new modules, services, or integrations
- auth or role-routing behavior changes

When updating `docs/context.md`, edit the relevant sections and add a row to its Change Log with the date, summary, and affected area.

## Related Docs

- `README.md` - setup, architecture, project structure, and feature overview
- `docs/context.md` - living system context and change log
- `docs/architecture.md` - plain-language architecture document
- `docs/algorithm-flowchart.md` - matching algorithm details
- `docs/system-diagrams.md` - diagrams and system relationships
- `CLAUDE.md` - prior agent guidance; useful cross-reference for established project rules
