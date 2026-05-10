# Fortis Nexus — User Satisfaction Survey

**Standard:** ISO/IEC 25010 Software Product Quality  
**Target Respondents:** Mentor, Mentee, Admin  
**Estimated Completion Time:** 5–10 minutes

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

## Section 6 — Open-Ended Questions

Please answer briefly in your own words.

1. What feature of the system did you find most useful?

   _________________________________________________________________________

2. What aspect of the system was most difficult to use or understand?

   _________________________________________________________________________

3. What improvements or additional features would you suggest?

   _________________________________________________________________________

---

## Item Summary by Role

| Role | Applicable Items | Total Items |
|------|-----------------|-------------|
| Mentor | F1–F5, P1–P3, U1–U7, R1–R5, S1–S3, S5 + open-ended | 22 + 3 |
| Mentee | F1–F5, P1–P3, U1–U7, R1–R5, S1–S3, S5 + open-ended | 22 + 3 |
| Admin | F1, F6–F7, P1–P4, U1–U6, U8, R1–R2, R4–R5, S1–S2, S4–S5 + open-ended | 20 + 3 |

---

## ISO/IEC 25010 Characteristic Mapping

| Characteristic | Items | Sub-Characteristics Covered |
|----------------|-------|-----------------------------|
| Functional Suitability | F1–F7 | Functional Completeness, Correctness, Appropriateness |
| Performance Efficiency | P1–P4 | Time Behaviour, Capacity |
| Usability | U1–U8 | Learnability, Operability, Error Protection, Aesthetics, Accessibility |
| Reliability | R1–R5 | Availability, Fault Tolerance, Recoverability |
| Security | S1–S5 | Confidentiality, Integrity, Authenticity |

> **Note:** Maintainability and Portability are developer-facing characteristics and are not included in end-user surveys.
