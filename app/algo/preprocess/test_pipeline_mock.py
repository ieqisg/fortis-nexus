"""
test_pipeline_mock.py

Full pipeline mock test — scoring → preference generation → HR matching → fairness → results.

5 mentors (12 total capacity) × 10 mentee groups with clearly distinct specializations.
Expected matches are predictable: each mentee should match their closest-domain mentor.

Run from the preprocess directory:
    cd app/algo/preprocess && python test_pipeline_mock.py
"""

import sys

# ── Mock Mentors ──────────────────────────────────────────────────────────────

MENTORS = [
    {
        "id": "m1",
        "first_name": "Ana", "last_name": "Reyes",
        "technical_skills": ["machine learning", "nlp", "python", "tensorflow"],
        "forte": ["natural language processing", "sentiment analysis", "text mining"],
        "self_description": (
            "I specialize in machine learning and natural language processing. "
            "My research focuses on sentiment analysis, text classification, and language models."
        ),
        "available_days": ["Monday", "Wednesday"],
        "time_slot": ["9:00-10:00", "10:00-11:00"],
        "communication_preference": "ONLINE_CHAT",
        "prior_mentees_count": 4,
        "prev_mentored_thesis": [
            "Sentiment Analysis of Social Media Posts using BERT",
            "Text Classification System for Academic Research Papers",
        ],
        "published_papers": [
            {"title": "Deep Learning Approaches for Tagalog Sentiment Analysis", "year": "2023"},
            {"title": "Transfer Learning for Low-Resource NLP Tasks", "year": "2022"},
        ],
        "certifications": ["Google ML Professional", "DeepLearning.AI"],
        "mentor_capacity": 2,
    },
    {
        "id": "m2",
        "first_name": "Ben", "last_name": "Cruz",
        "technical_skills": ["web development", "javascript", "react", "node.js", "postgresql", "rest api"],
        "forte": ["software engineering", "database design", "full stack development"],
        "self_description": (
            "Full-stack web developer with expertise in database design and software engineering. "
            "I guide students in building scalable web applications with modern frameworks."
        ),
        "available_days": ["Tuesday", "Thursday", "Friday"],
        "time_slot": ["12:00-13:00", "13:00-14:00"],
        "communication_preference": "FACE_TO_FACE",
        "prior_mentees_count": 6,
        "prev_mentored_thesis": [
            "E-Commerce Platform with Real-Time Inventory Management",
            "Web-Based Human Resource Information System",
            "Online Enrollment System with Analytics Dashboard",
        ],
        "published_papers": [
            {"title": "Performance Optimization Techniques for REST API Design", "year": "2022"},
            {"title": "Database Sharding Strategies for Web-Scale Applications", "year": "2021"},
        ],
        "certifications": ["AWS Developer", "MongoDB Certified"],
        "mentor_capacity": 3,
    },
    {
        "id": "m3",
        "first_name": "Carol", "last_name": "Tan",
        "technical_skills": ["algorithms", "data structures", "graph theory", "python", "c++"],
        "forte": ["algorithm design", "computational complexity", "combinatorial optimization"],
        "self_description": (
            "My research is in algorithm design and combinatorial optimization, "
            "including stable matching, graph algorithms, and competitive programming."
        ),
        "available_days": ["Monday", "Tuesday"],
        "time_slot": ["7:00-8:00", "12:00-13:00"],
        "communication_preference": "FACE_TO_FACE",
        "prior_mentees_count": 3,
        "prev_mentored_thesis": [
            "Gale-Shapley Stable Matching for University Course Allocation",
            "Shortest Path Algorithms for Public Transport Network Optimization",
        ],
        "published_papers": [
            {"title": "Efficient Implementation of Hospital-Resident Stable Matching", "year": "2023"},
            {"title": "Graph Coloring Heuristics for Examination Scheduling", "year": "2022"},
        ],
        "certifications": [],
        "mentor_capacity": 2,
    },
    {
        "id": "m4",
        "first_name": "Dave", "last_name": "Santos",
        "technical_skills": ["flutter", "android", "ios", "firebase", "iot", "arduino"],
        "forte": ["mobile development", "cross-platform apps", "embedded systems", "iot"],
        "self_description": (
            "Expert in cross-platform mobile development using Flutter and native Android/iOS. "
            "Also experienced in IoT systems, embedded firmware, and sensor integration."
        ),
        "available_days": ["Wednesday", "Thursday"],
        "time_slot": ["13:00-14:00", "14:00-15:00"],
        "communication_preference": "ONLINE_CHAT",
        "prior_mentees_count": 5,
        "prev_mentored_thesis": [
            "Smart Attendance System Using RFID and Mobile Application",
            "IoT-Based Greenhouse Monitoring and Automation System",
        ],
        "published_papers": [
            {"title": "Cross-Platform Mobile Development: Flutter vs React Native Performance Study", "year": "2023"},
            {"title": "Real-Time IoT Data Streaming with MQTT Protocol", "year": "2022"},
        ],
        "certifications": ["Flutter Certified Developer"],
        "mentor_capacity": 2,
    },
    {
        "id": "m5",
        "first_name": "Eve", "last_name": "Lagman",
        "technical_skills": ["computer vision", "image processing", "deep learning", "pytorch", "opencv"],
        "forte": ["object detection", "image classification", "convolutional neural networks"],
        "self_description": (
            "I research computer vision systems including object detection, image segmentation, "
            "and medical imaging. My work applies deep learning and CNNs to real-world visual tasks."
        ),
        "available_days": ["Monday", "Wednesday", "Friday"],
        "time_slot": ["9:00-10:00", "14:00-15:00"],
        "communication_preference": "ONLINE_CHAT",
        "prior_mentees_count": 5,
        "prev_mentored_thesis": [
            "Real-Time Face Recognition System for Campus Access Control",
            "Automated Plant Disease Detection Using Convolutional Neural Networks",
            "Traffic Density Estimation Using YOLO Object Detection",
        ],
        "published_papers": [
            {"title": "Lightweight CNN Architecture for Mobile Object Detection", "year": "2023"},
            {"title": "Transfer Learning for Medical Image Segmentation", "year": "2022"},
            {"title": "Optimized YOLO Variants for Real-Time Detection on Edge Devices", "year": "2021"},
        ],
        "certifications": ["NVIDIA Deep Learning Certificate", "OpenCV Developer"],
        "mentor_capacity": 3,
    },
]

# ── Mock Mentee Groups ────────────────────────────────────────────────────────

MENTEES = [
    {
        "id": "g1",
        "group_name": "SentiBot",
        "research_title": "SentiBot: NLP-Based Sentiment Analysis Chatbot for Student Feedback",
        "research_description": (
            "This study develops a chatbot using natural language processing and machine learning "
            "to analyze student feedback from online surveys. The system classifies sentiments "
            "as positive, negative, or neutral using transformer-based language models."
        ),
        "mentor_preference": (
            "Looking for a mentor with expertise in natural language processing, machine learning, "
            "sentiment analysis, text classification, and python. Experience with NLP frameworks "
            "such as BERT or transformer models is highly preferred."
        ),
        "available_days": ["Monday", "Wednesday"],
        "time_slot": ["9:00-10:00"],
        "communication_preference": "ONLINE_CHAT",
    },
    {
        "id": "g2",
        "group_name": "ShopEase",
        "research_title": "ShopEase: E-Commerce Web Application with Real-Time Inventory and Analytics",
        "research_description": (
            "A full-stack e-commerce web application built with React and Node.js, featuring "
            "real-time inventory management, order tracking, and sales analytics dashboards. "
            "The backend uses REST APIs and PostgreSQL for data management."
        ),
        "mentor_preference": (
            "Looking for a mentor with expertise in web development, software engineering, "
            "REST API design, database management, and full stack development. Familiarity "
            "with React, Node.js, and PostgreSQL is preferred."
        ),
        "available_days": ["Tuesday", "Thursday"],
        "time_slot": ["12:00-13:00"],
        "communication_preference": "FACE_TO_FACE",
    },
    {
        "id": "g3",
        "group_name": "MatchSys",
        "research_title": "MatchSys: Gale-Shapley Stable Matching for Academic Thesis Adviser Allocation",
        "research_description": (
            "This research implements the Gale-Shapley algorithm (hospital-resident version) "
            "to create stable and fair adviser-student pairings in academic settings. "
            "The system uses combinatorial optimization and graph-based preference ranking."
        ),
        "mentor_preference": (
            "Looking for a mentor with expertise in algorithms, stable matching, graph theory, "
            "data structures, and combinatorial optimization. Experience with the Gale-Shapley "
            "algorithm or similar stable matching algorithms is essential."
        ),
        "available_days": ["Monday", "Tuesday"],
        "time_slot": ["7:00-8:00"],
        "communication_preference": "FACE_TO_FACE",
    },
    {
        "id": "g4",
        "group_name": "HealthTrack",
        "research_title": "HealthTrack: Flutter-Based Mobile Application for Student Health Monitoring",
        "research_description": (
            "A cross-platform mobile application built with Flutter that allows students "
            "to track their health metrics including heart rate, sleep patterns, and physical activity. "
            "The app integrates with IoT wearable sensors via Bluetooth."
        ),
        "mentor_preference": (
            "Looking for a mentor with expertise in Flutter mobile development, cross-platform apps, "
            "IoT integration, and Firebase. Experience with Bluetooth sensor data and health applications "
            "is preferred."
        ),
        "available_days": ["Wednesday", "Thursday"],
        "time_slot": ["13:00-14:00"],
        "communication_preference": "ONLINE_CHAT",
    },
    {
        "id": "g5",
        "group_name": "MedVision",
        "research_title": "MedVision: Deep Learning System for Automated Medical Image Classification",
        "research_description": (
            "This study develops a convolutional neural network model to classify chest X-ray images "
            "into normal, pneumonia, and COVID-19 categories. The system uses transfer learning "
            "from pre-trained CNN architectures and image processing techniques."
        ),
        "mentor_preference": (
            "Looking for a mentor with expertise in computer vision, deep learning, "
            "image classification, convolutional neural networks, and medical imaging. "
            "Experience with PyTorch and transfer learning is preferred."
        ),
        "available_days": ["Monday", "Wednesday"],
        "time_slot": ["9:00-10:00"],
        "communication_preference": "ONLINE_CHAT",
    },
    {
        "id": "g6",
        "group_name": "GradePortal",
        "research_title": "GradePortal: Web-Based Grade Management and Analytics System",
        "research_description": (
            "A web application for managing student grades with automated GPA computation, "
            "grade analytics, and report generation. Built using React frontend and Node.js backend "
            "with a PostgreSQL database and REST API architecture."
        ),
        "mentor_preference": (
            "Looking for a mentor with expertise in web development, database design, "
            "software engineering, and REST API development. Familiarity with full-stack "
            "JavaScript development is required."
        ),
        "available_days": ["Tuesday", "Friday"],
        "time_slot": ["12:00-13:00"],
        "communication_preference": "FACE_TO_FACE",
    },
    {
        "id": "g7",
        "group_name": "GraphNet",
        "research_title": "GraphNet: Graph Algorithm-Based Social Network Analysis System",
        "research_description": (
            "This research applies graph theory algorithms including BFS, DFS, Dijkstra, "
            "and community detection to analyze social network structures. The system identifies "
            "influential nodes, shortest communication paths, and cluster formations."
        ),
        "mentor_preference": (
            "Looking for a mentor with expertise in graph theory, algorithms, data structures, "
            "and network analysis. Experience with computational complexity and graph algorithms "
            "such as Dijkstra and community detection is preferred."
        ),
        "available_days": ["Monday", "Tuesday"],
        "time_slot": ["12:00-13:00"],
        "communication_preference": "FACE_TO_FACE",
    },
    {
        "id": "g8",
        "group_name": "SmartHome",
        "research_title": "SmartHome: IoT-Based Home Automation System with Mobile Control",
        "research_description": (
            "An IoT-based smart home automation system using Arduino microcontrollers and sensors "
            "to control lighting, temperature, and security. Controlled via a Flutter mobile app "
            "using MQTT protocol for real-time device communication."
        ),
        "mentor_preference": (
            "Looking for a mentor with expertise in IoT, embedded systems, Arduino, mobile development, "
            "and Flutter. Experience with sensor networks, MQTT protocol, and home automation "
            "systems is required."
        ),
        "available_days": ["Wednesday", "Thursday"],
        "time_slot": ["14:00-15:00"],
        "communication_preference": "ONLINE_CHAT",
    },
    {
        "id": "g9",
        "group_name": "MLAdvisor",
        "research_title": "MLAdvisor: Machine Learning System for Academic Performance Prediction",
        "research_description": (
            "This study builds a machine learning model to predict student academic performance "
            "using features such as attendance, study habits, and prior grades. "
            "The system uses supervised learning algorithms including random forest and gradient boosting."
        ),
        "mentor_preference": (
            "Looking for a mentor with expertise in machine learning, supervised learning, "
            "python, data science, and feature engineering. Experience with scikit-learn, "
            "random forest, and predictive modeling is preferred."
        ),
        "available_days": ["Monday", "Wednesday"],
        "time_slot": ["10:00-11:00"],
        "communication_preference": "ONLINE_CHAT",
    },
    {
        "id": "g10",
        "group_name": "CampusCam",
        "research_title": "CampusCam: Real-Time Object Detection System for Campus Security Monitoring",
        "research_description": (
            "A real-time object detection system using YOLO and OpenCV to monitor campus "
            "security cameras and detect unauthorized access, unattended bags, and crowd density. "
            "The system uses deep learning and computer vision techniques."
        ),
        "mentor_preference": (
            "Looking for a mentor with expertise in computer vision, object detection, "
            "deep learning, YOLO, and OpenCV. Experience with real-time video processing "
            "and convolutional neural networks is required."
        ),
        "available_days": ["Monday", "Wednesday", "Friday"],
        "time_slot": ["9:00-10:00"],
        "communication_preference": "ONLINE_CHAT",
    },
]

# Expected matches: mentee_id → mentor_id (based on domain alignment)
EXPECTED = {
    "g1":  "m1",   # SentiBot (NLP/ML)         → Ana Reyes (ML/NLP)
    "g2":  "m2",   # ShopEase (Web Dev)         → Ben Cruz (Web Dev)
    "g3":  "m3",   # MatchSys (Algorithms)      → Carol Tan (Algorithms)
    "g4":  "m4",   # HealthTrack (Flutter/IoT)  → Dave Santos (Mobile/IoT)
    "g5":  "m5",   # MedVision (CV/DL)          → Eve Lagman (CV)
    "g6":  "m2",   # GradePortal (Web Dev)      → Ben Cruz (Web Dev)
    "g7":  "m3",   # GraphNet (Graph Algorithms)→ Carol Tan (Algorithms)
    "g8":  "m4",   # SmartHome (IoT/Mobile)     → Dave Santos (Mobile/IoT)
    "g9":  "m1",   # MLAdvisor (ML)             → Ana Reyes (ML/NLP)
    "g10": "m5",   # CampusCam (CV/Object Det.) → Eve Lagman (CV)
}

MENTOR_NAMES = {m["id"]: f"{m['first_name']} {m['last_name']}" for m in MENTORS}
MENTEE_NAMES = {m["id"]: m["group_name"] for m in MENTEES}

# ── Helpers ───────────────────────────────────────────────────────────────────

PASS = "✓"
FAIL = "✗"
errors = []

def check(label: str, condition: bool, detail: str = "") -> None:
    status = PASS if condition else FAIL
    print(f"  {status} {label}" + (f"  [{detail}]" if detail else ""))
    if not condition:
        errors.append(f"{label}: {detail}")

# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    from scoring import compute_weighted_scores, ScoringWeights
    from matching import generate_preferences, run_matching

    print("=" * 70)
    print("  Full Matching Pipeline — Mock Data Test")
    print(f"  {len(MENTORS)} mentors  ×  {len(MENTEES)} mentee groups")
    print("=" * 70)

    # ── Step 1: Scoring ───────────────────────────────────────────────────────
    print("\n📊 Step 1: Computing compatibility scores...")
    scores, breakdowns = compute_weighted_scores(MENTORS, MENTEES, return_breakdowns=True)

    # Print score matrix
    col_w = 8
    header = " " * 22 + "".join(f"{MENTOR_NAMES[m['id']][:col_w-1]:>{col_w}}" for m in MENTORS)
    print(f"\n  {'':22}" + "".join(f"{'  ' + MENTOR_NAMES[m['id']][:6]:>{col_w}}" for m in MENTORS))
    for i, mentee in enumerate(MENTEES):
        row = f"  {MENTEE_NAMES[mentee['id']]:<20}  "
        for j in range(len(MENTORS)):
            row += f"{scores[i][j]:>{col_w}.3f}"
        print(row)

    # Assert scores in [0, 1]
    print("\n  [Assertions] All scores in [0, 1]:")
    for i, mentee in enumerate(MENTEES):
        for j, mentor in enumerate(MENTORS):
            s = float(scores[i][j])
            check(
                f"{MENTEE_NAMES[mentee['id']]} × {MENTOR_NAMES[mentor['id']]}",
                0.0 <= s <= 1.0 + 1e-9,
                f"score={s:.4f}",
            )

    # Assert formula integrity on a sample pair
    print("\n  [Assertions] Formula integrity (final = weighted sum):")
    w = ScoringWeights()
    for i, mentee in enumerate(MENTEES[:3]):
        for j, mentor in enumerate(MENTORS[:3]):
            bd = breakdowns[i][j]
            expected_final = (
                w.keyword_similarity * bd.keyword_score
                + w.experience        * bd.experience_score
                + w.availability      * bd.availability_score
                + w.communication     * bd.communication_score
                + w.meeting_frequency * bd.meeting_frequency_score
            )
            diff = abs(bd.final_score - expected_final)
            check(
                f"{MENTEE_NAMES[mentee['id']]} × {MENTOR_NAMES[mentor['id']]} formula",
                diff < 1e-5,
                f"diff={diff:.8f}",
            )

    # Assert each mentee's top-scored mentor matches expected
    print("\n  [Assertions] Top-scored mentor matches expected domain:")
    for i, mentee in enumerate(MENTEES):
        best_j = int(scores[i].argmax())
        best_mentor_id = MENTORS[best_j]["id"]
        expected_id    = EXPECTED.get(mentee["id"])
        check(
            f"{MENTEE_NAMES[mentee['id']]} top score → {MENTOR_NAMES[best_mentor_id]}",
            best_mentor_id == expected_id,
            f"expected {MENTOR_NAMES.get(expected_id, '?')}, got {MENTOR_NAMES[best_mentor_id]} "
            f"(score={scores[i][best_j]:.3f})",
        )

    # ── Step 2: Run full matching ─────────────────────────────────────────────
    print("\n" + "─" * 70)
    print("🏥 Step 2: Running full HR matching pipeline...")
    match_records = run_matching(MENTORS, MENTEES)

    # Build result dict
    assignment = {r["mentee_group_id"]: r["mentor_id"] for r in match_records}

    # Print results
    print("\n  Final Assignment:")
    print(f"  {'Mentee Group':<22} {'Matched Mentor':<22} {'Score':>7}  {'Algo':<16}  {'Matched Keywords'}")
    print("  " + "─" * 90)
    for rec in sorted(match_records, key=lambda r: r["compatibility_score"], reverse=True):
        mentee_name  = MENTEE_NAMES.get(rec["mentee_group_id"], rec["mentee_group_id"])
        mentor_name  = MENTOR_NAMES.get(rec["mentor_id"], rec["mentor_id"])
        score        = rec["compatibility_score"]
        algo         = rec["algorithm"]
        kw           = ", ".join(rec["matched_keywords"][:4]) or "(none)"
        print(f"  {mentee_name:<22} {mentor_name:<22} {score:>7.4f}  {algo:<16}  {kw}")

    # ── Step 3: Assertions on matches ────────────────────────────────────────
    print("\n  [Assertions] All mentees are matched:")
    check(
        f"All {len(MENTEES)} mentees matched",
        len(assignment) == len(MENTEES),
        f"got {len(assignment)} matches",
    )

    print("\n  [Assertions] Mentor capacity not exceeded:")
    mentor_load: dict[str, int] = {}
    for rec in match_records:
        mentor_load[rec["mentor_id"]] = mentor_load.get(rec["mentor_id"], 0) + 1
    for mentor in MENTORS:
        load = mentor_load.get(mentor["id"], 0)
        cap  = mentor.get("mentor_capacity", 1)
        check(
            f"{MENTOR_NAMES[mentor['id']]} load ≤ capacity ({cap})",
            load <= cap,
            f"load={load}",
        )

    print("\n  [Assertions] Algorithm label is 'fair-matching':")
    for rec in match_records:
        check(
            f"{MENTEE_NAMES.get(rec['mentee_group_id'])} algorithm label",
            rec["algorithm"] == "fair-matching",
            f"got '{rec['algorithm']}'",
        )

    print("\n  [Assertions] Expected domain matches:")
    for mentee_id, expected_mentor_id in EXPECTED.items():
        actual_mentor_id = assignment.get(mentee_id)
        check(
            f"{MENTEE_NAMES[mentee_id]} → {MENTOR_NAMES[expected_mentor_id]}",
            actual_mentor_id == expected_mentor_id,
            f"got {MENTOR_NAMES.get(actual_mentor_id, 'unmatched')}",
        )

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    if errors:
        print(f"  FAILED — {len(errors)} assertion(s) failed:")
        for e in errors:
            print(f"    ✗ {e}")
        sys.exit(1)
    else:
        print("  ALL TESTS PASSED")
    print("=" * 70)


if __name__ == "__main__":
    main()
