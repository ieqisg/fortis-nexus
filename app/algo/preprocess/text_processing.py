"""
text_processing.py

Text cleaning and keyword extraction for the mentor-mentee matching pipeline.

Extraction strategy (two phases):
  Phase 1 — Direct vocabulary scan: scan cleaned text for exact matches against
             CS_TECH_VOCAB (multi-word phrases matched longest-first to prevent
             fragment capture, e.g. "support vector machine" before "vector").
  Phase 2 — TF-IDF residuals: run TF-IDF on remaining slots, filtered against
             ACADEMIC_STOP_WORDS to exclude research filler ("propose", "study",
             "approach", etc.).

This guarantees that "naive bayes", "python", "graph neural network", and similar
technical terms are always extracted when present, regardless of TF-IDF ranking.
"""

import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer


# ─────────────────────────────────────────────────────────────────────────────
# 0. PRE-NORMALIZATION (before clean_text)
# ─────────────────────────────────────────────────────────────────────────────

_PRENORM: list[tuple[str, str]] = [
    # Language names with symbols → plain alpha tokens
    (r"(?i)\bc\+\+",              "cpp"),
    (r"(?i)\bc#",                 "csharp"),
    (r"(?i)\bf#",                 "fsharp"),
    (r"(?i)\bq#",                 "qsharp"),
    (r"(?i)\.net\b",              "dotnet"),
    (r"(?i)\basp\.net\b",         "aspnet"),
    # Dot-separated names → run-together
    (r"(?i)\bnode\.js\b",         "nodejs"),
    (r"(?i)\bnext\.js\b",         "nextjs"),
    (r"(?i)\bvue\.js\b",          "vue"),
    (r"(?i)\breact\.js\b",        "react"),
    (r"(?i)\bangular\.js\b",      "angular"),
    # Hyphenated multi-word tech terms → spaced (so bigram logic covers them)
    (r"(?i)\bscikit-learn\b",     "scikit learn"),
    (r"(?i)\bmachine-learning\b", "machine learning"),
    (r"(?i)\bdeep-learning\b",    "deep learning"),
    (r"(?i)\bk-means\b",          "k means"),
    (r"(?i)\bk-nn\b",             "knn"),
    (r"(?i)\btf-idf\b",           "tfidf"),
    (r"(?i)\bword2vec\b",         "word2vec"),
    (r"(?i)\bci/cd\b",            "cicd"),
    (r"(?i)\bci-cd\b",            "cicd"),
    (r"(?i)\bgit-hub\b",          "github"),
    (r"(?i)\bgit-lab\b",          "gitlab"),
    (r"(?i)\bpost-gresql\b",      "postgresql"),
    (r"(?i)\bmy-sql\b",           "mysql"),
    (r"(?i)\bnano-gpt\b",         "nanogpt"),
    (r"(?i)\bopen-cv\b",          "opencv"),
    (r"(?i)\bopen-gl\b",          "opengl"),
    (r"(?i)\ba\*\b",              "astar"),
    (r"(?i)\brapberry\s+pi\b",    "raspberry pi"),
]


def _prenormalize(text: str) -> str:
    for pattern, replacement in _PRENORM:
        text = re.sub(pattern, replacement, text)
    return text


# ─────────────────────────────────────────────────────────────────────────────
# 1. TEXT CLEANING
# ─────────────────────────────────────────────────────────────────────────────

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = _prenormalize(text)
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ─────────────────────────────────────────────────────────────────────────────
# 2. ACADEMIC STOP WORDS (filler terms common in research descriptions)
# ─────────────────────────────────────────────────────────────────────────────

ACADEMIC_STOP_WORDS: frozenset[str] = frozenset({
    # ── Research filler verbs ──────────────────────────────────────────────
    "propose", "proposed", "approach", "work", "using", "based",
    "study", "analysis", "result", "results", "experiment", "experiments",
    "evaluation", "performance", "application", "development", "design",
    "implementation", "technique", "method", "methodology", "novel",
    "existing", "traditional", "modern", "compare", "comparison",
    "improve", "improvement", "efficient", "effective", "accuracy",
    "precision", "recall", "dataset", "benchmark", "literature", "review",
    "survey", "overview", "introduction", "conclusion", "future",
    "challenge", "issue", "solution", "goal", "objective", "aim",
    "focus", "area", "field", "topic", "subject", "concept", "idea",
    "theory", "practice", "real", "world", "case", "scenario", "context",
    "environment", "service", "user", "client", "given", "use", "used",
    "show", "shown", "present", "presented", "demonstrate", "demonstrated",
    "provide", "provided", "achieve", "achieved", "obtain", "obtained",
    "perform", "performed", "test", "tested", "train", "trained",
    "validate", "validated", "apply", "applied", "extend", "extended",
    "develop", "developed", "implement", "implemented", "integrate",
    "integrated", "combine", "combined", "create", "created", "build",
    "built", "define", "defined", "describe", "described", "introduce",
    "introduced", "consider", "considered", "explore", "explored",
    "investigate", "investigated", "examine", "examined", "address",
    "addressed", "identify", "identified", "detect", "detected",
    "predict", "predicted", "classify", "classified", "generate",
    "generated", "extract", "extracted", "process", "processed",
    "analyze", "analyzed", "compute", "computed", "calculate",
    "calculated", "estimate", "estimated", "measure", "measured",
    "evaluate", "evaluated", "select", "selected", "determine",
    "determined", "reduce", "reduced", "increase", "increased",
    "enhance", "enhanced", "optimize", "optimized", "produce",
    "produced", "output", "input", "information", "model", "system",
    # ── Adjectives / adverbs ───────────────────────────────────────────────
    "state", "art", "high", "low", "large", "small", "new", "old",
    "good", "best", "different", "various", "multiple", "many",
    "several", "key", "main", "major", "important", "significant",
    "specific", "general", "common", "current", "recent", "prior",
    "previous", "following", "overall", "finally", "thus", "therefore",
    "however", "moreover", "furthermore", "additionally",
    "related", "relevant", "similar", "known", "called",
    # ── Academic / profile filler nouns ───────────────────────────────────
    "paper", "papers", "thesis", "theses", "dissertation",
    "researcher", "research", "mentor", "mentee", "student", "professor",
    "expert", "expertise", "skill", "skills", "experience", "experienced",
    "proficient", "proficiency", "interested", "interest", "interests",
    "prefer", "preferred", "preference", "looking", "seeking",
    "group", "team", "member", "members", "department", "university",
    "course", "project", "projects", "task", "tasks",
    "discovery", "discoveries", "finding", "findings",
    "strength", "strengths", "weakness", "weakness",
    "background", "knowledge", "understanding",
    "mentored", "published", "publication", "publications",
    "certified", "certification", "certifications",
    "ability", "abilities", "capable", "capable", "capable",
    "working", "developing", "building", "creating", "designing",
    "strong", "solid", "broad", "deep", "extensive",
    "pipeline", "pipelines", "workflow", "workflows",
    "stack", "developer", "developers", "engineer", "engineers",
    "scientist", "scientists", "analyst", "analysts",
    "routing", "route", "routes",
})


# ─────────────────────────────────────────────────────────────────────────────
# 3. CS TECHNICAL VOCABULARY
# ─────────────────────────────────────────────────────────────────────────────
# All entries are lowercase, in cleaned form (post-prenormalize, post-clean).
# Multi-word entries are matched phrase-first (longest match wins).

CS_TECH_VOCAB: frozenset[str] = frozenset({
    # ── Programming languages ──────────────────────────────────────────────
    "python", "java", "javascript", "typescript", "cpp", "csharp", "fsharp",
    "rust", "go", "golang", "kotlin", "swift", "ruby", "php", "scala",
    "matlab", "julia", "perl", "haskell", "dart", "lua", "fortran",
    "cobol", "assembly", "bash", "shell", "sql", "html", "css", "sass",
    "less", "xml", "yaml", "json", "graphql", "solidity", "vhdl", "verilog",
    "prolog", "erlang", "elixir", "clojure", "ocaml", "nim", "crystal",
    "zig", "webassembly", "wasm", "groovy", "powershell", "lisp",
    "scheme", "racket", "r language", "objective c",
    "nodejs", "nextjs", "reactjs", "dotnet", "aspnet",

    # ── Classic ML / statistical algorithms ───────────────────────────────
    "naive bayes", "support vector machine", "svm",
    "random forest", "decision tree", "gradient boosting",
    "k nearest neighbors", "knn", "k means", "k means clustering",
    "hierarchical clustering", "dbscan", "spectral clustering",
    "fuzzy c means", "expectation maximization",
    "linear regression", "logistic regression", "ridge regression",
    "lasso regression", "elastic net", "polynomial regression",
    "gradient descent", "stochastic gradient descent", "sgd",
    "backpropagation", "adam optimizer", "rmsprop", "adagrad",
    "dropout", "batch normalization", "layer normalization",
    "weight initialization", "xavier initialization",
    "principal component analysis", "pca",
    "singular value decomposition", "svd",
    "linear discriminant analysis", "lda",
    "independent component analysis", "ica",
    "t sne", "umap", "autoencoder",
    "markov chain", "hidden markov model", "hmm",
    "monte carlo", "simulated annealing",
    "genetic algorithm", "evolutionary algorithm", "particle swarm",
    "ant colony optimization",
    "adaboost", "xgboost", "lightgbm", "catboost", "extra trees",
    "bagging", "boosting", "stacking", "ensemble learning",
    "isolation forest", "one class svm", "local outlier factor",
    "collaborative filtering", "matrix factorization",
    "gaussian process", "bayesian network", "belief propagation",
    "variational inference", "mcmc",

    # ── Deep learning architectures ────────────────────────────────────────
    "neural network", "deep learning", "machine learning",
    "convolutional neural network", "cnn",
    "recurrent neural network", "rnn",
    "long short term memory", "lstm",
    "gated recurrent unit", "gru",
    "transformer", "attention mechanism", "self attention",
    "multi head attention", "cross attention",
    "bert", "gpt", "t5", "roberta", "xlnet", "albert", "electra",
    "llama", "mistral", "falcon", "gemini",
    "stable diffusion",
    "generative adversarial network", "gan",
    "variational autoencoder", "vae",
    "graph neural network", "gnn", "graph convolutional network", "gcn",
    "message passing", "graph attention", "graphsage",
    "residual network", "resnet", "densenet", "efficientnet", "vgg",
    "mobilenet", "inception", "alexnet",
    "u net", "deeplab",
    "yolo", "faster rcnn", "mask rcnn", "detr",
    "diffusion model", "flow matching",
    "contrastive learning", "self supervised learning",
    "transfer learning", "fine tuning", "prompt tuning",
    "knowledge distillation", "model compression", "quantization", "pruning",
    "federated learning", "continual learning", "meta learning",
    "few shot learning", "zero shot learning", "in context learning",
    "reinforcement learning", "deep reinforcement learning",
    "q learning", "dqn", "policy gradient", "ppo", "actor critic",
    "reward shaping", "multi agent reinforcement learning",
    "imitation learning", "inverse reinforcement learning",

    # ── NLP / text ─────────────────────────────────────────────────────────
    "natural language processing", "nlp",
    "large language model", "llm",
    "named entity recognition", "ner",
    "part of speech", "pos tagging",
    "dependency parsing", "constituency parsing",
    "semantic role labeling", "coreference resolution",
    "word embeddings", "word2vec", "glove", "fasttext",
    "sentence embeddings", "sentence bert",
    "bag of words", "tfidf", "tf idf",
    "tokenization", "stemming", "lemmatization",
    "machine translation", "neural machine translation",
    "question answering", "reading comprehension",
    "text summarization", "abstractive summarization",
    "sentiment analysis", "opinion mining",
    "text classification", "topic modeling",
    "language modeling",
    "speech recognition", "automatic speech recognition", "asr",
    "text to speech", "tts",
    "optical character recognition", "ocr",
    "information retrieval", "information extraction",
    "knowledge graph", "relation extraction", "event extraction",
    "semantic similarity", "cosine similarity",
    "retrieval augmented generation", "rag",
    "chain of thought",

    # ── Computer vision ────────────────────────────────────────────────────
    "computer vision", "image processing",
    "object detection", "image classification", "image segmentation",
    "semantic segmentation", "instance segmentation", "panoptic segmentation",
    "pose estimation", "human pose",
    "optical flow", "stereo vision", "depth estimation",
    "3d reconstruction", "point cloud", "lidar",
    "image generation", "style transfer",
    "image super resolution",
    "face recognition", "facial recognition", "face detection",
    "action recognition", "video understanding",
    "slam", "visual odometry",
    "feature extraction", "feature matching", "sift", "surf", "orb",
    "opencv", "pillow", "scikit image",

    # ── Data science & analytics ───────────────────────────────────────────
    "data science", "data analysis", "data mining",
    "exploratory data analysis", "eda",
    "data visualization", "statistical modeling",
    "hypothesis testing", "a b testing", "statistical significance",
    "regression analysis", "time series analysis", "forecasting",
    "anomaly detection", "outlier detection",
    "feature engineering", "feature selection",
    "dimensionality reduction", "data preprocessing",
    "data cleaning", "data wrangling",
    "cross validation", "train test split",
    "hyperparameter tuning", "grid search", "random search",
    "bayesian optimization", "optuna", "hyperopt",
    "pandas", "numpy", "scipy", "matplotlib", "seaborn", "plotly",
    "jupyter", "colab",
    "tableau", "power bi",

    # ── ML frameworks & libraries ──────────────────────────────────────────
    "tensorflow", "pytorch", "keras", "jax", "flax",
    "scikit learn", "sklearn",
    "hugging face", "huggingface", "transformers library",
    "openai", "langchain", "llamaindex",
    "mxnet", "caffe", "theano", "paddlepaddle",
    "fastai", "detectron2",
    "spacy", "nltk", "gensim", "allennlp",
    "onnx", "tensorrt", "openvino",
    "mlflow", "wandb", "weights and biases",
    "ray", "dask", "rapids",

    # ── Web frameworks & frontend ──────────────────────────────────────────
    "react", "angular", "vue", "svelte", "nextjs",
    "nuxtjs", "gatsby", "remix", "astro", "htmx",
    "express", "fastapi", "flask", "django",
    "spring", "spring boot", "rails", "laravel", "symfony",
    "nestjs", "koa", "fastify",
    "gin", "echo", "fiber",
    "actix", "rocket", "axum",
    "dotnet", "blazor",
    "graphql", "rest api", "grpc", "websocket",
    "oauth", "jwt", "openid connect",
    "tailwindcss", "tailwind", "bootstrap", "material ui",
    "redux", "zustand", "mobx",
    "webpack", "vite", "rollup", "esbuild", "turbopack",
    "jest", "vitest", "cypress", "playwright", "selenium",

    # ── Mobile development ─────────────────────────────────────────────────
    "android", "ios", "flutter", "react native", "xamarin",
    "ionic", "cordova", "capacitor", "expo",
    "jetpack compose", "swiftui",

    # ── Databases ──────────────────────────────────────────────────────────
    "postgresql", "postgres", "mysql", "sqlite", "mariadb",
    "mongodb", "couchdb", "firestore",
    "redis", "memcached",
    "elasticsearch", "opensearch", "solr",
    "cassandra", "dynamodb", "bigtable", "hbase",
    "neo4j", "arangodb",
    "influxdb", "timescaledb",
    "clickhouse", "druid",
    "snowflake", "bigquery", "redshift",
    "vector database", "pinecone", "weaviate", "milvus", "chroma", "qdrant",
    "supabase", "firebase", "neon", "planetscale", "cockroachdb",
    "database design", "data modeling", "query optimization",
    "database normalization", "indexing", "partitioning", "sharding",
    "replication", "acid transactions",
    "nosql", "olap", "oltp",
    "etl", "data pipeline", "data warehouse", "data lake",

    # ── Big data & streaming ───────────────────────────────────────────────
    "hadoop", "apache spark", "spark", "flink", "kafka",
    "airflow", "dbt", "dagster", "prefect",
    "databricks", "delta lake",
    "hive", "presto", "trino",
    "apache beam",

    # ── Cloud & infrastructure ─────────────────────────────────────────────
    "aws", "amazon web services", "azure", "microsoft azure",
    "google cloud", "gcp", "oracle cloud",
    "kubernetes", "docker", "containerd", "podman",
    "terraform", "ansible", "chef", "puppet",
    "helm", "istio", "envoy", "linkerd",
    "serverless", "lambda", "cloud functions",
    "nginx", "apache httpd", "caddy", "traefik",
    "vault", "consul", "etcd",
    "opentelemetry", "jaeger", "zipkin",
    "prometheus", "grafana", "datadog", "splunk",

    # ── DevOps & CI/CD ─────────────────────────────────────────────────────
    "devops", "mlops", "dataops",
    "cicd", "ci cd", "continuous integration", "continuous deployment",
    "github actions", "gitlab ci", "circleci", "jenkins",
    "docker compose",
    "version control", "git", "github", "gitlab", "bitbucket",
    "agile", "scrum", "kanban",
    "test driven development", "tdd",
    "behavior driven development", "bdd",
    "blue green deployment", "canary deployment",
    "infrastructure as code", "iac",
    "site reliability engineering", "sre",
    "chaos engineering",

    # ── Cybersecurity ──────────────────────────────────────────────────────
    "cybersecurity", "information security", "infosec",
    "penetration testing", "pentesting", "ethical hacking",
    "vulnerability assessment", "vulnerability scanning",
    "network security", "web security", "application security",
    "encryption", "decryption", "cryptography",
    "symmetric encryption", "asymmetric encryption",
    "public key infrastructure", "pki",
    "ssl", "tls",
    "rsa", "aes", "sha", "elliptic curve",
    "zero knowledge proof", "homomorphic encryption",
    "differential privacy", "secure multiparty computation",
    "sql injection", "cross site scripting", "xss",
    "csrf", "ssrf", "buffer overflow",
    "reverse engineering", "malware analysis", "forensics",
    "intrusion detection", "ids", "ips", "siem", "soc",
    "threat modeling", "threat intelligence",
    "zero trust", "identity access management", "iam",
    "saml", "ldap", "active directory",
    "firewall", "vpn",
    "ctf", "bug bounty", "red team", "blue team",

    # ── Classic CS algorithms ──────────────────────────────────────────────
    "binary search", "linear search",
    "breadth first search", "bfs",
    "depth first search", "dfs",
    "astar", "a star", "dijkstra", "bellman ford", "floyd warshall",
    "prim algorithm", "kruskal algorithm", "minimum spanning tree",
    "topological sort", "cycle detection",
    "dynamic programming", "memoization", "tabulation",
    "greedy algorithm", "divide and conquer",
    "branch and bound", "backtracking",
    "quicksort", "mergesort", "heapsort",
    "counting sort", "radix sort", "bucket sort",
    "binary heap", "fibonacci heap",
    "hash table", "hash map", "hash set",
    "binary search tree", "bst",
    "avl tree", "red black tree", "splay tree",
    "b tree", "b plus tree",
    "trie", "suffix tree", "suffix array",
    "segment tree", "fenwick tree", "binary indexed tree",
    "disjoint set", "union find",
    "skip list", "linked list", "doubly linked list",
    "stack", "queue", "deque", "priority queue",
    "bloom filter",
    "knuth morris pratt", "kmp", "rabin karp", "aho corasick",
    "edit distance", "levenshtein",
    "convex hull", "sweep line", "computational geometry",
    "max flow", "min cut", "bipartite matching",
    "traveling salesman", "tsp",
    "np hard", "np complete", "polynomial time",
    "approximation algorithm", "randomized algorithm",
    "amortized analysis", "time complexity", "space complexity",
    "two pointer", "sliding window", "divide conquer",

    # ── Data structures (standalone) ──────────────────────────────────────
    "array", "matrix",

    # ── Computer networks ──────────────────────────────────────────────────
    "tcp", "udp", "http", "https", "http2", "http3", "quic",
    "dns", "dhcp", "nat", "bgp", "ospf",
    "ethernet", "wifi", "bluetooth", "zigbee",
    "ipv4", "ipv6", "subnet",
    "osi model", "tcp ip",
    "rest", "soap",
    "api design", "microservices", "service mesh",
    "message queue", "rabbitmq", "nats",
    "event driven", "event streaming",
    "cdn", "reverse proxy", "api gateway",

    # ── Systems programming & OS ───────────────────────────────────────────
    "operating system", "linux", "unix",
    "kernel", "process scheduling", "memory management",
    "virtual memory", "paging",
    "file system",
    "concurrency", "parallelism", "multithreading", "multiprocessing",
    "mutex", "semaphore", "monitor",
    "deadlock", "race condition",
    "lock free", "wait free", "atomic operations",
    "actor model", "coroutine", "async await",
    "event loop", "non blocking io",
    "reactive programming", "functional reactive",
    "garbage collection", "reference counting",
    "jit compilation", "aot compilation", "bytecode",
    "llvm", "gcc", "clang",
    "simd", "avx", "sse", "vectorization",
    "gpu", "cuda", "opencl", "metal", "vulkan", "opengl", "directx",
    "hpc", "high performance computing", "mpi", "openmp",

    # ── Software engineering ───────────────────────────────────────────────
    "software engineering", "software architecture",
    "object oriented", "oop", "functional programming",
    "design pattern", "factory pattern", "observer pattern",
    "strategy pattern", "decorator pattern", "command pattern",
    "adapter pattern", "facade pattern", "singleton pattern",
    "dependency injection", "inversion of control",
    "model view controller", "mvc",
    "model view viewmodel", "mvvm",
    "domain driven design", "ddd",
    "event sourcing", "cqrs",
    "microservices architecture", "monolithic architecture",
    "solid principles", "dry principle",
    "clean code", "refactoring",
    "unit test", "integration test", "end to end test",
    "mocking", "stubbing",
    "static analysis", "linting", "code coverage",
    "openapi", "swagger",
    "uml", "sequence diagram",

    # ── IoT & embedded ─────────────────────────────────────────────────────
    "internet of things", "iot",
    "embedded systems", "firmware",
    "arduino", "raspberry pi", "esp32", "stm32",
    "microcontroller", "mcu", "fpga",
    "rtos", "freertos", "zephyr",
    "i2c", "spi", "uart", "can bus",
    "pwm", "adc", "dac",
    "sensor fusion", "kalman filter",
    "edge computing",

    # ── Robotics ──────────────────────────────────────────────────────────
    "robotics", "robot operating system", "ros", "ros2",
    "motion planning", "path planning", "kinematics",
    "inverse kinematics",
    "autonomous systems", "autonomous vehicle", "self driving",
    "localization", "mapping",
    "control systems", "pid controller",

    # ── Blockchain ─────────────────────────────────────────────────────────
    "blockchain", "distributed ledger",
    "ethereum", "bitcoin", "solana",
    "smart contracts", "solidity", "web3",
    "defi", "dao",
    "consensus algorithm", "proof of work", "proof of stake",
    "raft", "paxos", "byzantine fault tolerance",
    "distributed systems", "distributed computing",
    "cap theorem",
    "eventual consistency",
    "two phase commit", "saga pattern",
    "merkle tree",
    "peer to peer",

    # ── Game development ───────────────────────────────────────────────────
    "game development", "game engine",
    "unity", "unreal engine", "godot",
    "game ai", "pathfinding", "steering behavior",
    "physics engine", "collision detection",
    "shader", "hlsl", "glsl",
    "3d graphics", "rendering", "ray tracing", "rasterization",
    "procedural generation",

    # ── Augmented / virtual reality ────────────────────────────────────────
    "augmented reality", "ar", "virtual reality", "vr", "mixed reality",
    "spatial computing", "openxr",

    # ── Bioinformatics ─────────────────────────────────────────────────────
    "bioinformatics", "computational biology",
    "genomics", "proteomics", "transcriptomics",
    "sequence alignment",
    "dna analysis", "rna seq", "genome assembly",
    "phylogenetics", "molecular dynamics",
    "protein structure", "protein folding", "alphafold",
    "gene expression", "single cell",

    # ── Quantum computing ──────────────────────────────────────────────────
    "quantum computing", "quantum circuit", "qubit",
    "quantum algorithm", "shor algorithm", "grover algorithm",
    "quantum error correction",
    "qiskit", "cirq", "pennylane",

    # ── Compiler & PL theory ───────────────────────────────────────────────
    "compiler design", "lexer", "parser", "ast",
    "optimization passes", "register allocation",
    "type theory", "type system", "dependent types",
    "theorem proving", "coq", "isabelle",
    "model checking", "formal verification",
    "program synthesis", "program analysis",
    "automata theory", "turing machine", "lambda calculus",

    # ── Miscellaneous technical identifiers ───────────────────────────────
    "api", "sdk", "ide", "cli", "gui",
    "crud", "orm",
    "regex", "utf8", "unicode",
    "hashing", "compression",
    "latency", "throughput", "scalability",
    "monitoring", "logging", "tracing", "alerting",
    "recursion", "iteration",
    "compilation", "interpretation", "transpilation",
    "polymorphism", "inheritance", "encapsulation", "abstraction",
    "serialization", "deserialization", "protobuf", "avro",
    "load balancing", "rate limiting", "caching",
})

# Sorted longest-first so phrase matches consume the most tokens
_VOCAB_SORTED: list[str] = sorted(CS_TECH_VOCAB, key=len, reverse=True)

# Precompile word-boundary patterns for each vocab term
_VOCAB_PATTERNS: list[tuple[str, re.Pattern]] = [
    (term, re.compile(r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])"))
    for term in _VOCAB_SORTED
]


# ─────────────────────────────────────────────────────────────────────────────
# 4. PROFILE TEXT BUILDERS
# ─────────────────────────────────────────────────────────────────────────────

def build_mentor_text(mentor: dict) -> str:
    skills      = " ".join(mentor.get("technical_skills") or [])
    forte       = " ".join(mentor.get("forte") or [])
    description = mentor.get("self_description") or ""

    prev_thesis = mentor.get("prev_mentored_thesis") or []
    if isinstance(prev_thesis, str):
        prev_thesis_text = prev_thesis
    elif isinstance(prev_thesis, list):
        prev_thesis_text = " ".join(
            t.get("title", "") if isinstance(t, dict) else str(t)
            for t in prev_thesis
        )
    else:
        prev_thesis_text = ""

    papers = mentor.get("published_papers") or []
    if isinstance(papers, str):
        papers_text = papers
    elif isinstance(papers, list):
        papers_text = " ".join(
            p.get("title", "") if isinstance(p, dict) else str(p)
            for p in papers
        )
    else:
        papers_text = ""

    return f"{skills} {forte} {description} {prev_thesis_text} {papers_text}".strip()


def build_mentee_text(mentee: dict) -> str:
    title       = mentee.get("research_title") or ""
    description = mentee.get("research_description") or ""
    preference  = mentee.get("mentor_preference") or ""
    return f"{title} {description} {preference}".strip()


# ─────────────────────────────────────────────────────────────────────────────
# 5. KEYWORD EXTRACTION
# ─────────────────────────────────────────────────────────────────────────────

def _extract_vocab_matches(cleaned_text: str) -> list[str]:
    """
    Phase 1: scan cleaned text for known technical vocab terms.
    Longest match wins — once a phrase is matched its token positions
    are masked so shorter sub-phrases cannot fire on the same tokens.
    """
    found: list[str] = []
    masked = cleaned_text

    for term, pattern in _VOCAB_PATTERNS:
        if pattern.search(masked):
            found.append(term)
            # Mask consumed tokens so sub-terms don't re-match
            masked = pattern.sub(" " * len(term), masked)

    return found


def _tfidf_residuals(cleaned_text: str, n: int) -> list[str]:
    """
    Phase 2: TF-IDF extraction from cleaned text, returning up to n terms
    that are not in ACADEMIC_STOP_WORDS and have length > 2.
    """
    if n <= 0 or not cleaned_text.strip():
        return []

    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=400,
        ngram_range=(1, 2),
        min_df=1,
        sublinear_tf=True,
    )
    try:
        mat    = vectorizer.fit_transform([cleaned_text])
        names  = vectorizer.get_feature_names_out()
        scores = dict(zip(names, mat.toarray()[0]))

        scored = [(t, s) for t, s in scores.items() if s > 0]

        # Bigrams first, then unigrams (same logic as original)
        bigrams  = sorted([(t, s) for t, s in scored if len(t.split()) == 2],
                          key=lambda x: x[1], reverse=True)
        unigrams = sorted([(t, s) for t, s in scored if len(t.split()) == 1],
                          key=lambda x: x[1], reverse=True)

        selected: list[str] = []
        covered: set[str]   = set()

        for term, _ in bigrams:
            tokens = set(term.split())
            if not tokens.issubset(covered):
                # Reject bigrams where the whole term or any token is filler
                if (term not in ACADEMIC_STOP_WORDS
                        and not any(t in ACADEMIC_STOP_WORDS for t in tokens)
                        and len(term) > 2):
                    selected.append(term)
                    covered.update(tokens)

        for term, _ in unigrams:
            if term not in covered:
                if term not in ACADEMIC_STOP_WORDS and len(term) > 2:
                    selected.append(term)
                    covered.add(term)

        return selected[:n]
    except Exception:
        return []


def _depluralize(text: str) -> str:
    """
    Strip common English plural/gerund suffixes so vocab matching works on
    both 'neural network' and 'neural networks', 'algorithm' and 'algorithms'.
    Applied on a word-by-word basis, only for words not in the vocab directly.
    This is a lightweight heuristic, not a full stemmer.
    """
    words = text.split()
    result = []
    for w in words:
        # Strip trailing 's' for words longer than 4 chars (avoid "bfs" → "bf")
        if len(w) > 4 and w.endswith("s") and not w.endswith("ss"):
            result.append(w[:-1])
        else:
            result.append(w)
    return " ".join(result)


def get_profile_keywords(text: str, top_n: int = 20) -> list[str]:
    """
    Extracts up to top_n technical keywords from profile text.

    Phase 1 — technical vocabulary scan (priority):
        Directly matches known CS terms (algorithms, languages, frameworks,
        data structures, etc.) using longest-match-first scanning.
        Also scans a depluralized copy to catch plural forms.
    Phase 2 — TF-IDF residuals:
        Fills remaining slots from TF-IDF, filtered against academic filler
        and against tokens already covered by Phase 1 vocab hits.
    """
    cleaned = clean_text(text)
    if not cleaned:
        return []

    # Phase 1: vocab scan on original AND depluralized text
    vocab_hits_orig = _extract_vocab_matches(cleaned)
    depluralized    = _depluralize(cleaned)
    vocab_hits_dep  = _extract_vocab_matches(depluralized)

    # Merge: add any hits found only in depluralized form (avoid duplicates)
    seen_vocab = set(vocab_hits_orig)
    vocab_hits = list(vocab_hits_orig)
    for term in vocab_hits_dep:
        if term not in seen_vocab:
            vocab_hits.append(term)
            seen_vocab.add(term)

    # Track all tokens covered by vocab hits (both singular and naive plural)
    # so TF-IDF can't re-combine them into junk bigrams.
    covered_tokens: set[str] = set()
    for term in vocab_hits:
        for token in term.split():
            covered_tokens.add(token)
            # naive pluralisation: add "s" variant so "network" also blocks "networks"
            if token.endswith("s"):
                covered_tokens.add(token[:-1])   # "networks" → "network"
            else:
                covered_tokens.add(token + "s")  # "network"  → "networks"

    # Phase 2 — fill remaining slots with TF-IDF terms not in covered tokens.
    # Skip any TF-IDF term if ANY of its tokens is already covered; this prevents
    # junk bigrams like "bfs strengths", "learn published", "adversarial networks".
    remaining_slots = top_n - len(vocab_hits)
    tfidf_hits      = _tfidf_residuals(cleaned, remaining_slots * 3)

    extras: list[str] = []
    for term in tfidf_hits:
        tokens = set(term.split())
        if tokens & covered_tokens:        # any token already covered → skip
            continue
        if term not in seen_vocab:
            extras.append(term)
            seen_vocab.add(term)
            covered_tokens.update(tokens)
            covered_tokens.update(t + "s" for t in tokens)
            if len(extras) >= remaining_slots:
                break

    return (vocab_hits + extras)[:top_n]


def get_mentor_keywords(mentor: dict, top_n: int = 20) -> list[str]:
    return get_profile_keywords(build_mentor_text(mentor), top_n)


def get_mentee_keywords(mentee: dict, top_n: int = 20) -> list[str]:
    return get_profile_keywords(build_mentee_text(mentee), top_n)


# ─────────────────────────────────────────────────────────────────────────────
# 6. LEGACY TF-IDF EXTRACTION (kept for compatibility)
# ─────────────────────────────────────────────────────────────────────────────

def extract_tfidf_keywords(texts: list[str], top_n: int = 10):
    """Batch TF-IDF keyword extraction across multiple documents."""
    cleaned = [clean_text(t) for t in texts]

    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=200,
        ngram_range=(1, 2),
    )
    tfidf_matrix  = vectorizer.fit_transform(cleaned)
    feature_names = vectorizer.get_feature_names_out()

    keywords_per_doc = []
    for row in tfidf_matrix:
        scores       = zip(feature_names, row.toarray()[0])
        sorted_scores = sorted(scores, key=lambda x: x[1], reverse=True)
        keywords     = [word for word, score in sorted_scores if score > 0][:top_n]
        keywords_per_doc.append(keywords)

    return keywords_per_doc, vectorizer, tfidf_matrix
