# Fortis Nexus — Developer Professional Survey

**Standard:** ISO/IEC 25010 Software Product Quality  
**Target Respondents:** External Developer Evaluators / Technical Reviewers  
**Estimated Completion Time:** 15–20 minutes

---

## Instructions

Evaluate the system based on its observable behavior, architecture, and quality characteristics. Rate each statement using the scale below.

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
| M1 | The system is composed of clearly distinct components (e.g., user interface, data processing, matching engine) that operate independently. |
| M2 | A failure or change in one component of the system does not cascade unexpectedly into other components. |
| M3 | Each component of the system serves a well-defined purpose with minimal overlap in responsibility. |

### 1.2 Reusability

*Degree to which an asset can be used in more than one system, or in building other assets.*

| # | Statement |
|---|-----------|
| M4 | System components appear designed in a way that would allow them to be reused in a related or future system. |
| M5 | Common system behaviors (e.g., authentication, profile management) are handled consistently across different parts of the system. |
| M6 | The system avoids duplicating logic by consolidating shared behavior into reusable parts. |

### 1.3 Analysability

*Degree of effectiveness and efficiency to assess the impact of an intended change, and to diagnose deficiencies or causes of failures.*

| # | Statement |
|---|-----------|
| M7 | When the system encounters an error, it provides clear and informative feedback that helps identify the cause. |
| M8 | The system's behavior is predictable enough that the impact of a proposed change can be assessed with confidence. |
| M9 | System logs and diagnostic information are sufficient to trace the source of a problem. |
| M10 | The overall structure of the system makes it straightforward to locate where a specific function or behavior originates. |

### 1.4 Modifiability

*Degree to which a product or system can be effectively and efficiently modified without introducing defects or degrading existing product quality.*

| # | Statement |
|---|-----------|
| M11 | Modifying one part of the system is unlikely to break unrelated features. |
| M12 | The system appears designed to accommodate new features or requirements without requiring major structural changes. |
| M13 | System configuration (e.g., environments, parameters) can be changed without altering core system behavior. |

### 1.5 Testability

*Degree of effectiveness and efficiency with which test criteria can be established and tests can be performed to determine whether criteria have been met.*

| # | Statement |
|---|-----------|
| M14 | The system's components can be evaluated individually to verify they behave as intended. |
| M15 | The system produces consistent and verifiable outputs that make it straightforward to confirm correctness. |
| M16 | The system's behavior under various inputs is predictable and can be validated through systematic testing. |

---

## Section 2 — Portability (ISO/IEC 25010, §4.8)

*Degree of effectiveness and efficiency with which the system can be transferred from one environment to another.*

### 2.1 Adaptability

*Degree to which the system can effectively be adapted for different or evolving operational or usage environments.*

| # | Statement |
|---|-----------|
| Po1 | The system can be configured to operate in different environments (e.g., development, staging, production) without changes to its core functionality. |
| Po2 | The system's behavior adapts appropriately when deployed in a different hosting or infrastructure environment. |
| Po3 | The matching engine operates independently of the web interface, making it possible to run each component in a different environment. |
| Po4 | The system's configuration options are sufficient to tailor its behavior to different institutional or operational contexts. |

### 2.2 Installability

*Degree of effectiveness and efficiency with which the system can be successfully installed and set up in a specified environment.*

| # | Statement |
|---|-----------|
| Po5 | The system can be set up in a new environment without requiring specialized prior knowledge of its internals. |
| Po6 | All required services, runtime dependencies, and configuration steps for the system are clearly defined and straightforward to provision. |
| Po7 | The system reaches a functional state consistently following the documented setup steps. |

### 2.3 Replaceability

*Degree to which the system can replace another specified system for the same purpose in the same environment.*

| # | Statement |
|---|-----------|
| Po8 | The system could replace a manual or spreadsheet-based mentor-mentee matching process without loss of essential functionality. |
| Po9 | Individual system services (e.g., database, authentication, matching algorithm) could be substituted with equivalent alternatives without requiring a complete rebuild. |
| Po10 | The system's integration points are defined in a way that allows external components to be swapped out as technology evolves. |

---

## Section 3 — Functional Suitability (ISO/IEC 25010, §4.1)

*Degree to which the system provides functions that meet stated and implied needs.*

| # | Statement | Sub-Characteristic |
|---|-----------|-------------------|
| FS1 | The system covers all the core functions required for mentor-mentee matching (profile management, matching, scheduling, and administration). | Functional Completeness |
| FS2 | The matching results produced by the system are accurate and consistent with the stated algorithm and inputs. | Functional Correctness |
| FS3 | The system produces correct outputs even when given varied or edge-case inputs. | Functional Correctness |
| FS4 | The features provided by the system are appropriate and proportional to the needs of a thesis mentoring program — neither over-engineered nor lacking. | Functional Appropriateness |
| FS5 | The system's outputs (match assignments, compatibility scores, audit trail) align with what is expected from the described algorithm. | Functional Correctness |

---

## Section 4 — Performance Efficiency (ISO/IEC 25010, §4.2)

*Degree to which the system performs its functions within stated time, resource, and capacity constraints.*

| # | Statement | Sub-Characteristic |
|---|-----------|-------------------|
| PE1 | The system responds to user interactions within an acceptable timeframe. | Time Behaviour |
| PE2 | The matching process completes within a reasonable time given the expected number of participants. | Time Behaviour |
| PE3 | The system uses computational resources (processing, memory, network) proportional to the complexity of the task performed. | Resource Utilization |
| PE4 | Long-running operations (such as the matching algorithm) do not noticeably degrade the responsiveness of other system features. | Resource Utilization |
| PE5 | The system can handle the expected number of concurrent users without performance degradation. | Capacity |

---

## Section 5 — Security (ISO/IEC 25010, §4.6)

*Degree to which the system protects information and data and prevents unauthorized access.*

| # | Statement | Sub-Characteristic |
|---|-----------|-------------------|
| SE1 | The system grants access only to users who have been properly authenticated. | Authenticity |
| SE2 | Users can access only the data and functions appropriate to their assigned role. | Confidentiality |
| SE3 | The system prevents one user from viewing or modifying another user's private information. | Confidentiality |
| SE4 | The system rejects unauthorized attempts to access restricted features or administrative functions. | Integrity |
| SE5 | Sensitive information is not exposed through system responses, error messages, or interface elements. | Confidentiality |
| SE6 | The system maintains the integrity of stored data and prevents unauthorized modification. | Integrity |

---

## Section 6 — Open-Ended Questions

Please answer briefly in your own words.

1. Which aspect of the system did you find most well-designed from a technical standpoint, and why?

   _________________________________________________________________________

2. Which part of the system would be most difficult to maintain or extend over time, and why?

   _________________________________________________________________________

3. What performance or security concerns, if any, did you observe while evaluating the system?

   _________________________________________________________________________

4. What improvements would you recommend to enhance the system's overall technical quality?

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
