# System Diagrams — Fortis Nexus

> All diagrams use Mermaid syntax. Render in VS Code (Markdown Preview), GitHub, or [mermaid.live](https://mermaid.live).

---

## 1. Sequence Diagrams

### 1A. User Login & Role-Based Routing

```mermaid
sequenceDiagram
    actor User as User (any role)
    participant Browser as Browser
    participant MW as middleware.ts
    participant AuthCtx as authContext.tsx
    participant AuthActions as authActions.ts
    participant SupaAuth as Supabase Auth
    participant DB as Supabase DB (PostgreSQL)

    User->>Browser: Navigate to /
    Browser->>MW: HTTP request
    MW->>SupaAuth: Validate JWT (cookie)
    SupaAuth-->>MW: Session result

    alt No valid session
        MW-->>Browser: Redirect → / (login page)
    end

    User->>Browser: Submit credentials (email + password)
    Browser->>AuthCtx: signIn(email, password)
    AuthCtx->>SupaAuth: signInWithPassword(email, password)
    SupaAuth-->>AuthCtx: JWT + session cookie

    AuthCtx->>AuthActions: getUserRole(userId)
    AuthActions->>DB: SELECT from mentor WHERE id = userId
    AuthActions->>DB: SELECT from MENTEE_GROUPS WHERE id = userId
    AuthActions->>DB: SELECT from admin WHERE id = userId
    DB-->>AuthActions: matched role record

    alt mentor AND profile_completed = false
        AuthCtx-->>Browser: Redirect → /mentor/complete-profile
    else mentor
        AuthCtx-->>Browser: Redirect → /mentor/mentor-dashboard
    else mentee
        AuthCtx-->>Browser: Redirect → /mentee/mentee-dashboard
    else admin
        AuthCtx-->>Browser: Redirect → /admin
    end
```

---

### 1B. Admin Runs the Matching Algorithm

```mermaid
sequenceDiagram
    actor Admin as Admin
    participant Browser as Browser
    participant NextAPI as Next.js /api/run-matching
    participant Express as Express Backend (port 8000)
    participant Service as matchingService.js
    participant Python as Python Engine (main.py)
    participant DB as Supabase DB

    Admin->>Browser: Click "Run Matching"
    Browser->>NextAPI: POST /api/run-matching

    NextAPI->>Express: POST /api/matching/run
    Express->>Service: runMatchingScript()
    Service->>Python: child_process.spawn("python3 main.py")

    Python->>DB: fetch_mentors() → SELECT from mentor
    DB-->>Python: mentor records

    Python->>DB: fetch_mentees() → SELECT from MENTEE_GROUPS
    DB-->>Python: mentee group records

    Python->>Python: get_mentor_keywords() [text_processing.py]
    Python->>Python: get_mentee_keywords() [text_processing.py]
    Python->>Python: expand_pair() [domain_expander.py]

    Python->>Python: compute_weighted_scores() [scoring.py]
    Note over Python: keyword 60% · experience 20%<br/>availability 10% · communication 5% · frequency 5%

    Python->>Python: generate_preferences() [matching.py]
    Python->>Python: hospital_resident() — mentee-optimal [matching.py]
    Python->>Python: hospital_resident_mentor_optimal() [matching.py]
    Python->>Python: pick_fairer_matching() — min dissatisfaction
    Python->>Python: verify_stability() — check blocking pairs

    Python->>DB: clear_matches() → DELETE from matches
    Python->>DB: save_matches() → INSERT into matches
    Python->>DB: save_preferences() → UPSERT mentee_preferences, mentor_preferences
    Python->>DB: INSERT into algorithm_logs
    DB-->>Python: OK

    Python-->>Service: stdout: __MATCHING_LOG_START__ {JSON} __MATCHING_LOG_END__
    Service-->>Express: parsed JSON (matched pairs, stability, algorithm)
    Express-->>NextAPI: HTTP 200 + JSON
    NextAPI-->>Browser: matching results
    Browser-->>Admin: Display results, stability status, algorithm used
```

---

### 1C. Mentee Submits a Paper — Mentor Reviews

```mermaid
sequenceDiagram
    actor Mentee as Mentee
    actor Mentor as Mentor
    participant Browser as Browser
    participant PaperActions as paperActions.ts
    participant Storage as Supabase Storage (papers bucket)
    participant DB as Supabase DB

    Mentee->>Browser: Open Paper Submission tab
    Browser->>PaperActions: getPapers()
    PaperActions->>DB: SELECT papers WHERE mentee_group_id = me
    DB-->>PaperActions: papers list

    alt Pending paper exists
        PaperActions-->>Browser: hasPendingPaper = true
        Browser-->>Mentee: Submit form is locked — "awaiting review" message
    else No pending paper
        Browser-->>Mentee: Submit form is available
        Mentee->>Browser: Fill form (title + PDF ≤ 5 MB)
        Browser->>PaperActions: submitPaper(formData)

        PaperActions->>DB: SELECT papers WHERE mentee_group_id = me AND status = 'pending'
        DB-->>PaperActions: (none)

        alt Reviewed paper exists
            PaperActions->>DB: SELECT reviewed paper (file_path)
            PaperActions->>Storage: delete old file
            PaperActions->>DB: DELETE old paper row
        end

        PaperActions->>DB: getMenteeData() → get mentor_id from matches
        DB-->>PaperActions: match record
        PaperActions->>Storage: upload PDF → papers/{mentee_id}/{filename}
        Storage-->>PaperActions: file_path
        PaperActions->>DB: INSERT into papers (mentee_group_id, mentor_id, title, file_path, status='pending')
        DB-->>PaperActions: OK
        PaperActions-->>Browser: success
        Browser-->>Mentee: "Paper submitted" · form locks
    end

    Mentor->>Browser: Open Papers tab
    Browser->>PaperActions: getMenteesPapers()
    PaperActions->>DB: SELECT papers + paper_comments WHERE mentor_id = me
    DB-->>PaperActions: papers list with comments
    Browser-->>Mentor: Papers list

    Mentor->>Browser: Click "Download"
    Browser->>PaperActions: getPaperDownloadUrl(filePath)
    PaperActions->>Storage: createSignedUrl(filePath)
    Storage-->>PaperActions: signed URL (time-limited)
    Browser->>Storage: GET PDF via signed URL
    Storage-->>Browser: PDF file

    Mentor->>Browser: Add comment + mark reviewed
    Browser->>PaperActions: addComment(paperId, comment)
    PaperActions->>DB: INSERT into paper_comments · UPDATE papers status='reviewed'
    DB-->>PaperActions: OK
    Browser-->>Mentor: Comment posted · paper marked reviewed
    Note over Browser,Mentee: Mentee's submit form unlocks on next page load
```

---

### 1D. Mentor Creates a Milestone — Mentee Views It

```mermaid
sequenceDiagram
    actor Mentor as Mentor
    actor Mentee as Mentee
    participant Browser as Browser
    participant MilestoneActions as milestoneActions.ts
    participant DB as Supabase DB

    Mentor->>Browser: Open Milestones tab · select mentee group
    Browser->>MilestoneActions: getMilestones(menteeGroupId)
    MilestoneActions->>DB: SELECT milestones WHERE mentee_group_id = X AND mentor_id = me
    DB-->>MilestoneActions: milestones list
    Browser-->>Mentor: Milestone list

    Mentor->>Browser: Fill form (title, description, due date)
    Browser->>MilestoneActions: createMilestone({ menteeGroupId, title, description, dueDate })
    MilestoneActions->>DB: INSERT into milestones
    DB-->>MilestoneActions: new milestone
    Browser-->>Mentor: Milestone appears in list

    Mentor->>Browser: Tick checkbox during meeting
    Browser->>MilestoneActions: toggleMilestone(milestoneId, true)
    MilestoneActions->>DB: UPDATE milestones SET completed=true, completed_at=now()
    DB-->>MilestoneActions: OK
    Browser-->>Mentor: Milestone marked done

    Mentee->>Browser: Open Tasks & Milestones tab
    Browser->>MilestoneActions: getMilestonesForCurrentMentee()
    MilestoneActions->>DB: SELECT milestones JOIN matches WHERE mentee_group_id = me
    DB-->>MilestoneActions: milestones list
    Browser-->>Mentee: Read-only checklist (done · overdue · upcoming badges)
```

---

## 2. Use-Case Diagram

```mermaid
flowchart LR
    MenteeActor(["👤 Mentee"])
    MentorActor(["👤 Mentor"])
    AdminActor(["👤 Admin"])
    SystemActor(["⚙️ Python Engine"])

    subgraph MenteeUC ["Mentee"]
        direction TB
        UC1["Register Account"]
        UC2["Complete / Edit Profile"]
        UC3["View Matched Mentor\n+ Compatibility Score"]
        UC4["View Meeting Schedule\n+ Session Notes"]
        UC5["Submit Research Paper\n(5 MB limit · one at a time)"]
        UC6["View Paper Comments"]
        UC7["View Admin Announcements"]
        UC7b["View Mentor Announcements"]
        UC8["Change Password"]
        UC8b["View Mentor Availability\n(days + time slots)"]
        UC8c["View Tasks & Milestones\n(read-only checklist)"]
    end

    subgraph MentorUC ["Mentor"]
        direction TB
        UC9["Complete / Edit Profile"]
        UC10["View Matched Mentee Groups\n+ Compatibility Scores"]
        UC10b["View Mentee Profile Modal\n(research · members · availability)"]
        UC11["Download & Comment\non Papers · Mark Reviewed"]
        UC12["Schedule Recurring Meeting\n+ Write Session Notes"]
        UC13["Create / Delete\nMentor Announcements"]
        UC14["View Admin Announcements"]
        UC15["Change Password"]
        UC15b["Create / Toggle / Delete\nMilestones per Mentee Group"]
    end

    subgraph AdminUC ["Admin"]
        direction TB
        UC16["Run Matching Algorithm"]
        UC17["View Algorithm Logs"]
        UC18["Create / Delete\nAnnouncements"]
        UC19["Manage Mentor Profiles\n(view / edit / delete / create)"]
        UC20["Manage Mentee Profiles\n(view / edit / delete / create)"]
        UC21["Override Mentor Capacity"]
        UC22["Rollback Matches"]
        UC23["Cleanup Orphaned Accounts"]
    end

    subgraph SystemUC ["Python Matching Engine"]
        direction TB
        UC24["Extract Keywords\n(TF-IDF, CS vocab)"]
        UC25["Score Compatibility\n(5-pillar weighted)"]
        UC26["Run Gale-Shapley\nStable Matching"]
        UC27["Verify Stability\n(blocking pair check)"]
        UC28["Persist Results\nto Supabase"]
    end

    MenteeActor --- UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC7b & UC8 & UC8b & UC8c
    MentorActor --- UC9 & UC10 & UC10b & UC11 & UC12 & UC13 & UC14 & UC15 & UC15b
    AdminActor --- UC16 & UC17 & UC18 & UC19 & UC20 & UC21 & UC22 & UC23
    UC16 --> SystemActor
    SystemActor --- UC24 & UC25 & UC26 & UC27 & UC28
```

---

## 3. Class Diagram

```mermaid
classDiagram
    class Mentor {
        +uuid id
        +string first_name
        +string last_name
        +string email
        +string[] technical_skills
        +string[] forte
        +string self_description
        +int mentor_capacity
        +int experience
        +string[] available_days
        +string[] time_slot
        +CommunicationPreference communication_preference
        +jsonb prev_mentored_thesis
        +boolean profile_completed
    }

    class MenteeGroup {
        +uuid id
        +string group_name
        +string email
        +string[] group_members
        +string research_title
        +string research_description
        +string mentor_preference
        +string[] available_days
        +string[] time_slot
        +CommunicationPreference communication_preference
        +timestamp created_at
    }

    class Match {
        +uuid id
        +uuid mentor_id
        +uuid mentee_group_id
        +float compatibility_score
        +string[] matched_keywords
        +string algorithm
        +boolean is_stable
        +string status
        +timestamp matched_at
    }

    class Meeting {
        +uuid id
        +uuid mentor_id
        +uuid mentee_group_id
        +string title
        +string description
        +string date
        +string time
        +boolean is_recurring
        +string recurrence_day
        +string recurrence_time
        +string status
        +text notes
        +timestamp created_at
    }

    class Paper {
        +uuid id
        +uuid mentee_group_id
        +uuid mentor_id
        +string title
        +string file_name
        +string file_path
        +string status
        +timestamp submitted_at
    }

    class PaperComment {
        +uuid id
        +uuid paper_id
        +uuid mentor_id
        +string comment
        +timestamp created_at
    }

    class Announcement {
        +uuid id
        +string title
        +string body
        +AnnouncementTarget target
        +timestamp created_at
    }

    class MentorAnnouncement {
        +uuid id
        +uuid mentor_id
        +string title
        +string body
        +timestamp created_at
    }

    class Milestone {
        +uuid id
        +uuid mentor_id
        +uuid mentee_group_id
        +string title
        +text description
        +date due_date
        +boolean completed
        +timestamptz completed_at
        +timestamp created_at
    }

    class MenteePreferences {
        +uuid mentee_group_id
        +jsonb ranked_mentors
        +timestamp created_at
    }

    class MentorPreferences {
        +uuid mentor_id
        +jsonb ranked_mentees
        +timestamp created_at
    }

    class AlgorithmLog {
        +uuid id
        +jsonb log_data
        +timestamp created_at
    }

    class Admin {
        +uuid id
        +string email
        +string role
    }

    class CommunicationPreference {
        <<enumeration>>
        FACE_TO_FACE
        ONLINE_CHAT
        ONLINE_CALL
    }

    class AnnouncementTarget {
        <<enumeration>>
        all
        mentor
        mentee
    }

    Mentor "1" --> "0..*" Match : assigned to
    MenteeGroup "1" --> "0..1" Match : has one
    Mentor "1" --> "0..1" MentorPreferences : has
    MenteeGroup "1" --> "0..1" MenteePreferences : has
    Mentor "1" --> "0..*" Meeting : schedules
    MenteeGroup "1" --> "0..*" Meeting : attends
    MenteeGroup "1" --> "0..*" Paper : submits
    Mentor "1" --> "0..*" Paper : receives
    Paper "1" --> "0..*" PaperComment : receives
    Mentor "1" --> "0..*" PaperComment : writes
    Mentor "1" --> "0..*" MentorAnnouncement : broadcasts
    Mentor "1" --> "0..*" Milestone : creates
    MenteeGroup "1" --> "0..*" Milestone : assigned
    Announcement --> AnnouncementTarget : targets
    Mentor --> CommunicationPreference : prefers
    MenteeGroup --> CommunicationPreference : prefers
    AlgorithmLog ..> Match : records outcome of
```

---

## 4. System Architecture Diagram

```mermaid
flowchart TD
    Browser["🌐 **Browser**
    React 19 · Tailwind CSS · Radix UI
    Context API: authContext · mentorContext · menteeContext"]

    subgraph NextJS ["Next.js Application — port 3000"]
        direction TB
        MW["middleware.ts
        JWT validation · role-based routing
        Unauthenticated → /  |  Incomplete profile → /mentor/complete-profile"]

        AppRouter["App Router
        /mentor/*  ·  /mentee/*  ·  /admin/*
        /register/mentee-register  ·  /reset-password"]

        ServerActions["Server Actions — lib/actions/
        authActions · mentorActions · menteeActions · adminActions
        meetingActions · paperActions · announcementActions
        milestoneActions · mentorAnnouncementActions"]

        APIRoute["API Route
        POST /api/run-matching
        GET  /api/run-matching
        HTTP proxy to Express"]
    end

    subgraph Supabase ["☁ Supabase Platform"]
        direction TB
        SupaAuth["Auth Service
        JWT tokens · session cookies
        sign-in · sign-up · sign-out · password reset"]

        SupaDB["PostgreSQL (pg 17)
        mentor · MENTEE_GROUPS · admin
        matches · meetings (+ notes column)
        papers · paper_comments
        announcements · mentor_announcements
        milestones
        mentee_preferences · mentor_preferences
        algorithm_logs"]

        SupaStorage["Object Storage
        papers bucket
        PDF uploads · signed download URLs"]
    end

    subgraph Express ["Express Backend — port 8000"]
        direction TB
        Routes["matchingRoutes.js
        POST /api/matching/run
        GET  /api/matching/status"]
        Controller["matchingController.js"]
        Service["matchingService.js
        Spawns Python subprocess
        Parses __MATCHING_LOG_START__ … __MATCHING_LOG_END__"]
    end

    subgraph Python ["Python Matching Engine — app/algo/preprocess/"]
        direction TB
        MainPy["main.py — Orchestrator
        Fetch → Score → Match → Persist"]

        TextProc["text_processing.py
        Keyword extraction
        CS vocab longest-match · TF-IDF · bigrams
        Academic stop-word filtering"]

        DomainExp["domain_expander.py
        Semantic domain expansion
        AI · NLP · CV · ML · Cybersecurity · IoT …"]

        Scoring["scoring.py
        Weighted compatibility scoring
        ├ keyword similarity  60%  (TF-IDF cosine)
        ├ experience score    20%  (publications · certs)
        ├ availability score  10%  (Jaccard: days + slots)
        ├ communication mode   5%  (F2F / Online match)
        └ meeting frequency    5%  (shared days / 3)"]

        Matching["matching.py — Gale-Shapley
        hospital_resident()         mentee-optimal
        hospital_resident_mentor_optimal()
        pick_fairer_matching()      min dissatisfaction
        verify_stability()          blocking pair check
        _apply_safety_net()         unmatched fallback"]
    end

    Browser <-->|"HTTPS"| MW
    MW --> AppRouter
    AppRouter --> ServerActions
    AppRouter --> APIRoute

    ServerActions <-->|"supabase-js SSR"| SupaAuth
    ServerActions <-->|"supabase-js SSR"| SupaDB
    ServerActions <-->|"supabase-js SSR"| SupaStorage

    APIRoute -->|"HTTP"| Routes
    Routes --> Controller --> Service
    Service -->|"child_process.spawn()"| MainPy

    MainPy --> TextProc
    MainPy --> DomainExp
    MainPy --> Scoring
    Scoring --> DomainExp
    MainPy --> Matching

    MainPy <-->|"supabase-py (REST)"| SupaDB
    Service <-->|"stdout / stderr"| MainPy
```

---

## Scoring Weight Reference

| Pillar | Weight | Signal |
|--------|--------|--------|
| Keyword Similarity | 60% | TF-IDF cosine between mentor skills/description and mentee research |
| Experience | 20% | Prior mentored theses, publications, certifications |
| Availability | 10% | Jaccard overlap on days (60%) and time slots (40%) |
| Communication Mode | 5% | FACE_TO_FACE / ONLINE_CHAT / ONLINE_CALL compatibility |
| Meeting Frequency | 5% | Shared available days / 3.0 |

## Algorithm Summary

The system runs **two variants** of Gale-Shapley (Hospital-Resident):

1. **Mentee-optimal** — mentees propose; guarantees best outcome for mentees
2. **Mentor-optimal** — mentors propose; guarantees best outcome for mentors

The final assignment is whichever variant produces **lower total dissatisfaction** (average rank in preference list). Stability is then verified by checking for blocking pairs — any mentor-mentee pair that would both prefer each other over their current assignments.
