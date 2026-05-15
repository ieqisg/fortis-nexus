# Fortis Nexus — User Satisfaction Survey

**Standard:** ISO/IEC 25010 Software Product Quality  
**Target Respondents:** Mentor, Mentee, Admin (Sections 1–7) · External Developer Evaluator (Sections 8–9)  
**Estimated Completion Time:** 5–10 minutes (end users) · 10–15 minutes (developer evaluators)

---

## Instructions

Rate each statement using the following scale:

| Rating | Meaning |
|--------|---------|
| 5 | Strongly Agree |
| 4 | Agree |
| 3 | Neutral |
| 2 | Disagree |
| 1 | Strongly Disagree |

Items marked with a role tag apply only to that user type. Items with **All** apply to everyone.

---

## Section 1 — Functional Suitability

*The system provides functions that meet stated and implied needs.*

| # | Statement | Role |
|---|-----------|------|
| F1 | The system provides all the features I need to complete my tasks. | All |
| F2 | The matching results accurately reflect my profile and stated preferences. | Mentor, Mentee |
| F3 | The system correctly displays my assigned mentor / mentee group information. | Mentor, Mentee |
| F4 | The meeting schedule feature works as expected. | Mentor, Mentee |
| F5 | Profile completion flows guided me through all required information. | Mentor, Mentee |
| F6 | The system allows me to manage all aspects of the matching process effectively. | Admin |
| F7 | The matching algorithm results appear reasonable and appropriate. | Admin |

---

## Section 2 — Performance Efficiency

*The system responds within acceptable time and resource constraints.*

| # | Statement | Role |
|---|-----------|------|
| P1 | Pages and features load within an acceptable amount of time. | All |
| P2 | The system responds quickly when I submit forms or perform actions. | All |
| P3 | I have not experienced noticeable slowdowns while using the system. | All |
| P4 | The matching process completes in a reasonable timeframe. | Admin |

---

## Section 3 — Usability

*The system can be used by its intended users with effectiveness and satisfaction.*

| # | Statement | Sub-Characteristic | Role |
|---|-----------|-------------------|------|
| U1 | I was able to learn how to use the system quickly without extensive help. | Learnability | All |
| U2 | The navigation and layout of the system are intuitive and easy to follow. | Operability | All |
| U3 | I can complete my tasks without making frequent mistakes. | Error Protection | All |
| U4 | When I make an error, the system provides clear feedback on how to correct it. | Error Protection | All |
| U5 | The visual design of the system (colors, fonts, layout) is clean and professional. | Aesthetics | All |
| U6 | The system is usable on different screen sizes and devices. | Accessibility | All |
| U7 | The onboarding process for completing my profile was straightforward. | Learnability | Mentor, Mentee |
| U8 | Managing user accounts and running the matching algorithm is straightforward. | Operability | Admin |

---

## Section 4 — Reliability

*The system performs its functions consistently under normal conditions.*

| # | Statement | Role |
|---|-----------|------|
| R1 | The system is available and accessible whenever I need to use it. | All |
| R2 | I have not experienced unexpected errors or crashes while using the system. | All |
| R3 | My data (profile, meetings, matches) is consistently saved and displayed correctly. | Mentor, Mentee |
| R4 | The matching results remain consistent and do not change unexpectedly. | All |
| R5 | If I encountered an error, the system recovered without me losing my progress. | All |

---

## Section 5 — Security

*The system protects information and data appropriately.*

| # | Statement | Role |
|---|-----------|------|
| S1 | I feel confident that my personal information is kept private and secure. | All |
| S2 | The login and authentication process feels secure. | All |
| S3 | I can only access information relevant to my role and cannot view other users' data. | Mentor, Mentee |
| S4 | The system prevents unauthorized access to administrative functions. | Admin |
| S5 | I trust the system with the personal data I have provided. | All |

---

## Section 6 — Technology Acceptance Model (TAM)

*Measures perceived usefulness, perceived ease of use, and behavioral intention based on the Technology Acceptance Model [(Davis, 1989)](https://doi.org/10.2307/249008).*

| Rating | Meaning |
|--------|---------|
| 5 | Strongly Agree |
| 4 | Agree |
| 3 | Neutral |
| 2 | Disagree |
| 1 | Strongly Disagree |

### Perceived Usefulness (PU)

| # | Statement | Role |
|---|-----------|------|
| T1 | Using this system improves my ability to manage my thesis mentoring or research activities. | All |
| T2 | This system enhances my effectiveness in fulfilling my mentor / mentee responsibilities. | All |
| T3 | The automated matching feature saves me time compared to a manual process. | Mentor, Mentee |
| T4 | The system provides information (matches, schedules, profiles) that is useful to my work. | All |
| T5 | Overall, I find this system useful for the thesis mentoring process. | All |

### Perceived Ease of Use (PEoU)

| # | Statement | Role |
|---|-----------|------|
| T6 | Learning to use this system was easy for me. | All |
| T7 | I find the system easy to navigate without needing assistance. | All |
| T8 | Interacting with this system does not require excessive mental effort. | All |
| T9 | It is easy for me to become proficient at using this system. | All |

### Behavioral Intention to Use (BI)

| # | Statement | Role |
|---|-----------|------|
| T10 | I intend to continue using this system throughout the semester. | All |
| T11 | I would recommend this system to other mentors / mentees. | All |
| T12 | I am willing to use this system again in future semesters. | All |

---

## Section 7 — Open-Ended Questions

Please answer briefly in your own words.

1. What feature of the system did you find most useful?

   _________________________________________________________________________

2. What aspect of the system was most difficult to use or understand?

   _________________________________________________________________________

3. What improvements or additional features would you suggest?

   _________________________________________________________________________

---

## Section 8 — Maintainability

*The degree to which the system can be modified to correct, improve, or adapt it. Intended for external developer evaluators.*

Rate each statement using the 1–5 scale defined in the Instructions.

| # | Statement | Sub-Characteristic |
|---|-----------|-------------------|
| M1 | The codebase is organized into clearly separated modules or layers that can be understood independently. | Modularity |
| M2 | Existing components (e.g., UI components, server actions, algorithm stages) appear reusable across different parts of the system. | Reusability |
| M3 | I can identify where a given feature or behavior is implemented without excessive difficulty. | Analysability |
| M4 | The separation of concerns between the frontend, backend, and matching algorithm is clear and logical. | Analysability |
| M5 | Making changes to one part of the system is unlikely to introduce unintended side effects in unrelated parts. | Modifiability |
| M6 | The code follows consistent naming conventions and style that make it readable to a new developer. | Analysability |
| M7 | The system's test coverage is sufficient to verify that changes do not introduce regressions. | Testability |
| M8 | The project documentation (CLAUDE.md, inline comments, architecture notes) adequately supports developer onboarding. | Analysability |

---

## Section 9 — Portability

*The degree to which the system can be transferred to and used in different environments. Intended for external developer evaluators.*

| # | Statement | Sub-Characteristic |
|---|-----------|-------------------|
| Po1 | The installation and local setup process is clearly documented and can be followed without prior system knowledge. | Installability |
| Po2 | The system's dependencies and runtime configuration are well-isolated (e.g., via environment variables, virtual environments). | Adaptability |
| Po3 | The system could be adapted to run in a different hosting environment without significant rework. | Adaptability |
| Po4 | Individual components (e.g., the database, auth provider, or matching algorithm) could be replaced with alternatives without requiring a full rewrite. | Replaceability |
| Po5 | The Python matching pipeline is portable and can be run independently of the Next.js/Express layer. | Adaptability |

---

## Item Summary by Role

| Role | Applicable Items | Total Items |
|------|-----------------|-------------|
| Mentor | F1–F5, P1–P3, U1–U7, R1–R5, S1–S3, S5, T1–T12 + open-ended | 34 + 3 |
| Mentee | F1–F5, P1–P3, U1–U7, R1–R5, S1–S3, S5, T1–T12 + open-ended | 34 + 3 |
| Admin | F1, F6–F7, P1–P4, U1–U6, U8, R1–R2, R4–R5, S1–S2, S4–S5, T1–T2, T4–T12 + open-ended | 31 + 3 |
| Developer Evaluator | M1–M8, Po1–Po5 + open-ended | 13 + 3 |

---

## ISO/IEC 25010 Characteristic Mapping

| Characteristic | Items | Sub-Characteristics Covered | Respondents |
|----------------|-------|-----------------------------|-------------|
| Functional Suitability | F1–F7 | Functional Completeness, Correctness, Appropriateness | End users |
| Performance Efficiency | P1–P4 | Time Behaviour, Capacity | End users |
| Usability | U1–U8 | Learnability, Operability, Error Protection, Aesthetics, Accessibility | End users |
| Reliability | R1–R5 | Availability, Fault Tolerance, Recoverability | End users |
| Security | S1–S5 | Confidentiality, Integrity, Authenticity | End users |
| Maintainability | M1–M8 | Modularity, Reusability, Analysability, Modifiability, Testability | Developer Evaluators |
| Portability | Po1–Po5 | Adaptability, Installability, Replaceability | Developer Evaluators |

## TAM Construct Mapping

| Construct | Items | Definition [(Davis, 1989)](https://doi.org/10.2307/249008) |
|-----------|-------|-------------------------------------------------------------|
| Perceived Usefulness (PU) | T1–T5 | Degree to which the user believes the system enhances their performance |
| Perceived Ease of Use (PEoU) | T6–T9 | Degree to which the user believes the system is free of effort |
| Behavioral Intention to Use (BI) | T10–T12 | Likelihood that the user will continue or recommend the system |

> **Reference:** Davis, F.D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. *MIS Quarterly*, 13(3), 319–340. https://doi.org/10.2307/249008
