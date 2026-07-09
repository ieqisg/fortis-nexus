import re
import json
import logging
from text_processing import build_mentor_text, build_mentee_text, clean_text

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# DOMAIN EXPANSION MAP
# ─────────────────────────────────────────────

DOMAIN_MAP = {
    "ai": [
        "machine learning", "deep learning", "neural networks",
        "artificial intelligence", "intelligent systems", "ai systems"
    ],
    "artificial intelligence": [
        "machine learning", "deep learning", "neural networks",
        "intelligent systems", "ai"
    ],
    "nlp": [
        "natural language processing", "language models", "transformers",
        "text classification", "sentiment analysis", "tokenization",
        "named entity recognition", "text mining", "language understanding"
    ],
    "natural language processing": [
        "nlp", "language models", "transformers", "text classification",
        "sentiment analysis", "tokenization", "text mining"
    ],
    "computer vision": [
        "image processing", "convolutional neural networks", "cnn",
        "object detection", "image classification", "visual recognition",
        "image segmentation", "feature extraction"
    ],
    "cv": [
        "computer vision", "image processing", "cnn",
        "object detection", "image classification"
    ],
    "machine learning": [
        "supervised learning", "unsupervised learning", "reinforcement learning",
        "feature engineering", "model training", "classification",
        "regression", "clustering", "neural networks", "ml"
    ],
    "ml": [
        "machine learning", "supervised learning", "unsupervised learning",
        "model training", "feature engineering"
    ],
    "deep learning": [
        "neural networks", "cnn", "rnn", "lstm", "transformer",
        "backpropagation", "gradient descent", "pytorch", "tensorflow"
    ],
    "dl": [
        "deep learning", "neural networks", "cnn", "transformer"
    ],
    "web development": [
        "frontend development", "backend development", "rest apis",
        "full stack", "html", "css", "javascript", "web applications",
        "web services", "http", "api design"
    ],
    "web dev": [
        "web development", "frontend", "backend", "rest apis", "full stack"
    ],
    "frontend": [
        "html", "css", "javascript", "react", "vue", "angular",
        "ui design", "user interface", "web design"
    ],
    "backend": [
        "server side", "rest api", "database", "node.js", "python backend",
        "api development", "microservices", "authentication"
    ],
    "data science": [
        "statistics", "data analysis", "data visualization", "pandas",
        "numpy", "exploratory data analysis", "data mining",
        "statistical modeling", "jupyter", "python"
    ],
    "cybersecurity": [
        "network security", "encryption", "penetration testing",
        "firewall", "vulnerability assessment", "ethical hacking",
        "information security", "threat detection", "cryptography"
    ],
    "security": [
        "cybersecurity", "network security", "encryption",
        "authentication", "authorization", "threat detection"
    ],
    "iot": [
        "internet of things", "embedded systems", "arduino",
        "raspberry pi", "sensor networks", "microcontroller",
        "firmware", "real time systems", "edge computing"
    ],
    "internet of things": [
        "iot", "embedded systems", "arduino", "sensor networks",
        "microcontroller", "edge computing"
    ],
    "blockchain": [
        "smart contracts", "ethereum", "decentralized systems",
        "cryptocurrency", "distributed ledger", "solidity",
        "web3", "consensus algorithms", "defi"
    ],
    "mobile development": [
        "android", "ios", "flutter", "react native",
        "cross platform", "mobile apps", "swift", "kotlin"
    ],
    "mobile": [
        "android", "ios", "flutter", "react native", "mobile apps"
    ],
    "cloud": [
        "cloud computing", "aws", "azure", "google cloud",
        "serverless", "docker", "kubernetes", "microservices",
        "devops", "ci cd", "infrastructure"
    ],
    "devops": [
        "docker", "kubernetes", "ci cd", "continuous integration",
        "continuous deployment", "infrastructure as code",
        "cloud computing", "automation", "monitoring"
    ],
    "database": [
        "sql", "nosql", "postgresql", "mongodb", "mysql",
        "database design", "data modeling", "query optimization",
        "redis", "elasticsearch"
    ],
    "game development": [
        "unity", "unreal engine", "game design", "3d graphics",
        "physics simulation", "game ai", "pathfinding",
        "c sharp", "opengl", "game mechanics"
    ],
    "robotics": [
        "robot operating system", "ros", "motion planning",
        "kinematics", "autonomous systems", "embedded systems",
        "control systems", "sensor fusion", "slam"
    ],
    "data engineering": [
        "etl", "data pipelines", "apache spark", "hadoop",
        "data warehousing", "stream processing", "kafka",
        "data lakes", "big data", "airflow"
    ],
    "software engineering": [
        "software design", "design patterns", "agile", "scrum",
        "version control", "git", "testing", "code review",
        "system design", "architecture", "solid principles"
    ],
    "bioinformatics": [
        "genomics", "proteomics", "sequence alignment", "biological data",
        "computational biology", "dna analysis", "python bioinformatics"
    ],
    "augmented reality": [
        "ar", "vr", "mixed reality", "3d rendering", "unity",
        "spatial computing", "openxr", "immersive technology"
    ],
    "ar": [
        "augmented reality", "vr", "mixed reality", "3d rendering"
    ],
    "vr": [
        "virtual reality", "ar", "mixed reality", "3d rendering", "unity"
    ],

    # ── Classic / foundational algorithms ─────────────────────────────────
    "algorithms": [
        "graph algorithms", "sorting algorithms", "dynamic programming",
        "greedy algorithms", "divide and conquer", "backtracking",
        "breadth first search", "depth first search", "binary search",
        "dijkstra", "a star", "bellman ford", "floyd warshall",
        "kruskal", "prim", "topological sort",
    ],
    "graph algorithms": [
        "dijkstra", "a star", "bellman ford", "floyd warshall",
        "breadth first search", "depth first search", "kruskal", "prim",
        "topological sort", "minimum spanning tree", "shortest path",
    ],
    "graph theory": [
        "graph algorithms", "dijkstra", "breadth first search",
        "depth first search", "minimum spanning tree", "topological sort",
    ],
    "dijkstra": [
        "shortest path", "graph algorithms", "greedy algorithms", "weighted graph",
    ],
    "a star": [
        "heuristic search", "pathfinding", "graph algorithms", "shortest path",
    ],
    "dynamic programming": [
        "memoization", "tabulation", "optimal substructure",
        "overlapping subproblems", "knapsack problem",
    ],
    "dp": [
        "dynamic programming", "memoization", "tabulation",
    ],
    "sorting algorithms": [
        "merge sort", "quicksort", "heap sort", "bubble sort",
        "insertion sort", "radix sort", "counting sort",
    ],
    "data structures": [
        "binary tree", "binary search tree", "heap", "linked list",
        "hash table", "graph", "stack", "queue", "trie", "balanced tree",
    ],
    "greedy algorithms": [
        "dijkstra", "prim", "kruskal", "activity selection",
        "huffman coding", "fractional knapsack",
    ],
    "computational complexity": [
        "big o notation", "time complexity", "space complexity",
        "np complete", "np hard", "polynomial time",
    ],
    "algorithm analysis": [
        "time complexity", "space complexity", "big o notation",
        "asymptotic analysis", "recurrence relation",
    ],

    # ── HCI & UX ──────────────────────────────────────────────────────────
    "human computer interaction": [
        "hci", "user interface", "user experience", "usability testing",
        "interaction design", "cognitive load", "user centered design",
        "accessibility", "navigation design", "information architecture",
        "ui design", "ux design", "human factors",
    ],
    "hci": [
        "human computer interaction", "user interface", "user experience",
        "usability", "interaction design", "cognitive load",
    ],
    "usability": [
        "usability testing", "usability engineering", "user centered design",
        "cognitive load", "task analysis", "user research",
        "human computer interaction", "hci",
    ],
    "usability testing": [
        "usability engineering", "user research", "task analysis",
        "cognitive load", "human computer interaction", "hci",
    ],
    "user experience": [
        "ux design", "ui design", "usability", "interaction design",
        "user centered design", "human computer interaction",
        "navigation design", "information architecture",
    ],
    "ux": [
        "user experience", "ux design", "usability", "interaction design",
        "ui design", "human computer interaction",
    ],
    "cognitive load": [
        "usability", "user experience", "human computer interaction",
        "educational technology", "navigation optimization",
        "information architecture", "adaptive learning",
    ],
    "navigation optimization": [
        "shortest path algorithm", "graph algorithms", "floyd warshall",
        "user navigation", "cognitive load", "usability",
        "educational applications",
    ],

    # ── Educational technology ─────────────────────────────────────────────
    "educational technology": [
        "e learning", "intelligent tutoring system", "learning management system",
        "adaptive learning", "gamification", "educational applications",
        "learning analytics", "edtech", "personalized learning",
    ],
    "edtech": [
        "educational technology", "e learning", "adaptive learning",
        "learning management system", "educational applications",
        "intelligent tutoring system",
    ],
    "intelligent tutoring system": [
        "adaptive learning", "educational technology", "machine learning",
        "personalized learning", "learning analytics", "e learning",
    ],
    "adaptive learning": [
        "personalized learning", "intelligent tutoring system",
        "educational technology", "machine learning", "learning analytics",
        "recommendation systems", "cognitive load",
    ],
    "e learning": [
        "educational technology", "learning management system",
        "adaptive learning", "online learning", "edtech",
        "educational applications",
    ],

    # ── Graph algorithms (extended) ────────────────────────────────────────
    "floyd warshall": [
        "all pairs shortest path", "dynamic programming", "graph algorithms",
        "shortest path", "weighted graph", "navigation optimization",
    ],
    "bellman ford": [
        "shortest path", "single source shortest path", "graph algorithms",
        "weighted graph", "negative weight edges",
    ],
    "dijkstra": [
        "shortest path", "graph algorithms", "greedy algorithms",
        "single source shortest path", "weighted graph",
    ],
    "kruskal": [
        "minimum spanning tree", "greedy algorithms", "graph algorithms",
        "union find", "disjoint set",
    ],
    "prim": [
        "minimum spanning tree", "greedy algorithms", "graph algorithms",
        "weighted graph",
    ],
    "network flow": [
        "maximum flow", "minimum cut", "ford fulkerson", "edmonds karp",
        "bipartite matching", "graph algorithms",
    ],
    "shortest path": [
        "dijkstra", "bellman ford", "floyd warshall", "a star",
        "graph algorithms", "single source shortest path",
        "all pairs shortest path",
    ],
    "minimum spanning tree": [
        "kruskal", "prim", "greedy algorithms", "graph algorithms",
        "spanning tree", "weighted graph",
    ],
    "strongly connected components": [
        "scc", "tarjan algorithm", "kosaraju algorithm", "graph algorithms",
        "directed graph",
    ],

    # ── Extended classical algorithms ──────────────────────────────────────
    "dynamic programming": [
        "memoization", "tabulation", "optimal substructure",
        "overlapping subproblems", "knapsack problem",
        "longest common subsequence", "longest increasing subsequence",
        "coin change", "matrix chain multiplication",
    ],
    "huffman coding": [
        "greedy algorithms", "compression", "prefix code",
        "binary tree", "data compression",
    ],
    "fast fourier transform": [
        "fft", "signal processing", "polynomial multiplication",
        "divide and conquer", "number theory",
    ],
    "fft": [
        "fast fourier transform", "signal processing", "divide and conquer",
    ],
    "knapsack problem": [
        "dynamic programming", "optimization", "combinatorial optimization",
        "greedy algorithms",
    ],
    "stable matching": [
        "gale shapley", "deferred acceptance", "hospital resident",
        "bipartite matching", "two sided matching", "stable marriage",
        "matching algorithm",
    ],
    "gale shapley": [
        "stable matching", "deferred acceptance", "hospital resident",
        "two sided matching", "stable marriage problem",
        "matching algorithm",
    ],

    # ── Financial technology ───────────────────────────────────────────────
    "financial technology": [
        "fintech", "expense management", "financial data",
        "document intelligence", "receipt processing", "ocr",
        "adaptive classification", "financial analytics",
    ],
    "fintech": [
        "financial technology", "expense tracking", "digital payments",
        "financial data", "document processing", "ocr",
    ],
    "document processing": [
        "optical character recognition", "ocr", "document intelligence",
        "intelligent document processing", "information extraction",
        "named entity recognition", "financial technology",
    ],
    "expense management": [
        "financial technology", "fintech", "receipt processing",
        "expense tracking", "financial analytics", "adaptive classification",
        "ocr", "optical character recognition",
    ],
}

# ─────────────────────────────────────────────
# KEYWORD EXTRACTION
# ─────────────────────────────────────────────

def extract_keywords(text: str) -> list[str]:
    """
    Extract keywords from raw text, preserving known multi-word phrases.
    Prevents domain phrases like 'two sided matching' from being split
    into partial tokens like 'sided' and 'matching' separately.
    """
    cleaned = clean_text(text)

    stopwords = {
        "the", "and", "for", "with", "this", "that", "have",
        "from", "are", "was", "been", "will", "our", "their",
        "using", "based", "system", "research", "study", "looking",
        "mentor", "mentee", "expertise", "experience", "interest"
    }

    # First, extract known multi-word domain phrases (longest match first)
    known_phrases = sorted(DOMAIN_MAP.keys(), key=len, reverse=True)
    extracted_phrases = []
    remaining = cleaned

    for phrase in known_phrases:
        pattern = r'\b' + re.escape(phrase) + r'\b'
        if re.search(pattern, remaining):
            extracted_phrases.append(phrase)
            # Mask it so its tokens aren't re-extracted as fragments
            remaining = re.sub(pattern, ' ', remaining)

    # Then extract remaining single meaningful words
    single_words = re.findall(r'\b[a-z][a-z0-9]{2,}\b', remaining)
    single_words = [w for w in single_words if w not in stopwords]

    # Combine: phrases first (higher signal), then single words
    return extracted_phrases + single_words

def detect_domains(text: str) -> list[str]:
    """Detect which domains are mentioned in text."""
    text_lower = text.lower()
    detected = []
    for domain in DOMAIN_MAP.keys():
        if re.search(r'\b' + re.escape(domain) + r'\b', text_lower):
            detected.append(domain)
    return list(set(detected))

def expand_domains(domains: list[str]) -> list[str]:
    """Expand detected domains into subtopics."""
    expanded = []
    for domain in domains:
        expanded.extend(DOMAIN_MAP.get(domain, []))
    return list(set(expanded))

# ─────────────────────────────────────────────
# COMPUTE SHARED DOMAINS
# ─────────────────────────────────────────────

def compute_shared_domains(
    mentor_domains: list[str],
    mentee_domains: list[str],
    mentor_expanded: list[str],
    mentee_expanded: list[str]
) -> list[str]:
    """
    Find domains that overlap between mentor and mentee
    including expanded subdomain matches
    """
    mentor_all = set(mentor_domains + mentor_expanded)
    mentee_all = set(mentee_domains + mentee_expanded)
    return list(mentor_all & mentee_all)

# ─────────────────────────────────────────────
# GENERATE MATCHING HINTS
# ─────────────────────────────────────────────

def generate_matching_hints(
    mentor: dict,
    mentee: dict,
    shared_domains: list[str],
    mentor_expanded: list[str],
    mentee_expanded: list[str]
) -> list[str]:
    """Generate human-readable hints explaining why a pair aligns."""
    hints = []

    if shared_domains:
        hints.append(
            f"Both share expertise in: {', '.join(shared_domains[:3])}"
        )

    # check availability overlap
    mentor_days = set(mentor.get("available_days") or [])
    mentee_days = set(mentee.get("available_days") or [])
    shared_days = mentor_days & mentee_days
    if shared_days:
        hints.append(f"Available on same days: {', '.join(shared_days)}")

    # check skill match
    mentor_skills = set(s.lower() for s in (mentor.get("technical_skills") or []))
    mentee_pref = mentee.get("mentor_preference", "").lower()
    matched_skills = [s for s in mentor_skills if s in mentee_pref]
    if matched_skills:
        hints.append(f"Mentor skills match mentee preference: {', '.join(matched_skills)}")

    # check forte match
    mentor_forte = set(f.lower() for f in (mentor.get("forte") or []))
    mentee_desc = mentee.get("research_description", "").lower()
    matched_forte = [f for f in mentor_forte if f in mentee_desc]
    if matched_forte:
        hints.append(f"Mentor forte aligns with mentee research: {', '.join(matched_forte)}")

    if not hints:
        hints.append("Weak alignment — limited shared domain overlap detected")

    return hints

# ─────────────────────────────────────────────
# EXPAND SINGLE PAIR
# ─────────────────────────────────────────────

def expand_pair(mentor: dict, mentee: dict) -> dict:
    """
    Expands a single mentor-mentee pair into domain-aware
    structured representation.
    """
    mentor_text = build_mentor_text(mentor)
    mentee_text = build_mentee_text(mentee)

    # mentor expansion
    mentor_original_kw = extract_keywords(mentor_text)
    mentor_domains = detect_domains(mentor_text)
    mentor_expanded_kw = expand_domains(mentor_domains)

    # mentee expansion
    mentee_original_kw = extract_keywords(mentee_text)
    mentee_domains = detect_domains(mentee_text)
    mentee_expanded_kw = expand_domains(mentee_domains)

    # shared domains
    shared = compute_shared_domains(
        mentor_domains, mentee_domains,
        mentor_expanded_kw, mentee_expanded_kw
    )

    # matching hints
    hints = generate_matching_hints(
        mentor, mentee, shared,
        mentor_expanded_kw, mentee_expanded_kw
    )

    return {
        "mentor_expanded": {
            "domains": mentor_domains,
            "expanded_keywords": mentor_expanded_kw,
            "original_keywords": mentor_original_kw
        },
        "mentee_expanded": {
            "domains": mentee_domains,
            "expanded_keywords": mentee_expanded_kw,
            "original_keywords": mentee_original_kw
        },
        "shared_domains": shared,
        "matching_hints": hints
    }

# ─────────────────────────────────────────────
# BUILD EXPANDED TEXTS
# ─────────────────────────────────────────────

def build_expanded_mentor_text(mentor: dict, expansion: dict) -> str:
    """
    Combines original mentor text with expanded keywords
    for richer TF-IDF and BERT input.
    """
    original = build_mentor_text(mentor)
    expanded = expansion.get("mentor_expanded", {})

    domains = " ".join(expanded.get("domains", []))
    expanded_kw = " ".join(expanded.get("expanded_keywords", []))
    hints = " ".join(expansion.get("matching_hints", []))

    return f"{original} {domains} {expanded_kw} {hints}".strip()

def build_expanded_mentee_text(mentee: dict, expansion: dict) -> str:
    """
    Combines original mentee text with expanded keywords.
    """
    original = build_mentee_text(mentee)
    expanded = expansion.get("mentee_expanded", {})

    domains = " ".join(expanded.get("domains", []))
    expanded_kw = " ".join(expanded.get("expanded_keywords", []))
    hints = " ".join(expansion.get("matching_hints", []))

    return f"{original} {domains} {expanded_kw} {hints}".strip()

# ─────────────────────────────────────────────
# EXPAND ALL PAIRS
# ─────────────────────────────────────────────

def expand_all_pairs(
    mentors: list[dict],
    mentees: list[dict]
) -> tuple[list[str], list[str]]:
    """
    Expands all mentor-mentee pairs and returns
    enriched text representations for scoring.
    """
    print(f"  Expanding {len(mentors)} mentors x {len(mentees)} mentees...")

    # expand each mentor once
    mentor_expansions = {}
    for mentor in mentors:
        # use first mentee as reference for hints
        dummy_mentee = mentees[0] if mentees else {}
        expansion = expand_pair(mentor, dummy_mentee)
        mentor_expansions[mentor["id"]] = expansion

    # expand each mentee against best-fit mentor (first pass)
    mentee_expansions = {}
    for mentee in mentees:
        dummy_mentor = mentors[0] if mentors else {}
        expansion = expand_pair(dummy_mentor, mentee)
        mentee_expansions[mentee["id"]] = expansion

    # build enriched texts
    mentor_texts = [
        build_expanded_mentor_text(m, mentor_expansions[m["id"]])
        for m in mentors
    ]
    mentee_texts = [
        build_expanded_mentee_text(m, mentee_expansions[m["id"]])
        for m in mentees
    ]

    return mentor_texts, mentee_texts
