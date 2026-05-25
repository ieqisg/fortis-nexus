"""
generate_cf.py

Generates the Conceptual Framework diagram for Fortis Nexus.
Saved to docs/figures/conceptual_framework.png

Usage (from repo root, venv active):
    python app/algo/preprocess/generate_cf.py
"""

from __future__ import annotations

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from pathlib import Path

OUT_DIR  = Path(__file__).resolve().parents[3] / "docs" / "figures"
OUT_FILE = OUT_DIR / "conceptual_framework.png"

# ── Palette ───────────────────────────────────────────────────────────────────
WHITE       = "#FFFFFF"
BOX_BG      = "#FFFFFF"
HDR_BG      = "#DBEAFE"   # light blue header band (matches academic style)
BORDER      = "#334155"
TITLE_C     = "#1E293B"
SECTION_C   = "#1E293B"
BODY_C      = "#334155"
ARROW_C     = "#475569"
FIG_BG      = "#F1F5F9"

# ── Figure ────────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(17, 10.5))
ax.set_xlim(0, 17)
ax.set_ylim(0, 10.5)
ax.axis("off")
fig.patch.set_facecolor(FIG_BG)
ax.set_facecolor(FIG_BG)

# ── Helpers ───────────────────────────────────────────────────────────────────
def rect(x, y, w, h, face=BOX_BG, edge=BORDER, lw=1.8, zorder=2):
    ax.add_patch(FancyBboxPatch(
        (x, y), w, h,
        boxstyle="square,pad=0",
        linewidth=lw, edgecolor=edge, facecolor=face, zorder=zorder,
    ))

def header_band(x, y_top, w, title, fs=11):
    """Draws a shaded header band at the top of a box."""
    band_h = 0.55
    rect(x, y_top - band_h, w, band_h, face=HDR_BG, edge=BORDER, lw=0, zorder=3)
    ax.text(x + w / 2, y_top - band_h / 2,
            title, ha="center", va="center",
            fontsize=fs, fontweight="bold", color=TITLE_C, zorder=4)

def t(x, y, s, fs=8.4, bold=False, color=BODY_C, ha="left", va="top", zorder=4):
    ax.text(x, y, s,
            ha=ha, va=va,
            fontsize=fs, fontweight="bold" if bold else "normal",
            color=color, zorder=zorder)

def section(x, y, label):
    t(x, y, label, fs=9.0, bold=True, color=SECTION_C)

def divider(x1, x2, y, alpha=0.35):
    ax.plot([x1, x2], [y, y], color=BORDER, lw=0.7, alpha=alpha, zorder=3)

def arrow(x1, y1, x2, y2, rad=0.0):
    ax.annotate(
        "", xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(
            arrowstyle="-|>",
            color=ARROW_C,
            lw=1.7,
            mutation_scale=14,
            connectionstyle=f"arc3,rad={rad}",
        ),
        zorder=5,
    )

# ═════════════════════════════════════════════════════════════════════════════
# MAIN TITLE
# ═════════════════════════════════════════════════════════════════════════════
ax.text(8.5, 10.25,
        'Conceptual Framework for: "Fortis Nexus: A Web-Based Automated'
        ' Mentor-Mentee Matching System"',
        ha="center", va="center",
        fontsize=11.5, fontstyle="italic", color=TITLE_C, zorder=4)

# ═════════════════════════════════════════════════════════════════════════════
# BOX COORDINATES
# ═════════════════════════════════════════════════════════════════════════════
# INPUT  ─────────────── full height left column
IX, IY, IW, IH = 0.15, 0.15, 4.55, 9.7

# PROCESS ─────────────── upper center
PX, PY, PW, PH = 5.0, 3.9, 5.6, 5.95

# OUTPUT  ─────────────── upper right
OX, OY, OW, OH = 10.95, 3.9, 5.9, 5.95

# EVALUATION ─────────── lower center
EX, EY, EW, EH = 5.0, 0.15, 5.6, 3.45

# ── Draw boxes ────────────────────────────────────────────────────────────────
for (x, y, w, h) in [(IX, IY, IW, IH), (PX, PY, PW, PH),
                     (OX, OY, OW, OH), (EX, EY, EW, EH)]:
    rect(x, y, w, h)

# ── Header bands ──────────────────────────────────────────────────────────────
header_band(IX, IY + IH, IW, "INPUT")
header_band(PX, PY + PH, PW, "PROCESS")
header_band(OX, OY + OH, OW, "OUTPUT")
header_band(EX, EY + EH, EW, "EVALUATION")

# ═════════════════════════════════════════════════════════════════════════════
# ARROWS
# ═════════════════════════════════════════════════════════════════════════════
# INPUT → PROCESS (mid-height horizontal)
arrow(IX + IW, IY + IH / 2 + 0.5, PX, PY + PH / 2 + 0.4)

# PROCESS → OUTPUT (horizontal, same y)
arrow(PX + PW, PY + PH / 2 + 0.4, OX, OY + OH / 2 + 0.4)

# OUTPUT → EVALUATION  (right edge of OUTPUT → down → left → EVALUATION right edge)
# Draw as a two-segment polyline + arrow head
mid_x = OX + OW * 0.5
ax.annotate(
    "", xy=(EX + EW, EY + EH / 2), xytext=(mid_x, OY),
    arrowprops=dict(
        arrowstyle="-|>",
        color=ARROW_C,
        lw=1.7,
        mutation_scale=14,
        connectionstyle="angle,angleA=90,angleB=0,rad=0",
    ),
    zorder=5,
)

# ═════════════════════════════════════════════════════════════════════════════
# INPUT CONTENT
# ═════════════════════════════════════════════════════════════════════════════
lx = IX + 0.18   # left text margin inside INPUT

# Knowledge Requirements
section(lx, IY + IH - 0.72, "Knowledge Requirements")
kr = [
    "• Stable Matching Theory",
    "  (Gale-Shapley / Hospital-Resident",
    "   Algorithm)",
    "• Natural Language Processing",
    "  (TF-IDF, Cosine Similarity)",
    "• Web Development",
    "  (Next.js, React, TypeScript)",
    "• Python Programming",
    "  (scikit-learn, NumPy)",
    "• Research Mentoring &",
    "  Academic Domain Knowledge",
]
for i, line in enumerate(kr):
    t(lx, IY + IH - 1.03 - i * 0.365, line)

divider(IX + 0.12, IX + IW - 0.12, IY + IH - 5.05)

# Hardware Requirements
section(lx, IY + IH - 5.22, "Hardware Requirements")
hw = [
    "• Personal Computer / Server",
    "• Stable Internet Connection",
]
for i, line in enumerate(hw):
    t(lx, IY + IH - 5.53 - i * 0.365, line)

divider(IX + 0.12, IX + IW - 0.12, IY + IH - 6.5)

# Software Requirements
section(lx, IY + IH - 6.67, "Software Requirements")
sw = [
    "• Next.js 15, React 19, Tailwind CSS",
    "• Python 3, scikit-learn, NumPy",
    "• Supabase (PostgreSQL)",
    "• Express.js Backend API Server",
    "• Vitest (Unit Testing Framework)",
]
for i, line in enumerate(sw):
    t(lx, IY + IH - 6.98 - i * 0.365, line)

# ═════════════════════════════════════════════════════════════════════════════
# PROCESS CONTENT
# ═════════════════════════════════════════════════════════════════════════════
cx = PX + PW / 2
py_start = PY + PH - 0.72

t(cx, py_start,       "Fortis Nexus System",  fs=9.5, bold=True, color=SECTION_C, ha="center")
t(cx, py_start - 0.38, "Development",          fs=9.5, bold=True, color=SECTION_C, ha="center")

proc = [
    "• System Concept & Planning",
    "• Analysis and Design",
    "   – Requirements Gathering",
    "   – Database Schema Design",
    "   – Matching Algorithm Design",
    "   – UI / UX Prototype Design",
    "• Development",
    "   – Keyword Extraction Pipeline",
    "   – 5-Pillar Compatibility Scoring",
    "   – Hospital-Resident Stable",
    "     Matching Algorithm",
    "   – Admin, Mentor & Mentee",
    "     Web Portals",
    "• Testing & Deployment",
]
for i, line in enumerate(proc):
    t(PX + 0.2, py_start - 0.78 - i * 0.365, line)

# ═════════════════════════════════════════════════════════════════════════════
# OUTPUT CONTENT
# ═════════════════════════════════════════════════════════════════════════════
ox = OX + 0.18
oy_start = OY + OH - 0.72

t(OX + OW / 2, oy_start,
  "Fortis Nexus: A Web-Based Automated",
  fs=9.0, bold=True, color=SECTION_C, ha="center")
t(OX + OW / 2, oy_start - 0.36,
  "Mentor-Mentee Matching System",
  fs=9.0, bold=True, color=SECTION_C, ha="center")

divider(OX + 0.12, OX + OW - 0.12, oy_start - 0.72)

t(ox, oy_start - 0.90, "Hospital-Resident Gale-Shapley",
  fs=8.8, bold=True, color=SECTION_C)
t(ox, oy_start - 1.24, "Stable Matching Algorithm",
  fs=8.8, bold=True, color=SECTION_C)

divider(OX + 0.12, OX + OW - 0.12, oy_start - 1.6)

t(ox, oy_start - 1.78, "5-Pillar Compatibility Scoring:",
  fs=8.8, bold=True, color=SECTION_C)
scoring_lines = [
    "• Keyword Similarity         75%",
    "• Mentoring Experience       10%",
    "• Schedule Availability      10%",
    "• Communication Preference  2.5%",
    "• Meeting Frequency          2.5%",
]
for i, line in enumerate(scoring_lines):
    t(ox, oy_start - 2.14 - i * 0.355, line, fs=8.3)

divider(OX + 0.12, OX + OW - 0.12, oy_start - 4.0)

t(ox, oy_start - 4.18, "Supporting Features:",
  fs=8.8, bold=True, color=SECTION_C)
features = [
    "• Meeting Scheduler",
    "• Milestone Tracker",
    "• Paper Review Module",
    "• Announcement System",
]
for i, line in enumerate(features):
    t(ox, oy_start - 4.54 - i * 0.355, line, fs=8.3)

# ═════════════════════════════════════════════════════════════════════════════
# EVALUATION CONTENT
# ═════════════════════════════════════════════════════════════════════════════
ey_start = EY + EH - 0.72
eval_lines = [
    "• Stability Verification (No Blocking Pairs)",
    "• Dissatisfaction Score Analysis",
    "  (Mentee-Optimal vs. Mentor-Optimal Variants)",
    "• Compatibility Score Distribution",
    "• Preference Rank Distribution",
    "  (Mentee and Mentor sides)",
    "• User Acceptance Testing (UAT)",
]
for i, line in enumerate(eval_lines):
    t(EX + 0.2, ey_start - i * 0.365, line, fs=8.4)

# ─────────────────────────────────────────────────────────────────────────────
OUT_DIR.mkdir(parents=True, exist_ok=True)
fig.savefig(OUT_FILE, dpi=150, bbox_inches="tight", facecolor=FIG_BG)
print(f"Saved → {OUT_FILE}")
