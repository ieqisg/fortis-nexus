# System Diagrams — Fortis Nexus

> All diagrams use Mermaid syntax. Render in VS Code (Markdown Preview), GitHub, or [mermaid.live](https://mermaid.live).

---

## 1. Sequence Diagrams

### 1A. User Login & Role-Based Routing

This diagram shows how users sign into the system and get directed to the right page based on their role. When a user enters their email and password, the system checks who they are and whether their profile is set up. It then automatically sends them to their personal area — the mentor dashboard, mentee dashboard, admin panel, or the profile completion page if they haven't finished setting up yet.

```mermaid
sequenceDiagram
    actor User as User (any role)
    participant Browser
    participant Auth Middleware
    participant Auth Context
    participant Auth Service
    participant Auth Provider
    participant Database

    User->>Browser: Navigate to /
    Browser->>Auth Middleware: HTTP request
    Auth Middleware->>Auth Provider: Validate session token
    Auth Provider-->>Auth Middleware: Session result

    alt No valid session
        Auth Middleware-->>Browser: Redirect → / (login page)
    end

    User->>Browser: Submit credentials (email + password)
    Browser->>Auth Context: Sign in
    Auth Context->>Auth Provider: Authenticate credentials
    Auth Provider-->>Auth Context: JWT + session cookie

    Auth Context->>Auth Service: Resolve user role
    Auth Service->>Database: Look up role (mentor / mentee / admin)
    Database-->>Auth Service: Matched role record

    alt Mentor — profile incomplete
        Auth Context-->>Browser: Redirect → Complete Profile
    else Mentor — profile complete
        Auth Context-->>Browser: Redirect → Mentor Dashboard
    else Mentee
        Auth Context-->>Browser: Redirect → Mentee Dashboard
    else Admin
        Auth Context-->>Browser: Redirect → Admin Panel
    end
```

---

### 1B. Admin Runs the Matching Algorithm

This diagram shows what happens when an admin triggers the matching process. The request travels from the admin's browser through the web application to a dedicated backend service, which starts the matching engine. The engine loads all mentor and mentee profiles, scores how well each pair fits together, runs the pairing algorithm from both sides, and saves the final results — all without any further manual input.

```mermaid
sequenceDiagram
    actor Admin
    participant Browser
    participant Matching API
    participant Backend Service
    participant Process Manager
    participant Matching Engine
    participant Database

    Admin->>Browser: Click "Run Matching"
    Browser->>Matching API: POST /api/run-matching

    Matching API->>Backend Service: Forward request
    Backend Service->>Process Manager: Delegate matching run
    Process Manager->>Matching Engine: Spawn matching process

    Matching Engine->>Database: Fetch mentor profiles
    Database-->>Matching Engine: Mentor records

    Matching Engine->>Database: Fetch mentee groups
    Database-->>Matching Engine: Mentee group records

    Matching Engine->>Matching Engine: Extract mentor keywords
    Matching Engine->>Matching Engine: Extract mentee keywords
    Matching Engine->>Matching Engine: Expand research domains

    Matching Engine->>Matching Engine: Compute weighted compatibility scores
    Note over Matching Engine: keyword 60% · experience 20% · availability 10%<br/>communication 5% · frequency 5%

    Matching Engine->>Matching Engine: Generate preference rankings
    Matching Engine->>Matching Engine: Run Gale-Shapley (mentee-proposing)
    Matching Engine->>Matching Engine: Run Gale-Shapley (mentor-proposing)
    Matching Engine->>Matching Engine: Select fairer result (lower combined dissatisfaction)
    Matching Engine->>Matching Engine: Verify stability (blocking pair check)

    Matching Engine->>Database: Clear previous matches
    Matching Engine->>Database: Save match results
    Matching Engine->>Database: Save preference rankings
    Matching Engine->>Database: Log algorithm run
    Database-->>Matching Engine: OK

    Matching Engine-->>Process Manager: Emit structured result log
    Process Manager-->>Backend Service: Parsed results (matched pairs, stability, algorithm)
    Backend Service-->>Matching API: HTTP 200 + results
    Matching API-->>Browser: Match summary
    Browser-->>Admin: Display results, stability status, algorithm used
```

---

### 1C. Mentee Submits a Paper — Mentor Reviews

This diagram shows how research paper submissions flow between a mentee group and their assigned mentor. A mentee uploads a paper through the system, which stores it and records its status as pending. The mentor can then view all submitted papers, download them, leave written feedback, and mark each one as reviewed. Once a paper is reviewed, the mentee's submission slot opens up again for the next paper.

```mermaid
sequenceDiagram
    actor Mentee
    actor Mentor
    participant Browser
    participant Paper Service
    participant File Storage
    participant Database

    Mentee->>Browser: Open Paper Submission tab
    Browser->>Paper Service: Load submitted papers
    Paper Service->>Database: Fetch papers for mentee group
    Database-->>Paper Service: Papers list

    alt Pending paper exists
        Paper Service-->>Browser: hasPendingPaper = true
        Browser-->>Mentee: Submit form locked — "awaiting review" message
    else No pending paper
        Browser-->>Mentee: Submit form available
        Mentee->>Browser: Fill form (title + PDF ≤ 5 MB)
        Browser->>Paper Service: Submit paper

        Paper Service->>Database: Check for existing pending paper
        Database-->>Paper Service: (none)

        alt Reviewed paper exists
            Paper Service->>Database: Fetch reviewed paper reference
            Paper Service->>File Storage: Delete old file
            Paper Service->>Database: Remove old paper record
        end

        Paper Service->>Database: Resolve matched mentor ID
        Database-->>Paper Service: Match record
        Paper Service->>File Storage: Upload PDF
        File Storage-->>Paper Service: File path
        Paper Service->>Database: Create paper record (status = pending)
        Database-->>Paper Service: OK
        Paper Service-->>Browser: Success
        Browser-->>Mentee: "Paper submitted" · form locks
    end

    Mentor->>Browser: Open Papers tab
    Browser->>Paper Service: Load mentee papers
    Paper Service->>Database: Fetch papers + comments for mentor
    Database-->>Paper Service: Papers list with comments
    Browser-->>Mentor: Papers list

    Mentor->>Browser: Click "Download"
    Browser->>Paper Service: Request download link
    Paper Service->>File Storage: Generate signed URL
    File Storage-->>Paper Service: Time-limited signed URL
    Browser->>File Storage: GET PDF via signed URL
    File Storage-->>Browser: PDF file

    Mentor->>Browser: Add comment + mark reviewed
    Browser->>Paper Service: Submit comment
    Paper Service->>Database: Save comment · update paper status to reviewed
    Database-->>Paper Service: OK
    Browser-->>Mentor: Comment posted · paper marked reviewed
    Note over Browser,Mentee: Mentee's submit form unlocks on next page load
```

---

### 1D. Mentor Creates a Milestone — Mentee Views It

This diagram shows how mentors set goals for their mentee groups and how mentees track their progress. A mentor creates a milestone with a title, description, and due date, and can mark it as complete at any time — typically during a meeting. Mentees see a read-only view of all their assigned milestones, with clear labels showing which are done, which are overdue, and which are still upcoming.

```mermaid
sequenceDiagram
    actor Mentor
    actor Mentee
    participant Browser
    participant Milestone Service
    participant Database

    Mentor->>Browser: Open Milestones tab · select mentee group
    Browser->>Milestone Service: Load milestones
    Milestone Service->>Database: Fetch milestones for mentee group
    Database-->>Milestone Service: Milestones list
    Browser-->>Mentor: Milestone list

    Mentor->>Browser: Fill form (title, description, due date)
    Browser->>Milestone Service: Create milestone
    Milestone Service->>Database: Insert milestone record
    Database-->>Milestone Service: New milestone
    Browser-->>Mentor: Milestone appears in list

    Mentor->>Browser: Tick checkbox during meeting
    Browser->>Milestone Service: Mark milestone complete
    Milestone Service->>Database: Update milestone (completed = true, completed_at = now)
    Database-->>Milestone Service: OK
    Browser-->>Mentor: Milestone marked done

    Mentee->>Browser: Open Tasks & Milestones tab
    Browser->>Milestone Service: Load milestones for mentee
    Milestone Service->>Database: Fetch milestones via match record
    Database-->>Milestone Service: Milestones list
    Browser-->>Mentee: Read-only checklist (done · overdue · upcoming badges)
```

---

## 2. Use-Case Diagram

This diagram shows everything each type of user can do in the system. Mentees can register, build their profile, view their matched mentor and compatibility score, track meetings and milestones, submit research papers, and read announcements. Mentors can manage their profile, view their assigned mentee groups, review and comment on submitted papers, schedule recurring meetings, create milestones, and post announcements. Admins can run the matching algorithm, manage all mentor and mentee accounts, override capacity limits, roll back matches, and review system logs. The matching engine operates automatically in the background — analyzing skills, scoring compatibility, running the pairing algorithm, and saving the results.

```mermaid
flowchart LR
    MenteeActor(["👤 Mentee"])
    MentorActor(["👤 Mentor"])
    AdminActor(["👤 Admin"])
    SystemActor(["⚙️ Matching Engine"])

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

    subgraph SystemUC ["Matching Engine"]
        direction TB
        UC24["Extract Keywords\n(TF-IDF, CS vocab)"]
        UC25["Score Compatibility\n(5-pillar weighted)"]
        UC26["Run Gale-Shapley\nStable Matching"]
        UC27["Verify Stability\n(blocking pair check)"]
        UC28["Persist Results\nto Database"]
    end

    MenteeActor --- UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC7b & UC8 & UC8b & UC8c
    MentorActor --- UC9 & UC10 & UC10b & UC11 & UC12 & UC13 & UC14 & UC15 & UC15b
    AdminActor --- UC16 & UC17 & UC18 & UC19 & UC20 & UC21 & UC22 & UC23
    UC16 --> SystemActor
    SystemActor --- UC24 & UC25 & UC26 & UC27 & UC28
```

---

## 3. Class Diagram

This diagram shows the data model behind the system — what information is stored and how each piece connects to the others. Every mentor and mentee group has a profile. A match connects one mentor to one mentee group, and from that match, meetings, papers, milestones, and announcements all flow. Comments are attached to submitted papers, and both sides record their ranked preferences to support the matching process. Algorithm logs capture the outcome of each matching run for admin review.

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

This diagram shows how the different parts of the system are connected and how they communicate. Users interact through a browser-based interface that routes them to the correct page and securely handles all data operations through a cloud platform, which stores accounts, profiles, matches, meetings, papers, and uploaded documents. When an admin triggers the matching process, the web application passes the request to a separate backend service, which starts the matching engine. The engine analyzes mentor and mentee profiles, scores compatibility across five factors, runs the pairing algorithm from both sides to ensure fairness, and saves the final assignments back to the database.

> **View the interactive diagram:** Open `docs/system-architecture.drawio` in [draw.io](https://app.diagrams.net) or the VS Code draw.io extension.

The diagram is organized into four horizontal layers:

| Layer | Color | What it contains |
|---|---|---|
| **Presentation** | Blue | Login Page · Mentor Dashboard · Mentee Dashboard · Admin Panel |
| **Business** | Green | Auth Module · Profile Manager · Paper Review · Meeting Scheduler · Milestone Tracker · Announcement Manager · Matching Engine pipeline |
| **Persistence** | Yellow | User Store · Match Store · Paper Store · Meeting Store · Document Store |
| **Database** | Red | Supabase Database · Supabase Auth · File Storage |

The Matching Engine row within the Business layer shows the internal pipeline: **Matching Trigger → Skill Analyzer → Domain Mapper → Compatibility Scorer → Fair Pairing Engine**, connected left to right with directional arrows.

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

The system uses **fair matching**: both variants of Gale-Shapley (Hospital-Resident) are always run, and the result with lower combined dissatisfaction is selected.

| Internal Variant | Who Proposes | Optimality |
|-----------------|-------------|-----------|
| Mentee-proposing HR | Mentees propose to mentors | Best for mentees |
| Mentor-proposing HR | Mentors propose to mentors | Best for mentors |

The final assignment is whichever variant produces **lower combined rank dissatisfaction** across both sides (average rank in each party's preference list). Stability is then verified by checking for blocking pairs — any mentor-mentee pair that would both prefer each other over their current assignments.
