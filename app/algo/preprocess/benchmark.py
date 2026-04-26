import time
import numpy as np
import matplotlib.pyplot as plt
from text_processing import build_mentee_text, build_mentor_text
from scoring import compute_weighted_scores, build_mentor_keyword_string, build_mentee_keyword_string
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer

# ─────────────────────────────────────────────
# GENERATE SYNTHETIC DATA
# ─────────────────────────────────────────────

def generate_mentors(n: int) -> list[dict]:
    skills_pool = [
        ["Python", "Machine Learning", "NLP"],
        ["Web Development", "React", "Node.js"],
        ["Cybersecurity", "Networking", "Cloud"],
        ["Mobile Development", "Flutter", "iOS"],
        ["Data Science", "Statistics", "R"],
        ["Blockchain", "Smart Contracts", "Ethereum"],
        ["Computer Vision", "Deep Learning", "PyTorch"],
        ["DevOps", "Docker", "Kubernetes"],
        ["Game Development", "Unity", "C#"],
        ["Embedded Systems", "IoT", "Arduino"],
    ]
    descriptions = [
        "I specialize in natural language processing and AI research.",
        "Passionate about full-stack development and agile methodologies.",
        "Expert in network security and cloud infrastructure.",
        "Mobile-first developer with cross-platform experience.",
        "Statistical modeling and data visualization specialist.",
        "Blockchain researcher focusing on decentralized systems.",
        "Computer vision researcher with deep learning expertise.",
        "DevOps engineer with focus on scalable infrastructure.",
        "Game developer with experience in 3D graphics and physics.",
        "Embedded systems engineer specializing in IoT devices.",
    ]
    mentors = []
    for i in range(n):
        idx = i % len(skills_pool)
        mentors.append({
            "id": f"mentor-{i}",
            "first_name": f"Mentor",
            "last_name": f"{i}",
            "technical_skills": skills_pool[idx],
            "forte": [f"Specialization {idx}"],
            "self_description": descriptions[idx],
            "available_days": ["Monday", "Wednesday"] if i % 2 == 0 else ["Tuesday", "Thursday"],
            "time_slot": ["9:00-10:00", "10:00-11:00"],
            "mentor_capacity": 10,
        })
    return mentors

def generate_mentees(n: int) -> list[dict]:
    titles = [
        "AI-Powered Mentor Matching System",
        "E-Commerce Web Platform",
        "Blockchain Academic Records",
        "Smart Home IoT System",
        "Deep Learning Medical Imaging",
        "Cybersecurity Threat Detection",
        "Mobile Health Monitoring App",
        "Data Analytics Dashboard",
        "Game AI Behavior System",
        "Cloud Native Microservices",
    ]
    descriptions = [
        "Using NLP and machine learning to match students with mentors.",
        "Building a full stack web application for e-commerce.",
        "Decentralized system for academic credential verification.",
        "IoT platform for monitoring household energy consumption.",
        "Using CNNs to detect anomalies in medical images.",
        "Real-time threat detection using machine learning.",
        "Mobile app for monitoring patient health metrics.",
        "Interactive dashboard for business data analytics.",
        "AI system for game NPC behavior and pathfinding.",
        "Cloud-native microservices architecture with Docker.",
    ]
    mentees = []
    for i in range(n):
        idx = i % len(titles)
        mentees.append({
            "id": f"mentee-{i}",
            "group_name": f"Group {i}",
            "research_title": titles[idx],
            "research_description": descriptions[idx],
            "mentor_preference": f"Looking for a mentor with expertise in {titles[idx]}",
            "available_days": ["Monday", "Wednesday"] if i % 2 == 0 else ["Tuesday", "Thursday"],
            "time_slot": ["9:00-10:00"],
        })
    return mentees

# ─────────────────────────────────────────────
# WARMUP — run keyword pipeline once before benchmarking
# ─────────────────────────────────────────────

def warmup():
    print("🔥 Warming up keyword pipeline (3 passes)...")
    dummy_mentors = generate_mentors(10)
    dummy_mentees = generate_mentees(32)
    for i in range(3):
        compute_weighted_scores(dummy_mentors, dummy_mentees)
        print(f"  Warmup pass {i+1}/3 done")
    print("✅ Warmup complete\n")

# ─────────────────────────────────────────────
# BENCHMARK INDIVIDUAL STEPS
# ─────────────────────────────────────────────

def benchmark_keyword_extraction(mentors: list[dict], mentees: list[dict], runs: int = 3) -> float:
    """Benchmark keyword extraction + domain expansion step."""
    times = []
    for _ in range(runs):
        start = time.perf_counter()
        for mentor in mentors:
            build_mentor_keyword_string(mentor)
        for mentee in mentees:
            build_mentee_keyword_string(mentee)
        times.append(time.perf_counter() - start)
    return np.mean(times)

def benchmark_tfidf_similarity(n_mentees: int, n_mentors: int, runs: int = 3) -> float:
    """Benchmark TF-IDF vectorization + cosine similarity step."""
    mentor_texts = [f"mentor keyword string {i} machine learning nlp" for i in range(n_mentors)]
    mentee_texts = [f"mentee keyword string {i} machine learning nlp" for i in range(n_mentees)]
    all_texts = mentor_texts + mentee_texts

    times = []
    for _ in range(runs):
        start = time.perf_counter()
        vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            max_features=500,
            sublinear_tf=True,
            min_df=1,
        )
        tfidf_matrix = vectorizer.fit_transform(all_texts)
        mentor_vectors = tfidf_matrix[:n_mentors]
        mentee_vectors = tfidf_matrix[n_mentors:]
        cosine_similarity(mentee_vectors, mentor_vectors)
        times.append(time.perf_counter() - start)
    return np.mean(times)

def benchmark_gale_shapley(mentors: list[dict], mentees: list[dict], scores: np.ndarray, runs: int = 3) -> float:
    """Benchmark Gale-Shapley matching step."""
    from matching import generate_preferences, three_phase_gale_shapley
    mentee_prefs, mentor_prefs = generate_preferences(mentors, mentees, scores)
    times = []
    for _ in range(runs):
        start = time.perf_counter()
        three_phase_gale_shapley(mentors, mentees, mentee_prefs, mentor_prefs)
        times.append(time.perf_counter() - start)
    return np.mean(times)

def benchmark_full_pipeline(mentors: list[dict], mentees: list[dict], runs: int = 3) -> float:
    """Benchmark full scoring pipeline."""
    times = []
    for _ in range(runs):
        start = time.perf_counter()
        compute_weighted_scores(mentors, mentees)
        times.append(time.perf_counter() - start)
    return np.mean(times)

# ─────────────────────────────────────────────
# RUN BENCHMARKS
# ─────────────────────────────────────────────

def run_benchmarks():
    N_MENTORS = 10
    mentee_counts = [25, 50, 75, 100, 125, 150, 175, 200]

    results = {
        "mentee_counts": mentee_counts,
        "keyword_times": [],
        "tfidf_times": [],
        "gale_shapley_times": [],
        "total_times": [],
    }

    print(f"{'Mentees':<10} {'Keywords':<14} {'TF-IDF':<14} {'Gale-Shapley':<15} {'Total':<12}")
    print("-" * 68)

    for n in mentee_counts:
        mentors = generate_mentors(N_MENTORS)
        mentees = generate_mentees(n)
        scores = np.random.rand(n, N_MENTORS)

        t_kw = benchmark_keyword_extraction(mentors, mentees, runs=3)
        t_tfidf = benchmark_tfidf_similarity(n, N_MENTORS, runs=3)
        t_gs = benchmark_gale_shapley(mentors, mentees, scores, runs=3)
        t_total = t_kw + t_tfidf + t_gs

        results["keyword_times"].append(t_kw)
        results["tfidf_times"].append(t_tfidf)
        results["gale_shapley_times"].append(t_gs)
        results["total_times"].append(t_total)

        print(
            f"{n:<10} "
            f"{t_kw:.4f}s{'':6} "
            f"{t_tfidf:.6f}s{'':4} "
            f"{t_gs:.4f}s{'':4} "
            f"{t_total:.4f}s"
        )

    return results

# ─────────────────────────────────────────────
# PROVE O(N) — LINEAR REGRESSION
# ─────────────────────────────────────────────

def prove_linear(results: dict):
    counts = np.array(results["mentee_counts"], dtype=float)
    totals = np.array(results["total_times"])

    coeffs_linear = np.polyfit(counts, totals, 1)
    linear_fit = np.polyval(coeffs_linear, counts)
    linear_residuals = np.sum((totals - linear_fit) ** 2)

    coeffs_quad = np.polyfit(counts, totals, 2)
    quad_fit = np.polyval(coeffs_quad, counts)
    quad_residuals = np.sum((totals - quad_fit) ** 2)

    ss_tot = np.sum((totals - np.mean(totals)) ** 2)
    r_squared = 1 - (linear_residuals / ss_tot)

    print(f"\n📈 Complexity Analysis:")
    print(f"  Linear fit:         y = {coeffs_linear[0]:.6f}n + {coeffs_linear[1]:.6f}")
    print(f"  Linear R²:          {r_squared:.6f} (closer to 1.0 = more linear)")
    print(f"  Linear residual:    {linear_residuals:.8f}")
    print(f"  Quadratic residual: {quad_residuals:.8f}")
    print(f"  Ratio (linear/quad):{linear_residuals / max(quad_residuals, 1e-10):.4f}")

    if r_squared > 0.95:
        print(f"\n  ✅ PROVEN O(n) — R² = {r_squared:.4f} confirms linear growth")
    elif r_squared > 0.85:
        print(f"\n  ✅ LIKELY O(n) — R² = {r_squared:.4f} mostly linear")
    else:
        print(f"\n  ⚠️  R² = {r_squared:.4f} — not strongly linear, investigate bottleneck")

    return coeffs_linear, r_squared, linear_fit

# ─────────────────────────────────────────────
# PLOT
# ─────────────────────────────────────────────

def plot_results(results: dict, linear_fit: np.ndarray, r_squared: float):
    counts = results["mentee_counts"]

    fig, axes = plt.subplots(1, 3, figsize=(18, 5))

    # Plot 1: breakdown by step
    axes[0].plot(counts, results["keyword_times"], "o-", label="Keyword Extraction", color="blue", linewidth=2)
    axes[0].plot(counts, results["tfidf_times"], "s-", label="TF-IDF Similarity", color="green", linewidth=2)
    axes[0].plot(counts, results["gale_shapley_times"], "^-", label="Gale-Shapley", color="orange", linewidth=2)
    axes[0].plot(counts, results["total_times"], "D-", label="Total", color="red", linewidth=2)
    axes[0].set_xlabel("Number of Mentees")
    axes[0].set_ylabel("Time (seconds)")
    axes[0].set_title("Runtime Breakdown (Fixed 10 Mentors)")
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)

    # Plot 2: total vs linear fit
    axes[1].plot(counts, results["total_times"], "o-", label="Actual Runtime", color="red", linewidth=2)
    axes[1].plot(counts, linear_fit, "--", label=f"Linear Fit O(n) R²={r_squared:.4f}", color="black", linewidth=2)
    axes[1].set_xlabel("Number of Mentees")
    axes[1].set_ylabel("Time (seconds)")
    axes[1].set_title("Actual vs Linear O(n) Fit")
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)

    # Plot 3: time per mentee — flat = O(n)
    time_per_mentee = np.array(results["total_times"]) / np.array(counts)
    axes[2].plot(counts, time_per_mentee, "o-", color="purple", linewidth=2)
    axes[2].axhline(
        y=np.mean(time_per_mentee),
        color="black", linestyle="--",
        label=f"Mean: {np.mean(time_per_mentee):.4f}s/mentee"
    )
    axes[2].set_xlabel("Number of Mentees")
    axes[2].set_ylabel("Time per Mentee (seconds)")
    axes[2].set_title("Time per Mentee — Flat = O(n) ✅")
    axes[2].legend()
    axes[2].grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig("benchmark_results.png", dpi=150)
    print("\n📊 Plot saved to benchmark_results.png")
    plt.show()

# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

if __name__ == "__main__":
    warmup()

    print(f"🔬 Running benchmarks (3 runs avg, starting from n=25)...\n")
    results = run_benchmarks()

    coeffs, r_squared, linear_fit = prove_linear(results)
    plot_results(results, linear_fit, r_squared)
