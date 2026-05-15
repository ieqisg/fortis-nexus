# Fortis Nexus — Developer Professional Survey

**Standard:** ISO/IEC 25010 Software Product Quality  
**Target Respondents:** External Developer Evaluators / Technical Reviewers  
**Estimated Completion Time:** 15–20 minutes

---

## Instructions

Evaluate the system from a technical perspective based on code review, project documentation, and system architecture. Rate each statement using the scale below.

| Rating | Meaning |
|--------|---------|
| 5 | Strongly Agree |
| 4 | Agree |
| 3 | Neutral |
| 2 | Disagree |
| 1 | Strongly Disagree |

---

## Section 1 — Maintainability (ISO/IEC 25010, §4.7)

*Degree to which the system can be modified to correct, improve, or adapt it to changes in environment and requirements.*

### 1.1 Modularity

*Degree to which the system is composed of discrete components such that a change to one component has minimal impact on other components.*

| # | Statement |
|---|-----------|
| M1 | The codebase is organized into clearly separated modules or layers that can be understood independently. |
| M2 | The separation of concerns between the frontend (Next.js), backend (Express), and matching algorithm (Python) is clear and logical. |
| M3 | Each module or layer has a well-defined responsibility with minimal overlap with others. |

### 1.2 Reusability

*Degree to which an asset can be used in more than one system, or in building other assets.*

| # | Statement |
|---|-----------|
| M4 | Existing components (e.g., UI components, server actions, algorithm stages) appear reusable across different parts of the system. |
| M5 | Common patterns and utilities are appropriately abstracted to avoid code duplication. |
| M6 | Shared interfaces and types are defined in a way that supports reuse across the application layers. |

### 1.3 Analysability

*Degree of effectiveness and efficiency to assess the impact on a product or system of an intended change to one or more of its parts, and to diagnose a product for deficiencies or causes of failures.*

| # | Statement |
|---|-----------|
| M7 | I can identify where a given feature or behavior is implemented without excessive difficulty. |
| M8 | The code follows consistent naming conventions and style that make it readable to a new developer. |
| M9 | The project documentation (CLAUDE.md, inline comments, architecture notes) adequately supports developer onboarding. |
| M10 | Error messages and system logs provide sufficient information to diagnose issues effectively. |

### 1.4 Modifiability

*Degree to which a product or system can be effectively and efficiently modified without introducing defects or degrading existing product quality.*

| # | Statement |
|---|-----------|
| M11 | Making changes to one part of the system is unlikely to introduce unintended side effects in unrelated parts. |
| M12 | The system's architecture allows new features to be added with minimal disruption to existing code. |
| M13 | Configuration and environment settings are managed in a way that makes them easy to change across environments. |

### 1.5 Testability

*Degree of effectiveness and efficiency with which test criteria can be established for a system, product, or component, and tests can be performed to determine whether those criteria have been met.*

| # | Statement |
|---|-----------|
| M14 | The system's test coverage is sufficient to verify that changes do not introduce regressions. |
| M15 | The codebase structure facilitates unit testing and integration testing without excessive setup. |
| M16 | Test cases clearly reflect the intended behavior of the components they cover. |

---

## Section 2 — Portability (ISO/IEC 25010, §4.8)

*Degree of effectiveness and efficiency with which a system, product, or component can be transferred from one hardware, software, or other operational or usage environment to another.*

### 2.1 Adaptability

*Degree to which a product or system can effectively and efficiently be adapted for different or evolving hardware, software, or other operational or usage environments.*

| # | Statement |
|---|-----------|
| Po1 | The system's dependencies and runtime configuration are well-isolated (e.g., via environment variables, virtual environments). |
| Po2 | The system could be adapted to run in a different hosting environment without significant rework. |
| Po3 | The Python matching pipeline is portable and can be run independently of the Next.js/Express layer. |
| Po4 | The use of environment variables and configuration files makes it straightforward to adjust the system for different deployment targets. |

### 2.2 Installability

*Degree of effectiveness and efficiency with which a product or system can be successfully installed and/or uninstalled in a specified environment.*

| # | Statement |
|---|-----------|
| Po5 | The installation and local setup process is clearly documented and can be followed without prior system-specific knowledge. |
| Po6 | The required tools, runtimes, and dependencies are clearly specified and straightforward to install. |
| Po7 | Setup steps are sequenced logically and free of ambiguity that would block a new developer. |

### 2.3 Replaceability

*Degree to which a product can replace another specified software product for the same purpose in the same environment.*

| # | Statement |
|---|-----------|
| Po8 | Individual components (e.g., the database, authentication provider, or matching algorithm) could be replaced with alternatives without requiring a full rewrite. |
| Po9 | The system uses standard interfaces and protocols that facilitate component replacement. |
| Po10 | The database access layer (server actions) abstracts Supabase in a way that would allow migrating to a different database with limited changes. |

---

## Section 3 — Functional Suitability (ISO/IEC 25010, §4.1)

*Evaluated from a technical and architectural perspective through code review.*

| # | Statement | Sub-Characteristic |
|---|-----------|-------------------|
| FS1 | The system implements all specified core features (matching, profile management, scheduling, admin controls). | Functional Completeness |
| FS2 | The matching algorithm correctly implements the Gale-Shapley stable matching with TF-IDF scoring as described in the system documentation. | Functional Correctness |
| FS3 | The system's outputs (match results, compatibility scores, audit logs) align with expected algorithmic behavior. | Functional Correctness |
| FS4 | The feature set is appropriate and proportional to the thesis mentor-mentee matching use case without unnecessary complexity. | Functional Appropriateness |
| FS5 | The algorithm's scoring pipeline (keyword extraction, TF-IDF vectorization, weighted combination) is implemented accurately relative to its specification. | Functional Correctness |

---

## Section 4 — Performance Efficiency (ISO/IEC 25010, §4.2)

*Evaluated from a code and architecture perspective through code review.*

| # | Statement | Sub-Characteristic |
|---|-----------|-------------------|
| PE1 | The system architecture supports efficient data retrieval and processing. | Time Behaviour |
| PE2 | Database queries and API calls appear optimized to avoid unnecessary overhead (e.g., no N+1 query patterns). | Resource Utilization |
| PE3 | The matching algorithm's time complexity is appropriate and well-justified for the expected data scale. | Capacity |
| PE4 | Resource-intensive operations (e.g., matching runs) are appropriately isolated from real-time user interactions. | Resource Utilization |
| PE5 | The system avoids holding unnecessary resources (memory, connections) longer than required. | Resource Utilization |

---

## Section 5 — Security (ISO/IEC 25010, §4.6)

*Evaluated from a technical review perspective.*

| # | Statement | Sub-Characteristic |
|---|-----------|-------------------|
| SE1 | Authentication and session management follow current security best practices (e.g., short-lived tokens, secure cookie handling). | Authenticity |
| SE2 | Role-based access control is correctly enforced at the API and middleware level, preventing privilege escalation. | Confidentiality |
| SE3 | Sensitive data (credentials, tokens, personal information) is handled appropriately in code and configuration. | Confidentiality |
| SE4 | The codebase does not contain obvious security vulnerabilities (e.g., SQL injection, XSS, insecure direct object references). | Integrity |
| SE5 | Environment secrets are properly managed and not exposed in the codebase or version history. | Confidentiality |
| SE6 | Server-side validation is applied at appropriate boundaries to prevent malformed or malicious input. | Integrity |

---

## Section 6 — Open-Ended Questions

Please answer briefly in your own words.

1. Which part of the system architecture did you find most well-designed, and why?

   _________________________________________________________________________

2. Which part of the system would be most difficult to maintain or extend over time, and why?

   _________________________________________________________________________

3. What security or performance concerns, if any, did you identify during your review?

   _________________________________________________________________________

4. What architectural improvements would you suggest for future development?

   _________________________________________________________________________

---

## ISO/IEC 25010 Characteristic Mapping

| Characteristic | Items | Sub-Characteristics Covered |
|----------------|-------|-----------------------------|
| Maintainability | M1–M16 | Modularity, Reusability, Analysability, Modifiability, Testability |
| Portability | Po1–Po10 | Adaptability, Installability, Replaceability |
| Functional Suitability | FS1–FS5 | Functional Completeness, Functional Correctness, Functional Appropriateness |
| Performance Efficiency | PE1–PE5 | Time Behaviour, Resource Utilization, Capacity |
| Security | SE1–SE6 | Authenticity, Confidentiality, Integrity |

---

## Item Summary

| Section | Items | Count |
|---------|-------|-------|
| Section 1 — Maintainability | M1–M16 | 16 |
| Section 2 — Portability | Po1–Po10 | 10 |
| Section 3 — Functional Suitability | FS1–FS5 | 5 |
| Section 4 — Performance Efficiency | PE1–PE5 | 5 |
| Section 5 — Security | SE1–SE6 | 6 |
| Section 6 — Open-Ended | 4 questions | 4 |
| **Total** | | **42 rated items + 4 open-ended** |
