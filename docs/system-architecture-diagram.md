# Fortis Nexus — System Architecture

This diagram shows how the system is organized into three tiers. User-facing pages (Presentation Tier) communicate with the application logic (Application Tier), which reads and writes data through Supabase (Data Tier). The Matching Engine is a sequential pipeline that runs inside the Application Tier and is triggered by an admin action.

---

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'fontSize': '15px', 'fontFamily': 'Segoe UI, Arial, sans-serif'}}}%%
graph LR

    %% ─── Presentation Tier ───────────────────────────────────
    subgraph PRES["  Presentation Tier  "]
        LP["Login Page"]
        MD["Mentor Dashboard"]
        TD["Mentee Dashboard"]
        AP["Admin Panel"]
    end

    %% ─── Application Tier ────────────────────────────────────
    subgraph APP["  Application Tier  "]

        subgraph CORE["  Core Services  "]
            AUTH["Auth Module"]
            MS["Meeting Scheduler"]
            MT["Milestone Tracker"]
            PR["Paper Review"]
            PM["Profile Manager"]
            AM["Announcement Manager"]
        end

        subgraph PIPELINE["  Matching Engine Pipeline  "]
            TRIG["Matching Trigger"] --> SA["Skill Analyzer"] --> DM["Domain Mapper"] --> CS["Compatibility Scorer"] --> FP["Fair Pairing Engine"]
        end

    end

    %% ─── Data Tier ───────────────────────────────────────────
    subgraph DATA["  Data Tier  "]
        SAUTH[("Supabase Auth")]
        DB[("Supabase Database")]
        FS[("File Storage")]
    end

    %% ─── Presentation → Application ─────────────────────────
    LP  --> AUTH
    MD  --> MS
    MD  --> MT
    TD  --> PR
    TD  --> PM
    AP  --> AM
    AP  --> TRIG

    %% ─── Application → Data ──────────────────────────────────
    AUTH --> SAUTH
    MS   --> DB
    MT   --> DB
    PR   --> DB
    PR   --> FS
    PM   --> DB
    AM   --> DB
    FP   --> DB

    %% ─── Node styles ─────────────────────────────────────────
    classDef presClass  fill:#DEECF9,stroke:#1565C0,color:#0D2A5C,font-weight:bold
    classDef appClass   fill:#E8F5E9,stroke:#2E7D32,color:#1B3A1F,font-weight:bold
    classDef pipeClass  fill:#E8EAF6,stroke:#283593,color:#1A237E,font-weight:bold
    classDef dataClass  fill:#F3E5F5,stroke:#6A1B9A,color:#4A148C,font-weight:bold

    class LP,MD,TD,AP            presClass
    class AUTH,MS,MT,PR,PM,AM   appClass
    class TRIG,SA,DM,CS,FP      pipeClass
    class SAUTH,DB,FS            dataClass

    %% ─── Subgraph styles ─────────────────────────────────────
    style PRES     fill:#EBF4FD,stroke:#1565C0,stroke-width:2px,color:#0D2A5C
    style APP      fill:#F1FAF2,stroke:#2E7D32,stroke-width:2px,color:#1B3A1F
    style CORE     fill:#E8F5E9,stroke:#43A047,stroke-width:1px,stroke-dasharray:4 3,color:#1B3A1F
    style PIPELINE fill:#E8EAF6,stroke:#3949AB,stroke-width:1px,stroke-dasharray:4 3,color:#1A237E
    style DATA     fill:#F9F0FD,stroke:#6A1B9A,stroke-width:2px,color:#4A148C
```

---

## Tier Summary

| Tier | Color | What it contains |
|---|---|---|
| **Presentation** | Blue | The pages users see — Login Page, Mentor Dashboard, Mentee Dashboard, Admin Panel |
| **Application — Core Services** | Green | Auth Module · Meeting Scheduler · Milestone Tracker · Paper Review · Profile Manager · Announcement Manager |
| **Application — Matching Engine** | Indigo | Sequential pipeline: Matching Trigger → Skill Analyzer → Domain Mapper → Compatibility Scorer → Fair Pairing Engine |
| **Data** | Purple | Supabase Auth · Supabase Database · File Storage |

### Key Flows

- **Login Page** authenticates through the Auth Module, which validates credentials against Supabase Auth.
- **Mentor Dashboard** schedules meetings and tracks milestones through the Meeting Scheduler and Milestone Tracker.
- **Mentee Dashboard** submits and views papers through Paper Review, and manages profile data through the Profile Manager.
- **Admin Panel** publishes announcements and triggers the Matching Engine pipeline.
- **Matching Engine** runs a five-stage pipeline — skills extraction, domain expansion, compatibility scoring, and stable pairing — then writes results to the Supabase Database.
