"""
visualize_results.py

Generates performance charts for the most recent matching run stored in
algorithm_logs.  Produces a single four-panel figure saved to
docs/figures/matching_performance.png.

Panels:
  1. Dissatisfaction comparison  — mentee-optimal vs mentor-optimal
  2. Compatibility score distribution — histogram of final match scores
  3. Mentee preference rank distribution — what rank each mentee got
  4. Mentor preference rank distribution — what rank each mentor got

Usage (from repo root, with the algo venv active):
    python app/algo/preprocess/visualize_results.py
    python app/algo/preprocess/visualize_results.py --show
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")          # must be set before importing pyplot
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

OUT_DIR = Path(__file__).resolve().parents[3] / "docs" / "figures"
OUT_FILE = OUT_DIR / "matching_performance.png"


# ─────────────────────────────────────────────────────────────────────────────
# DATA FETCHING
# ─────────────────────────────────────────────────────────────────────────────

def _supabase():
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def fetch_latest_log(sb) -> dict:
    res = sb.table("algorithm_logs").select("log_data").order("created_at", desc=True).limit(1).execute()
    if not res.data:
        sys.exit("No algorithm logs found. Run the matching algorithm first.")
    return res.data[0]["log_data"]


def fetch_preference_ranks(sb) -> tuple[list[int], list[int]]:
    """
    Returns (mentee_ranks, mentor_ranks) where each value is the 1-based rank
    of the assigned partner in that person's preference list.
    Rank 1 = top choice.
    """
    active_matches = sb.table("matches").select("mentor_id, mentee_group_id").eq("status", "active").execute().data

    mentee_to_mentor: dict[str, str] = {r["mentee_group_id"]: r["mentor_id"] for r in active_matches}
    mentor_to_mentees: dict[str, set[str]] = {}
    for r in active_matches:
        mentor_to_mentees.setdefault(r["mentor_id"], set()).add(r["mentee_group_id"])

    # Mentee side — what rank is the assigned mentor in each mentee's list?
    mentee_prefs = sb.table("mentee_preferences").select("mentee_group_id, ranked_mentors").execute().data
    mentee_ranks: list[int] = []
    for row in mentee_prefs:
        mid = row["mentee_group_id"]
        assigned = mentee_to_mentor.get(mid)
        if not assigned:
            continue
        for entry in (row.get("ranked_mentors") or []):
            if entry.get("mentor_id") == assigned:
                mentee_ranks.append(entry["rank"])
                break

    # Mentor side — what rank is each assigned mentee in the mentor's list?
    mentor_prefs = sb.table("mentor_preferences").select("mentor_id, ranked_mentees").execute().data
    mentor_ranks: list[int] = []
    for row in mentor_prefs:
        mid = row["mentor_id"]
        assigned_mentees = mentor_to_mentees.get(mid, set())
        if not assigned_mentees:
            continue
        for entry in (row.get("ranked_mentees") or []):
            if entry.get("mentee_group_id") in assigned_mentees:
                mentor_ranks.append(entry["rank"])

    return mentee_ranks, mentor_ranks


# ─────────────────────────────────────────────────────────────────────────────
# CHART HELPERS
# ─────────────────────────────────────────────────────────────────────────────

TEAL    = "#2DD4BF"
SLATE   = "#94A3B8"
GREEN   = "#22C55E"
AMBER   = "#F59E0B"
RED     = "#EF4444"
EMERALD = "#10B981"
INDIGO  = "#6366F1"

def _bar_label(ax, bars, fmt="{:.4f}", pad=0.003):
    for bar in bars:
        h = bar.get_height()
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            h + pad,
            fmt.format(h),
            ha="center", va="bottom", fontsize=7.5, color="#334155",
        )


# ─────────────────────────────────────────────────────────────────────────────
# PANEL 1 — DISSATISFACTION COMPARISON
# ─────────────────────────────────────────────────────────────────────────────

def plot_dissatisfaction(ax, log: dict) -> None:
    d = log.get("dissatisfaction")
    if not d:
        ax.text(0.5, 0.5, "No dissatisfaction data in this log",
                ha="center", va="center", transform=ax.transAxes, color="gray")
        return

    mo  = d["mentee_optimal"]
    meo = d["mentor_optimal"]
    selected = d.get("selected", "")

    categories = ["Mentee side", "Mentor side", "Combined"]
    mo_vals    = [mo["mentee"],  mo["mentor"],  mo["total"]]
    meo_vals   = [meo["mentee"], meo["mentor"], meo["total"]]

    x     = np.arange(len(categories))
    width = 0.33

    # Highlight the selected variant
    mo_color  = EMERALD if "mentee" in selected else SLATE
    meo_color = INDIGO  if "mentor"  in selected else SLATE

    bars_mo  = ax.bar(x - width / 2, mo_vals,  width, label="Mentee-Optimal (A₁)", color=mo_color,  alpha=0.85, zorder=3)
    bars_meo = ax.bar(x + width / 2, meo_vals, width, label="Mentor-Optimal (A₂)",  color=meo_color, alpha=0.85, zorder=3)

    _bar_label(ax, bars_mo)
    _bar_label(ax, bars_meo)

    ax.set_xticks(x)
    ax.set_xticklabels(categories, fontsize=9)
    ax.set_ylabel("Average rank (lower = better)", fontsize=8.5)
    ax.set_title("Dissatisfaction Comparison\n(Mentee-Optimal vs Mentor-Optimal)", fontsize=10, fontweight="bold")
    ax.legend(fontsize=8)
    ax.set_ylim(0, max(max(mo_vals), max(meo_vals)) * 1.35)
    ax.yaxis.grid(True, linestyle="--", alpha=0.5, zorder=0)
    ax.set_axisbelow(True)

    # Annotate selected
    sel_label = "Mentee-Optimal selected ✓" if "mentee" in selected else "Mentor-Optimal selected ✓"
    ax.text(0.98, 0.97, sel_label, ha="right", va="top", transform=ax.transAxes,
            fontsize=8, color=EMERALD if "mentee" in selected else INDIGO,
            fontweight="bold")


# ─────────────────────────────────────────────────────────────────────────────
# PANEL 2 — COMPATIBILITY SCORE DISTRIBUTION
# ─────────────────────────────────────────────────────────────────────────────

def plot_score_distribution(ax, log: dict) -> None:
    matches = log.get("phase3", {}).get("matches", [])
    if not matches:
        ax.text(0.5, 0.5, "No match data in this log",
                ha="center", va="center", transform=ax.transAxes, color="gray")
        return

    scores = [m["score"] for m in matches]
    bins = np.linspace(0, 1, 11)   # 10 equal-width bins

    # Color each bin
    bar_colors = []
    for left in bins[:-1]:
        mid = left + 0.05
        if mid >= 0.75:
            bar_colors.append(GREEN)
        elif mid >= 0.55:
            bar_colors.append(AMBER)
        else:
            bar_colors.append(RED)

    n, _, patches = ax.hist(scores, bins=bins, color=SLATE, edgecolor="white", linewidth=0.8, zorder=3)
    for patch, color in zip(patches, bar_colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.85)

    # Annotate bar heights
    for rect in patches:
        h = rect.get_height()
        if h > 0:
            ax.text(rect.get_x() + rect.get_width() / 2, h + 0.1, str(int(h)),
                    ha="center", va="bottom", fontsize=8, color="#334155")

    avg = float(np.mean(scores))
    ax.axvline(avg, color="#1E293B", linestyle="--", linewidth=1.3, zorder=4)
    ax.text(avg + 0.01, ax.get_ylim()[1] * 0.92,
            f"avg = {avg:.3f}", fontsize=8, color="#1E293B")

    legend_patches = [
        mpatches.Patch(color=GREEN, label="Strong  (≥ 0.75)"),
        mpatches.Patch(color=AMBER, label="Good    (0.55–0.75)"),
        mpatches.Patch(color=RED,   label="Limited (< 0.55)"),
    ]
    ax.legend(handles=legend_patches, fontsize=8, loc="upper left")
    ax.set_xlabel("Compatibility score", fontsize=8.5)
    ax.set_ylabel("Number of matches", fontsize=8.5)
    ax.set_title(f"Compatibility Score Distribution\n({len(scores)} final matches)", fontsize=10, fontweight="bold")
    ax.yaxis.grid(True, linestyle="--", alpha=0.5, zorder=0)
    ax.set_axisbelow(True)


# ─────────────────────────────────────────────────────────────────────────────
# PANEL 3 & 4 — PREFERENCE RANK DISTRIBUTION
# ─────────────────────────────────────────────────────────────────────────────

def plot_rank_distribution(ax, ranks: list[int], title: str, color: str) -> None:
    if not ranks:
        ax.text(0.5, 0.5, "No preference data available",
                ha="center", va="center", transform=ax.transAxes, color="gray")
        return

    max_rank = max(ranks)
    rank_counts = [ranks.count(r) for r in range(1, max_rank + 1)]
    xs = list(range(1, max_rank + 1))

    bars = ax.bar(xs, rank_counts, color=color, alpha=0.85, edgecolor="white", linewidth=0.8, zorder=3)
    for bar, count in zip(bars, rank_counts):
        if count > 0:
            ax.text(bar.get_x() + bar.get_width() / 2, count + 0.05, str(count),
                    ha="center", va="bottom", fontsize=8.5, color="#334155")

    pct_top3 = sum(1 for r in ranks if r <= 3) / len(ranks) * 100
    ax.text(0.97, 0.97,
            f"{pct_top3:.0f}% got a top-3 match",
            ha="right", va="top", transform=ax.transAxes,
            fontsize=8, color="#1E293B", fontweight="bold")

    ax.set_xlabel("Preference rank of assigned partner", fontsize=8.5)
    ax.set_ylabel("Count", fontsize=8.5)
    ax.set_title(title, fontsize=10, fontweight="bold")
    ax.set_xticks(xs)
    ax.set_xticklabels([f"#{r}" for r in xs], fontsize=8.5)
    ax.yaxis.grid(True, linestyle="--", alpha=0.5, zorder=0)
    ax.set_axisbelow(True)
    ax.set_ylim(0, max(rank_counts) * 1.35)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main(show: bool = False) -> None:
    print("Connecting to Supabase...")
    sb = _supabase()

    print("Fetching latest algorithm log...")
    log = fetch_latest_log(sb)

    print("Fetching preference ranks from DB...")
    mentee_ranks, mentor_ranks = fetch_preference_ranks(sb)

    ts = log.get("timestamp", "")
    matched = log.get("matched", "?")
    algo = log.get("algorithm", "?")

    print(f"  Run: {ts}  |  Matched: {matched}  |  Algorithm: {algo}")
    print(f"  Mentee ranks: {sorted(mentee_ranks)}")
    print(f"  Mentor ranks: {sorted(mentor_ranks)}")

    d = log.get("dissatisfaction", {})
    if d:
        sel = d.get("selected", "?")
        mo  = d.get("mentee_optimal", {})
        meo = d.get("mentor_optimal", {})
        print(f"\n  Dissatisfaction scores:")
        print(f"    Mentee-Optimal  → mentee: {mo.get('mentee'):.4f}  mentor: {mo.get('mentor'):.4f}  total: {mo.get('total'):.4f}")
        print(f"    Mentor-Optimal  → mentee: {meo.get('mentee'):.4f}  mentor: {meo.get('mentor'):.4f}  total: {meo.get('total'):.4f}")
        print(f"    Selected: {sel}")

    # ── Build figure ──────────────────────────────────────────────────────────
    fig, axes = plt.subplots(2, 2, figsize=(13, 9))
    fig.suptitle(
        f"Matching Performance Report\n"
        f"Run: {ts[:19].replace('T', ' ')}  ·  {matched} pairs  ·  {algo}",
        fontsize=12, fontweight="bold", y=0.98,
    )

    plot_dissatisfaction(axes[0][0], log)
    plot_score_distribution(axes[0][1], log)
    plot_rank_distribution(axes[1][0], mentee_ranks, "Mentee Preference Rank Distribution\n(rank of assigned mentor in mentee's list)", TEAL)
    plot_rank_distribution(axes[1][1], mentor_ranks, "Mentor Preference Rank Distribution\n(rank of each assigned mentee in mentor's list)", INDIGO)

    fig.tight_layout(rect=[0, 0, 1, 0.96])

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT_FILE, dpi=150, bbox_inches="tight")
    print(f"\nSaved → {OUT_FILE}")

    if show:
        matplotlib.use("TkAgg")
        plt.show()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--show", action="store_true", help="Display figure interactively after saving")
    args = parser.parse_args()
    main(show=args.show)
