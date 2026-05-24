"""
metrics.py

Computes all thesis effectiveness metrics (sections 3.1–3.3 of thesis_info.md)
from live Supabase data produced by the matching algorithm.

Outputs:
  - Formatted report to stdout
  - metrics_log.txt          (overwritten each run)
  - metrics_score_distribution.png
  - metrics_lorenz_curve.png
  - metrics_capacity.png
  - metrics_summary.png
  - metrics_stability.png
  - metrics_keyword_precision.png
  - metrics_combined.png     (all panels in one figure)

Usage:
    python3 metrics.py                        # full report + charts + log
    python3 metrics.py --save metrics.json    # also write JSON
    python3 metrics.py --log-id <uuid>        # use a specific past run
    python3 metrics.py --json                 # machine-readable JSON only
    python3 metrics.py --no-charts            # skip chart generation
"""

from __future__ import annotations

import os
import sys
import json
import math
import argparse
import statistics
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client

import matplotlib
matplotlib.use("Agg")  # non-interactive backend — safe for headless/server environments
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import numpy as np
from scipy import stats as sp_stats

load_dotenv()

SEP  = "─" * 54
DSEP = "═" * 54

LOG_FILE        = "metrics_log.txt"
CHART_DIST      = "metrics_score_distribution.png"
CHART_GINI      = "metrics_lorenz_curve.png"
CHART_CAP       = "metrics_capacity.png"
CHART_SUM       = "metrics_summary.png"
CHART_STABILITY = "metrics_stability.png"
CHART_KW        = "metrics_keyword_precision.png"
CHART_COMBINED  = "metrics_combined.png"


# ─────────────────────────────────────────────────────────────────────────────
# SUPABASE
# ─────────────────────────────────────────────────────────────────────────────

def get_supabase():
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


# ─────────────────────────────────────────────────────────────────────────────
# DATA FETCHERS
# ─────────────────────────────────────────────────────────────────────────────

def fetch_latest_log(supabase, log_id: str | None = None) -> dict | None:
    if log_id:
        r = supabase.table("algorithm_logs").select("*").eq("id", log_id).execute()
    else:
        r = (
            supabase.table("algorithm_logs")
            .select("*")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
    return r.data[0] if r.data else None


def fetch_all_logs(supabase) -> list[dict]:
    r = supabase.table("algorithm_logs").select("id, created_at, log_data").execute()
    return r.data or []


def fetch_matches(supabase) -> list[dict]:
    r = (
        supabase.table("matches")
        .select("mentee_group_id, mentor_id, compatibility_score, matched_keywords, is_stable, algorithm")
        .eq("status", "active")
        .execute()
    )
    return r.data or []


def fetch_mentors(supabase) -> list[dict]:
    r = supabase.table("mentor").select(
        "id, first_name, last_name, mentor_capacity, forte, technical_skills, prev_mentored_thesis"
    ).execute()
    return r.data or []


def fetch_mentees(supabase) -> list[dict]:
    r = supabase.table("MENTEE_GROUPS").select(
        "id, group_name, research_description, research_title, mentor_preference"
    ).execute()
    return r.data or []


def fetch_mentee_prefs(supabase) -> list[dict]:
    r = supabase.table("mentee_preferences").select("mentee_group_id, ranked_mentors").execute()
    return r.data or []


def fetch_mentor_prefs(supabase) -> list[dict]:
    r = supabase.table("mentor_preferences").select("mentor_id, ranked_mentees").execute()
    return r.data or []


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def gini_coefficient(scores: list[float]) -> float:
    if len(scores) < 2 or sum(scores) == 0:
        return 0.0
    s = sorted(scores)
    n = len(s)
    return (2 * sum((i + 1) * v for i, v in enumerate(s))) / (n * sum(s)) - (n + 1) / n


def _profile_text(parts: list) -> str:
    tokens: list[str] = []
    for p in parts:
        if isinstance(p, list):
            tokens.extend(str(x) for x in p if x)
        elif isinstance(p, str) and p:
            tokens.append(p)
    return " ".join(tokens).lower()


def ok_icon(ok: bool) -> str:
    return "PASS" if ok else "WARN"


def _row(num: str, label: str, val: str, ok: bool | None, detail: str = "") -> str:
    icon  = (f"[{ok_icon(ok)}]" if ok is not None else "      ")
    d     = f"  ({detail})" if detail else ""
    label = f"[{num}] {label}"
    dots  = "." * max(2, 46 - len(label) - len(val))
    return f"  {label} {dots} {val}  {icon}{d}"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3.1 — CORRECTNESS METRICS
# ─────────────────────────────────────────────────────────────────────────────

def metric_1_stability_rate(all_logs: list[dict], matches: list[dict] | None = None) -> dict:
    """
    all_logs: full algorithm_logs rows — each has {id, created_at, log_data}.
    Builds a per-run history list used by both the report and the stability charts.
    """
    if not all_logs:
        return {"value": None, "detail": "No runs recorded"}

    runs = []
    for i, row in enumerate(all_logs):
        ld = row.get("log_data", row)
        runs.append({
            "run_num":              i + 1,
            "created_at":           row.get("created_at", ""),
            "is_stable":            ld.get("is_stable", False),
            "blocking_pairs_count": ld.get("blocking_pairs_count", 0),
        })

    stable = sum(1 for r in runs if r["is_stable"])
    total  = len(runs)
    rate   = stable / total * 100
    result = {"value": rate, "stable_runs": stable, "total_runs": total, "pass": rate == 100.0, "runs": runs}

    # Per-match stability — each match row carries its own is_stable flag
    if matches is not None:
        stable_matches = sum(1 for m in matches if m.get("is_stable", False))
        total_matches  = len(matches)
        match_rate     = (stable_matches / total_matches * 100) if total_matches else 0.0
        result["match_stability_rate"] = round(match_rate, 1)
        result["stable_matches"]       = stable_matches
        result["total_matches"]        = total_matches

    return result


def metric_2_match_coverage(log: dict) -> dict:
    matched   = log.get("matched", 0)
    unmatched = log.get("unmatched", 0)
    total     = matched + unmatched
    rate      = (matched / total * 100) if total else 0.0
    return {"value": rate, "matched": matched, "unmatched": unmatched, "total": total, "pass": rate == 100.0}


def metric_3_capacity_utilization(matches: list[dict], mentors: list[dict]) -> dict:
    total_capacity = sum(m.get("mentor_capacity") or 1 for m in mentors)
    assigned       = len(matches)
    rate           = (assigned / total_capacity * 100) if total_capacity else 0.0

    mentor_fill: dict[str, dict] = {}
    for m in mentors:
        cap  = m.get("mentor_capacity") or 1
        name = f"{m.get('first_name', '')} {m.get('last_name', '')}".strip()
        mentor_fill[m["id"]] = {"name": name, "capacity": cap, "assigned": 0}
    for match in matches:
        mid = match["mentor_id"]
        if mid in mentor_fill:
            mentor_fill[mid]["assigned"] += 1

    underloaded = [v for v in mentor_fill.values() if v["assigned"] == 0]
    overloaded  = [v for v in mentor_fill.values() if v["assigned"] > v["capacity"]]

    return {
        "value":          rate,
        "assigned":       assigned,
        "total_capacity": total_capacity,
        "underloaded":    len(underloaded),
        "overloaded":     len(overloaded),
        "per_mentor":     list(mentor_fill.values()),
        "pass":           rate >= 80.0,
    }


def metric_4_gini_coefficient(matches: list[dict], mentors: list[dict] | None = None) -> dict:
    scores = [m["compatibility_score"] for m in matches if m.get("compatibility_score") is not None]
    if not scores:
        return {"value": None, "detail": "No scores available"}
    g      = gini_coefficient(scores)
    result = {"value": round(g, 4), "n": len(scores), "pass": g <= 0.10, "score_gini": round(g, 4)}

    # Workload Gini — inequality in assigned mentees relative to each mentor's capacity
    if mentors:
        mentor_fill: dict[str, dict] = {}
        for m in mentors:
            cap = m.get("mentor_capacity") or 1
            mentor_fill[m["id"]] = {"capacity": cap, "assigned": 0}
        for match in matches:
            mid = match["mentor_id"]
            if mid in mentor_fill:
                mentor_fill[mid]["assigned"] += 1
        utilizations = [
            v["assigned"] / v["capacity"]
            for v in mentor_fill.values()
            if v["capacity"] > 0
        ]
        if len(utilizations) >= 2:
            wg = gini_coefficient(utilizations)
            result["workload_gini"]  = round(wg, 4)
            result["workload_pass"]  = wg <= 0.15
            result["workload_utils"] = [round(u, 4) for u in utilizations]

    return result


def metric_5_score_floor(matches: list[dict]) -> dict:
    scores    = [m["compatibility_score"] for m in matches if m.get("compatibility_score") is not None]
    compliant = sum(1 for s in scores if s >= 0.70)
    total     = len(scores)
    rate      = (compliant / total * 100) if total else 0.0
    return {"value": rate, "compliant": compliant, "total": total, "pass": rate == 100.0}


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3.2 — SEMANTIC QUALITY METRICS
# ─────────────────────────────────────────────────────────────────────────────

def metric_6_keyword_precision(
    matches: list[dict],
    mentors: list[dict],
    mentees: list[dict],
) -> dict:
    mentor_map = {m["id"]: m for m in mentors}
    mentee_map = {m["id"]: m for m in mentees}

    precisions: list[float] = []
    per_pair:   list[dict]  = []

    for match in matches:
        keywords = match.get("matched_keywords") or []
        mentor   = mentor_map.get(match["mentor_id"], {})
        mentee   = mentee_map.get(match["mentee_group_id"], {})

        mentor_name = f"{mentor.get('first_name', '')} {mentor.get('last_name', '')}".strip()
        mentee_name = mentee.get("group_name", "")

        if not keywords:
            per_pair.append({
                "mentor": mentor_name,
                "mentee": mentee_name,
                "precision": 0.0,
                "keyword_count": 0,
                "keywords": [],
            })
            continue

        mentor_text = _profile_text([
            mentor.get("forte"),
            mentor.get("technical_skills"),
            mentor.get("prev_mentored_thesis"),
        ])
        mentee_text = _profile_text([
            mentee.get("research_description"),
            mentee.get("mentor_preference"),
            mentee.get("research_title"),
        ])

        hits      = sum(1 for kw in keywords if kw.lower() in mentor_text and kw.lower() in mentee_text)
        precision = hits / len(keywords)
        precisions.append(precision)
        per_pair.append({
            "mentor":        mentor_name,
            "mentee":        mentee_name,
            "precision":     round(precision * 100, 1),
            "keyword_count": len(keywords),
            "keywords":      keywords,
        })

    if not precisions:
        return {"value": None, "detail": "No matched keywords found", "per_pair": per_pair}

    avg    = statistics.mean(precisions) * 100
    counts = [p["keyword_count"] for p in per_pair]

    return {
        "value":        round(avg, 1),
        "pairs_checked": len(precisions),
        "pass":         avg >= 80.0,
        "per_pair":     sorted(per_pair, key=lambda p: p["precision"], reverse=True),
        "kw_count_min":  min(counts),
        "kw_count_max":  max(counts),
        "kw_count_mean": round(statistics.mean(counts), 2),
        "kw_count_total_unique": len({kw for p in per_pair for kw in p["keywords"]}),
    }


def metric_7_domain_overlap(log: dict) -> dict:
    scores = log.get("phase2", {}).get("scores", [])
    domain_counts: list[int] = []
    for entry in scores:
        for m in entry.get("top_matches", []):
            domains = m.get("shared_domains") or []
            domain_counts.append(len(domains))
    if not domain_counts:
        return {"value": None, "detail": "No domain data in log"}
    avg = statistics.mean(domain_counts)
    return {"value": round(avg, 2), "pairs_checked": len(domain_counts), "pass": avg >= 1.0}


def metric_8_mentee_preferred_rate(
    matches: list[dict],
    mentee_prefs: list[dict],
) -> dict:
    pref_map  = {p["mentee_group_id"]: p["ranked_mentors"] for p in mentee_prefs}
    preferred = 0
    checked   = 0
    for match in matches:
        mid     = match["mentee_group_id"]
        ranked  = pref_map.get(mid)
        if not ranked:
            continue
        mentor_ids = [r["mentor_id"] for r in ranked]
        try:
            rank = mentor_ids.index(match["mentor_id"]) + 1
        except ValueError:
            rank = len(mentor_ids) + 1
        if rank <= 2:
            preferred += 1
        checked += 1
    rate = (preferred / checked * 100) if checked else 0.0
    return {"value": round(rate, 1), "preferred": preferred, "checked": checked, "pass": rate >= 60.0}


def metric_9_mentor_preferred_rate(
    matches: list[dict],
    mentor_prefs: list[dict],
    total_mentees: int,
) -> dict:
    pref_map = {p["mentor_id"]: p["ranked_mentees"] for p in mentor_prefs}
    top_tier = math.ceil(total_mentees / 3) if total_mentees else 1

    mentor_groups: dict[str, list[str]] = {}
    for match in matches:
        mentor_groups.setdefault(match["mentor_id"], []).append(match["mentee_group_id"])

    preferred = 0
    checked   = 0
    for mentor_id, assigned_mentees in mentor_groups.items():
        ranked = pref_map.get(mentor_id)
        if not ranked:
            continue
        mentee_ids = [r["mentee_group_id"] for r in ranked]
        for gid in assigned_mentees:
            try:
                rank = mentee_ids.index(gid) + 1
            except ValueError:
                rank = len(mentee_ids) + 1
            if rank <= top_tier:
                preferred += 1
            checked += 1
    rate = (preferred / checked * 100) if checked else 0.0
    return {
        "value":     round(rate, 1),
        "preferred": preferred,
        "checked":   checked,
        "top_tier":  top_tier,
        "pass":      rate >= 60.0,
    }


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3.3 — EFFICIENCY METRICS
# ─────────────────────────────────────────────────────────────────────────────

def metric_10_throughput(log: dict) -> dict:
    lat = metric_11_latency(log)
    if lat["value"] is None:
        return {"value": None, "detail": "Cannot compute without latency"}
    matched   = log.get("matched", 0)
    latency_s = lat["value"]
    return {"value": round(matched / latency_s, 2) if latency_s > 0 else 0.0,
            "matched": matched, "latency_s": latency_s}


def metric_11_latency(log: dict) -> dict:
    started_at = log.get("started_at")
    ended_at   = log.get("timestamp")
    if not started_at or not ended_at:
        return {"value": None, "detail": "started_at or timestamp missing from log"}
    try:
        secs = (datetime.fromisoformat(ended_at) - datetime.fromisoformat(started_at)).total_seconds()
        return {"value": round(secs, 3), "started_at": started_at, "ended_at": ended_at}
    except Exception as e:
        return {"value": None, "detail": str(e)}


def metric_12_score_distribution(matches: list[dict]) -> dict:
    raw = [m["compatibility_score"] for m in matches if m.get("compatibility_score") is not None]
    if not raw:
        return {"value": None, "detail": "No scores available"}

    scores = sorted(raw)
    n      = len(scores)
    mean   = statistics.mean(scores)
    med    = statistics.median(scores)
    std    = statistics.stdev(scores) if n > 1 else 0.0
    p25    = scores[int(n * 0.25)]
    p75    = scores[int(n * 0.75)]

    # scipy extended stats
    arr      = np.array(scores)
    skewness = float(sp_stats.skew(arr))
    kurtosis = float(sp_stats.kurtosis(arr))  # Fisher's excess kurtosis
    sem      = float(sp_stats.sem(arr))
    ci_low, ci_high = sp_stats.t.interval(0.95, df=n - 1, loc=mean, scale=sem) if n > 1 else (mean, mean)

    norm_stat, norm_p = (None, None)
    if n >= 8:
        ns, np_ = sp_stats.normaltest(arr)
        norm_stat, norm_p = float(ns), float(np_)

    return {
        "value":     round(mean, 4),
        "mean":      round(mean, 4),
        "median":    round(med, 4),
        "std":       round(std, 4),
        "min":       round(scores[0], 4),
        "max":       round(scores[-1], 4),
        "p25":       round(p25, 4),
        "p75":       round(p75, 4),
        "n":         n,
        "skewness":  round(skewness, 4),
        "kurtosis":  round(kurtosis, 4),
        "sem":       round(sem, 4),
        "ci95_low":  round(ci_low, 4),
        "ci95_high": round(ci_high, 4),
        "norm_stat": round(norm_stat, 4) if norm_stat is not None else None,
        "norm_p":    round(norm_p, 4)    if norm_p    is not None else None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# REPORT BUILDER (returns lines list — used for both stdout and log file)
# ─────────────────────────────────────────────────────────────────────────────

def _build_report_lines(results: dict, generated_at: str) -> list[str]:
    log   = results["log"]
    algo  = log.get("algorithm", "unknown")
    try:
        run_time = datetime.fromisoformat(log.get("timestamp", "")).strftime("%Y-%m-%d %H:%M:%S UTC")
    except Exception:
        run_time = log.get("timestamp", "")

    L: list[str] = []
    L.append(DSEP)
    L.append("  FORTIS NEXUS — THESIS METRICS REPORT")
    L.append(f"  Run      : {run_time}  |  {algo}")
    L.append(f"  Generated: {generated_at}")
    L.append(DSEP)

    # ── 3.1 ──────────────────────────────────────────────────────────────────
    L.append(f"\n  {SEP}")
    L.append("  3.1  CORRECTNESS METRICS")
    L.append(f"  {SEP}")

    m1 = results["m1"]
    if m1.get("value") is not None:
        L.append(_row("#1", "Stability Rate (run-level)", f"{m1['value']:.1f}%", m1.get("pass"),
                       f"{m1['stable_runs']}/{m1['total_runs']} runs stable"))
        if "match_stability_rate" in m1:
            L.append(_row("#1b", "Stability Rate (per-match)", f"{m1['match_stability_rate']:.1f}%",
                           m1["match_stability_rate"] == 100.0,
                           f"{m1['stable_matches']}/{m1['total_matches']} matches stable"))
    else:
        L.append(f"  [#1] Stability Rate  N/A  [WARN]  ({m1.get('detail', '')})")

    # Dissatisfaction scores from latest run
    d = results["log"].get("dissatisfaction")
    if d:
        mo  = d.get("mentee_optimal", {})
        meo = d.get("mentor_optimal", {})
        sel = d.get("selected", "?")
        L.append(f"\n  Dissatisfaction Scores  (selected: {sel})")
        THIN = "  " + "┄" * 52
        L.append(THIN)
        L.append(f"  Mentee-optimal  →  mentee: {mo.get('mentee', '?'):.4f}  mentor: {mo.get('mentor', '?'):.4f}  total: {mo.get('total', '?'):.4f}")
        L.append(f"  Mentor-optimal  →  mentee: {meo.get('mentee', '?'):.4f}  mentor: {meo.get('mentor', '?'):.4f}  total: {meo.get('total', '?'):.4f}")
        L.append(THIN)

    m2 = results["m2"]
    L.append(_row("#2", "Match Coverage", f"{m2['value']:.1f}%", m2.get("pass"),
                   f"{m2['matched']}/{m2['total']} matched"))

    m3 = results["m3"]
    detail3 = f"{m3['assigned']}/{m3['total_capacity']} slots"
    if m3["underloaded"]:
        detail3 += f", {m3['underloaded']} idle mentors"
    L.append(_row("#3", "Capacity Utilization", f"{m3['value']:.1f}%", m3.get("pass"), detail3))

    m4 = results["m4"]
    if m4.get("value") is not None:
        L.append(_row("#4", "Gini — Score Equity", f"{m4['value']:.4f}", m4.get("pass"), "<=0.10 target"))
        if "workload_gini" in m4:
            L.append(_row("#4b", "Gini — Workload Equity", f"{m4['workload_gini']:.4f}",
                           m4.get("workload_pass"), "<=0.15 target"))
    else:
        L.append("  [#4] Gini Coefficient  N/A  [WARN]")

    m5 = results["m5"]
    L.append(_row("#5", "Score Floor Compliance", f"{m5['value']:.1f}%", m5.get("pass"), "all >=0.70"))

    # ── 3.2 ──────────────────────────────────────────────────────────────────
    L.append(f"\n  {SEP}")
    L.append("  3.2  SEMANTIC QUALITY METRICS")
    L.append(f"  {SEP}")

    m6 = results["m6"]
    if m6.get("value") is not None:
        L.append(_row("#6", "Keyword Precision", f"{m6['value']:.1f}%", m6.get("pass"),
                       f"{m6['pairs_checked']} pairs  ·  avg {m6['kw_count_mean']} kw/pair  ·  {m6['kw_count_total_unique']} unique kw"))
        THIN = "  " + "┄" * 52
        L.append(THIN)
        for p in m6.get("per_pair", []):
            bar   = "█" * int(p["precision"] / 10) + "░" * (10 - int(p["precision"] / 10))
            flag  = "✓" if p["precision"] >= 80 else "·"
            kw_preview = ", ".join(p["keywords"][:4]) + ("…" if len(p["keywords"]) > 4 else "")
            L.append(
                f"  {flag} {p['mentee']:<22} → {p['mentor']:<22}  "
                f"{p['precision']:>5.1f}%  [{bar}]  ({p['keyword_count']} kw)"
            )
            if kw_preview:
                L.append(f"      keywords: {kw_preview}")
        L.append(THIN)
    else:
        L.append(f"  [#6] Keyword Precision  N/A  [WARN]  ({m6.get('detail', '')})")

    m7 = results["m7"]
    if m7.get("value") is not None:
        L.append(_row("#7", "Domain Overlap Rate", f"{m7['value']:.2f} avg", m7.get("pass"),
                       "shared domains per pair"))
    else:
        L.append(f"  [#7] Domain Overlap Rate  N/A  [WARN]  ({m7.get('detail', '')})")

    m8 = results["m8"]
    L.append(_row("#8", "Mentee Preferred-Match Rate", f"{m8['value']:.1f}%", m8.get("pass"),
                   f"top-2 mentor, {m8['checked']} checked"))

    m9 = results["m9"]
    L.append(_row("#9", "Mentor Preferred-Match Rate", f"{m9['value']:.1f}%", m9.get("pass"),
                   f"top-{m9['top_tier']} tier, {m9['checked']} checked"))

    # ── 3.3 ──────────────────────────────────────────────────────────────────
    L.append(f"\n  {SEP}")
    L.append("  3.3  EFFICIENCY METRICS")
    L.append(f"  {SEP}")

    m10 = results["m10"]
    if m10.get("value") is not None:
        L.append(_row("#10", "Throughput", f"{m10['value']:.2f} matches/sec", None))
    else:
        L.append(f"  [#10] Throughput  N/A  [WARN]  ({m10.get('detail', '')})")

    m11 = results["m11"]
    if m11.get("value") is not None:
        L.append(_row("#11", "Wall-Clock Latency", f"{m11['value']:.3f} s", None))
    else:
        L.append(f"  [#11] Wall-Clock Latency  N/A  [WARN]  ({m11.get('detail', '')})")

    m12 = results["m12"]
    if m12.get("value") is not None:
        L.append(f"\n  [#12] Score Distribution  (n={m12['n']})")
        L.append(f"         Mean     : {m12['mean']:.4f}    Median   : {m12['median']:.4f}")
        L.append(f"         Std      : {m12['std']:.4f}    Min      : {m12['min']:.4f}    Max : {m12['max']:.4f}")
        L.append(f"         P25      : {m12['p25']:.4f}    P75      : {m12['p75']:.4f}")
        L.append(f"         Skewness : {m12['skewness']:.4f}    Kurtosis : {m12['kurtosis']:.4f}")
        L.append(f"         SEM      : {m12['sem']:.4f}    95% CI   : [{m12['ci95_low']:.4f}, {m12['ci95_high']:.4f}]")
        if m12.get("norm_stat") is not None:
            verdict = "normal dist. not rejected" if m12["norm_p"] >= 0.05 else "normal dist. rejected"
            L.append(f"         Normality: stat={m12['norm_stat']:.3f}, p={m12['norm_p']:.3f}  ({verdict})")
    else:
        L.append("  [#12] Score Distribution  N/A  [WARN]")

    L.append(f"\n  {DSEP}")

    # ── Mentor capacity detail ────────────────────────────────────────────────
    per_mentor = m3.get("per_mentor", [])
    if per_mentor:
        L.append("\n  Mentor Capacity Breakdown:")
        THIN = "  " + "┄" * 52
        L.append(THIN)
        for row in sorted(per_mentor, key=lambda r: -r["assigned"]):
            fill_pct = (row["assigned"] / row["capacity"] * 100) if row["capacity"] else 0
            bar      = "#" * row["assigned"] + "." * (row["capacity"] - row["assigned"])
            L.append(f"  {row['name']:<26}  {row['assigned']}/{row['capacity']}  [{bar}]  {fill_pct:.0f}%")
        L.append(THIN)

    L.append("")
    return L


def print_report(results: dict, generated_at: str) -> None:
    for line in _build_report_lines(results, generated_at):
        print(line)


def save_log(results: dict, generated_at: str) -> None:
    lines = _build_report_lines(results, generated_at)
    lines.append(f"  Log file : {LOG_FILE}  (overwritten each run)")
    lines.append(f"  Charts   : {CHART_DIST}, {CHART_GINI}, {CHART_CAP}, {CHART_SUM}, {CHART_STABILITY}")
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"  Saved log -> {LOG_FILE}")


# ─────────────────────────────────────────────────────────────────────────────
# CHARTS
# ─────────────────────────────────────────────────────────────────────────────


def _draw_score_dist(ax, scores: list[float], m12: dict) -> None:
    arr  = np.array(scores)
    mean = m12["mean"]
    med  = m12["median"]

    ax.hist(arr, bins=min(15, len(scores)), color="#4C78A8", alpha=0.75, edgecolor="white", density=True)
    kde = sp_stats.gaussian_kde(arr)
    x   = np.linspace(arr.min(), arr.max(), 300)
    ax.plot(x, kde(x), color="#E45756", linewidth=2, label="KDE")
    ax.axvline(mean, color="#F58518", linestyle="--", linewidth=1.5, label=f"Mean {mean:.3f}")
    ax.axvline(med,  color="#54A24B", linestyle=":",  linewidth=1.5, label=f"Median {med:.3f}")
    ax.text(0.03, 0.97,
            f"Skewness: {m12['skewness']:.3f}\nKurtosis: {m12['kurtosis']:.3f}",
            transform=ax.transAxes, fontsize=8, va="top",
            bbox=dict(boxstyle="round,pad=0.3", facecolor="lightyellow", alpha=0.8))
    ax.set_xlabel("Compatibility Score")
    ax.set_ylabel("Density")
    ax.set_title("Score Distribution")
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3)


def _draw_lorenz(
    ax,
    scores: list[float],
    gini_val: float,
    workload_utils: list[float] | None = None,
    workload_gini: float | None = None,
) -> None:
    s          = sorted(scores)
    n          = len(s)
    cum_scores = np.cumsum(s) / sum(s)
    population = np.arange(1, n + 1) / n
    px = np.insert(population, 0, 0.0)
    py = np.insert(cum_scores, 0, 0.0)

    ax.plot([0, 1], [0, 1], "k--", linewidth=1.2, label="Perfect Equality (G=0)")
    ax.plot(px, py, color="#4C78A8", linewidth=2, label=f"Score Equity  G={gini_val:.4f}")
    ax.fill_between(px, px, py, alpha=0.12, color="#4C78A8")

    if workload_utils and workload_gini is not None and sum(workload_utils) > 0:
        wu  = sorted(workload_utils)
        wn  = len(wu)
        cum_wu = np.cumsum(wu) / sum(wu)
        wpop   = np.arange(1, wn + 1) / wn
        wpx    = np.insert(wpop, 0, 0.0)
        wpy    = np.insert(cum_wu, 0, 0.0)
        ax.plot(wpx, wpy, color="#E45756", linewidth=2, linestyle="-.",
                label=f"Workload Equity  G={workload_gini:.4f}")
        ax.fill_between(wpx, wpx, wpy, alpha=0.08, color="#E45756")

    ax.set_xlabel("Cumulative Share of Pairs / Mentors")
    ax.set_ylabel("Cumulative Share of Score / Workload")
    ax.set_title("Lorenz Curves — Equity Analysis")
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)


def _draw_capacity(ax, per_mentor: list[dict]) -> None:
    if not per_mentor:
        ax.text(0.5, 0.5, "No mentor data", ha="center", va="center", transform=ax.transAxes)
        return
    rows       = sorted(per_mentor, key=lambda r: r["assigned"] / max(r["capacity"], 1))
    names      = [r["name"] for r in rows]
    fill_pcts  = [(r["assigned"] / r["capacity"] * 100) if r["capacity"] else 0 for r in rows]
    capacities = [f"{r['assigned']}/{r['capacity']}" for r in rows]
    colors     = ["#54A24B" if p >= 80 else "#F58518" if p >= 40 else "#E45756" for p in fill_pcts]

    bars = ax.barh(names, fill_pcts, color=colors, edgecolor="white", height=0.6)
    ax.axvline(x=80, color="black", linestyle="--", linewidth=1, alpha=0.6, label="80% target")
    for bar, cap_str in zip(bars, capacities):
        ax.text(bar.get_width() + 1, bar.get_y() + bar.get_height() / 2,
                cap_str, va="center", fontsize=7)
    ax.set_xlabel("Capacity Utilization (%)")
    ax.set_title("Mentor Capacity Utilization")
    ax.set_xlim(0, 115)
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3, axis="x")


def _draw_kw_precision_bars(ax, per_pair: list[dict]) -> None:
    if not per_pair:
        ax.text(0.5, 0.5, "No keyword data", ha="center", va="center", transform=ax.transAxes)
        ax.set_title("Keyword Precision per Pair")
        return

    pairs  = [f"{p['mentee']}\n→ {p['mentor']}" for p in per_pair]
    values = [p["precision"] for p in per_pair]
    counts = [p["keyword_count"] for p in per_pair]
    colors = ["#54A24B" if v >= 80 else "#F58518" if v >= 60 else "#E45756" for v in values]

    bars = ax.barh(pairs, values, color=colors, edgecolor="white", height=0.6)
    ax.axvline(x=80, color="black", linestyle="--", linewidth=1, alpha=0.6, label="80% target")

    for bar, val, cnt in zip(bars, values, counts):
        ax.text(min(bar.get_width() + 1, 101), bar.get_y() + bar.get_height() / 2,
                f"{val:.0f}%  ({cnt} kw)", va="center", fontsize=7)

    ax.set_xlabel("Precision (%)")
    ax.set_title("Keyword Precision per Pair")
    ax.set_xlim(0, 120)
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3, axis="x")
    ax.invert_yaxis()


def _draw_kw_count_dist(ax, per_pair: list[dict]) -> None:
    if not per_pair:
        ax.text(0.5, 0.5, "No keyword data", ha="center", va="center", transform=ax.transAxes)
        ax.set_title("Matched Keyword Count per Pair")
        return

    pairs  = [f"{p['mentee']}\n→ {p['mentor']}" for p in per_pair]
    counts = [p["keyword_count"] for p in per_pair]
    colors = ["#54A24B" if c >= 4 else "#F58518" if c >= 2 else "#E45756" for c in counts]

    bars = ax.barh(pairs, counts, color=colors, edgecolor="white", height=0.6)

    # Floor boost reference lines
    ax.axvline(x=2, color="#F58518", linestyle=":", linewidth=1.2, alpha=0.7, label="≥2 → floor 0.50")
    ax.axvline(x=4, color="#54A24B", linestyle=":", linewidth=1.2, alpha=0.7, label="≥4 → floor 0.80")

    for bar, cnt in zip(bars, counts):
        ax.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height() / 2,
                str(cnt), va="center", fontsize=8, fontweight="bold")

    ax.set_xlabel("Matched Keywords")
    ax.set_title("Matched Keyword Count per Pair")
    ax.xaxis.set_major_locator(plt.MaxNLocator(integer=True))
    ax.legend(fontsize=7)
    ax.grid(True, alpha=0.3, axis="x")
    ax.invert_yaxis()


def plot_keyword_chart(results: dict) -> None:
    m6       = results["m6"]
    per_pair = m6.get("per_pair", [])
    if not per_pair:
        print("  [keyword chart] No per-pair data — skipping")
        return

    n      = len(per_pair)
    height = max(5, n * 0.55 + 1.5)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, height))
    _draw_kw_precision_bars(ax1, per_pair)
    _draw_kw_count_dist(ax2, per_pair)

    avg  = m6.get("value", 0)
    mean_cnt = m6.get("kw_count_mean", 0)
    uniq = m6.get("kw_count_total_unique", 0)
    fig.suptitle(
        f"Fortis Nexus — Keyword Precision  |  avg {avg:.1f}%  ·  {mean_cnt} kw/pair avg  ·  {uniq} unique keywords",
        fontsize=11, y=1.01,
    )
    plt.tight_layout()
    plt.savefig(CHART_KW, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved chart -> {CHART_KW}")


def _draw_stability_timeline(ax, runs: list[dict]) -> None:
    if not runs:
        ax.text(0.5, 0.5, "No run history", ha="center", va="center", transform=ax.transAxes)
        ax.set_title("Stability — Run History")
        return

    xs     = list(range(1, len(runs) + 1))
    ys     = [1 if r["is_stable"] else 0 for r in runs]
    colors = ["#54A24B" if y else "#E45756" for y in ys]
    date_labels = [r.get("created_at", "")[:10] for r in runs]

    if len(xs) > 1:
        ax.step(xs, ys, where="mid", color="#4C78A8", linewidth=1.5, alpha=0.4)
    ax.scatter(xs, ys, c=colors, s=160, zorder=5, edgecolors="white", linewidths=1)
    ax.axhline(y=1, color="gray", linestyle="--", linewidth=1, alpha=0.4, label="Target: 100% stable")

    ax.set_xticks(xs)
    ax.set_xticklabels([f"Run {x}\n{date_labels[i]}" for i, x in enumerate(xs)], fontsize=7)
    ax.set_yticks([0, 1])
    ax.set_yticklabels(["Unstable", "Stable"], fontsize=9)
    ax.set_ylim(-0.4, 1.4)
    ax.set_title("Stability — Run History")
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3, axis="x")

    stable_count = sum(ys)
    rate = stable_count / len(runs) * 100
    ax.text(0.98, 0.05, f"{rate:.0f}% stable\n({stable_count}/{len(runs)} runs)",
            transform=ax.transAxes, ha="right", va="bottom", fontsize=9,
            bbox=dict(boxstyle="round,pad=0.3", facecolor="lightyellow", alpha=0.8))


def _draw_blocking_pairs(ax, runs: list[dict]) -> None:
    if not runs:
        ax.text(0.5, 0.5, "No run history", ha="center", va="center", transform=ax.transAxes)
        ax.set_title("Blocking Pairs — Run History")
        return

    xs      = list(range(1, len(runs) + 1))
    counts  = [r.get("blocking_pairs_count", 0) for r in runs]
    colors  = ["#54A24B" if c == 0 else "#E45756" for c in counts]
    date_labels = [r.get("created_at", "")[:10] for r in runs]

    bars = ax.bar(xs, counts, color=colors, edgecolor="white", width=0.5)
    ax.axhline(y=0, color="gray", linewidth=0.8, alpha=0.4)

    ax.set_xticks(xs)
    ax.set_xticklabels([f"Run {x}\n{date_labels[i]}" for i, x in enumerate(xs)], fontsize=7)
    ax.set_ylabel("Blocking Pairs Found")
    ax.set_title("Blocking Pairs — Run History")
    ax.set_ylim(0, max(max(counts) + 1, 3))
    ax.yaxis.set_major_locator(plt.MaxNLocator(integer=True))
    ax.grid(True, alpha=0.3, axis="y")

    for bar, count in zip(bars, counts):
        label = "0  ✓" if count == 0 else str(count)
        ax.text(bar.get_x() + bar.get_width() / 2,
                bar.get_height() + 0.05,
                label, ha="center", va="bottom", fontsize=9, fontweight="bold")


def _draw_preferred_rates(ax, m8: dict, m9: dict) -> None:
    labels = ["Mentee\nPreferred\n(top-2)", "Mentor\nPreferred\n(top-tier)"]
    values = [m8.get("value") or 0, m9.get("value") or 0]
    colors = ["#54A24B" if v >= 60 else "#E45756" for v in values]

    bars = ax.bar(labels, values, color=colors, edgecolor="white", width=0.4)
    ax.axhline(y=60, color="black", linestyle="--", linewidth=1, alpha=0.6, label="60% target")
    for bar, val in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 1,
                f"{val:.1f}%", ha="center", va="bottom", fontsize=9, fontweight="bold")
    ax.set_ylabel("Preferred-Match Rate (%)")
    ax.set_title("Preferred-Match Rates")
    ax.set_ylim(0, 115)
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3, axis="y")


def plot_stability_chart(results: dict) -> None:
    runs = results["m1"].get("runs", [])
    if not runs:
        print("  [stability chart] No run history — skipping")
        return

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5))
    _draw_stability_timeline(ax1, runs)
    _draw_blocking_pairs(ax2, runs)
    fig.suptitle("Fortis Nexus — Stability Analysis", fontsize=12, y=1.01)
    plt.tight_layout()
    plt.savefig(CHART_STABILITY, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved chart -> {CHART_STABILITY}")


def _draw_dissatisfaction(ax, dissatisfaction: dict | None) -> None:
    if not dissatisfaction:
        ax.text(0.5, 0.5, "No dissatisfaction data (run with fair matching enabled)",
                ha="center", va="center", transform=ax.transAxes, fontsize=9)
        ax.set_title("Dissatisfaction Scores — Mentee-Optimal vs Mentor-Optimal")
        ax.axis("off")
        return

    mo  = dissatisfaction.get("mentee_optimal", {})
    meo = dissatisfaction.get("mentor_optimal", {})
    sel = dissatisfaction.get("selected", "")

    labels   = ["Mentee\nDissatisfaction", "Mentor\nDissatisfaction", "Total"]
    mo_vals  = [mo.get("mentee", 0),  mo.get("mentor", 0),  mo.get("total", 0)]
    meo_vals = [meo.get("mentee", 0), meo.get("mentor", 0), meo.get("total", 0)]

    x      = np.arange(len(labels))
    width  = 0.32
    mo_col  = "#4C78A8" if sel == "mentee_optimal"  else "#A8C4E0"
    meo_col = "#E45756" if sel == "mentor_optimal"   else "#F0A8A8"

    bars1 = ax.bar(x - width / 2, mo_vals,  width, label="Mentee-Optimal",
                   color=mo_col,  edgecolor="white")
    bars2 = ax.bar(x + width / 2, meo_vals, width, label="Mentor-Optimal",
                   color=meo_col, edgecolor="white")

    for bar, val in list(zip(bars1, mo_vals)) + list(zip(bars2, meo_vals)):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.005,
                f"{val:.3f}", ha="center", va="bottom", fontsize=8)

    selected_label = "Mentee-Optimal" if sel == "mentee_optimal" else "Mentor-Optimal"
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=9)
    ax.set_ylabel("Avg Rank of Matched Partner (lower = better)")
    ax.set_title(f"Dissatisfaction Scores — Mentee-Optimal vs Mentor-Optimal  (selected: {selected_label})")
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3, axis="y")

    ymax = max(mo_vals + meo_vals)
    ax.set_ylim(0, ymax * 1.3 if ymax > 0 else 1)


def plot_combined_chart(results: dict, scores: list[float]) -> None:
    """Single figure with all 8 panels in a 4×2 grid."""
    m12            = results["m12"]
    m4             = results["m4"]
    m3             = results["m3"]
    m8             = results["m8"]
    m9             = results["m9"]
    m6             = results["m6"]
    m1             = results["m1"]
    gini_val       = m4.get("value") or 0.0
    workload_utils = m4.get("workload_utils")
    workload_gini  = m4.get("workload_gini")
    runs           = m1.get("runs", [])
    per_pair       = m6.get("per_pair", [])

    if not scores or m12.get("value") is None:
        print("  [combined chart] Not enough score data — skipping")
        return

    n_pairs   = max(len(per_pair), 1)
    n_mentors = max(len(m3.get("per_mentor", [])), 1)

    row_h = [4.0, max(3.0, n_mentors * 0.45), 3.5, max(4.0, n_pairs * 0.5), 3.5]
    total_h = sum(row_h) + 2.0

    fig = plt.figure(figsize=(16, total_h))
    gs  = gridspec.GridSpec(5, 2, figure=fig,
                            height_ratios=row_h, hspace=0.6, wspace=0.35)

    _draw_score_dist(fig.add_subplot(gs[0, 0]), scores, m12)
    _draw_lorenz(fig.add_subplot(gs[0, 1]), scores, gini_val, workload_utils, workload_gini)
    _draw_capacity(fig.add_subplot(gs[1, 0]), m3.get("per_mentor", []))
    _draw_preferred_rates(fig.add_subplot(gs[1, 1]), m8, m9)
    _draw_stability_timeline(fig.add_subplot(gs[2, 0]), runs)
    _draw_blocking_pairs(fig.add_subplot(gs[2, 1]), runs)
    _draw_kw_precision_bars(fig.add_subplot(gs[3, 0]), per_pair)
    _draw_kw_count_dist(fig.add_subplot(gs[3, 1]), per_pair)
    _draw_dissatisfaction(fig.add_subplot(gs[4, :]), results["log"].get("dissatisfaction"))

    algo     = results["log"].get("algorithm", "")
    run_time = ""
    try:
        run_time = datetime.fromisoformat(results["log"].get("timestamp", "")).strftime("%Y-%m-%d %H:%M UTC")
    except Exception:
        pass
    fig.suptitle(
        f"Fortis Nexus — Complete Metrics Dashboard\n{run_time}  ·  {algo}",
        fontsize=13, y=1.005,
    )

    plt.savefig(CHART_COMBINED, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved chart -> {CHART_COMBINED}")


def plot_charts(results: dict, scores: list[float]) -> None:
    m12           = results["m12"]
    m4            = results["m4"]
    m3            = results["m3"]
    m8            = results["m8"]
    m9            = results["m9"]
    gini_val      = m4.get("value") or 0.0
    workload_utils = m4.get("workload_utils")
    workload_gini  = m4.get("workload_gini")

    if not scores or m12.get("value") is None:
        print("  [charts] Not enough score data — skipping chart generation")
        return

    # ── Individual charts ─────────────────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(8, 5))
    _draw_score_dist(ax, scores, m12)
    plt.tight_layout()
    plt.savefig(CHART_DIST, dpi=150)
    plt.close(fig)
    print(f"  Saved chart -> {CHART_DIST}")

    fig, ax = plt.subplots(figsize=(7, 6))
    _draw_lorenz(ax, scores, gini_val, workload_utils, workload_gini)
    plt.tight_layout()
    plt.savefig(CHART_GINI, dpi=150)
    plt.close(fig)
    print(f"  Saved chart -> {CHART_GINI}")

    fig, ax = plt.subplots(figsize=(9, max(4, len(m3.get("per_mentor", [])) * 0.5 + 1)))
    _draw_capacity(ax, m3.get("per_mentor", []))
    plt.tight_layout()
    plt.savefig(CHART_CAP, dpi=150)
    plt.close(fig)
    print(f"  Saved chart -> {CHART_CAP}")

    # ── Summary 2×2 dashboard ─────────────────────────────────────────────────
    fig = plt.figure(figsize=(14, 10))
    gs  = gridspec.GridSpec(2, 2, figure=fig, hspace=0.45, wspace=0.35)

    _draw_score_dist(fig.add_subplot(gs[0, 0]), scores, m12)
    _draw_lorenz(fig.add_subplot(gs[0, 1]), scores, gini_val, workload_utils, workload_gini)
    _draw_capacity(fig.add_subplot(gs[1, 0]), m3.get("per_mentor", []))
    _draw_preferred_rates(fig.add_subplot(gs[1, 1]), m8, m9)

    algo     = results["log"].get("algorithm", "")
    run_time = ""
    try:
        run_time = datetime.fromisoformat(results["log"].get("timestamp", "")).strftime("%Y-%m-%d %H:%M UTC")
    except Exception:
        pass
    fig.suptitle(f"Fortis Nexus — Thesis Metrics Dashboard\n{run_time}  ·  {algo}", fontsize=12, y=0.98)

    plt.savefig(CHART_SUM, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved chart -> {CHART_SUM}")

    plot_stability_chart(results)
    plot_keyword_chart(results)
    plot_combined_chart(results, scores)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def run_metrics(supabase, log_id: str | None = None) -> tuple[dict, list[float]]:
    log_row = fetch_latest_log(supabase, log_id)
    if not log_row:
        print("  No algorithm log found. Run the matching algorithm first.", file=sys.stderr)
        sys.exit(1)

    log      = log_row["log_data"]
    all_logs = fetch_all_logs(supabase)
    matches  = fetch_matches(supabase)
    mentors  = fetch_mentors(supabase)
    mentees  = fetch_mentees(supabase)
    m_prefs  = fetch_mentee_prefs(supabase)
    mn_prefs = fetch_mentor_prefs(supabase)

    scores = [m["compatibility_score"] for m in matches if m.get("compatibility_score") is not None]

    results = {
        "log":    log,
        "log_id": log_row.get("id"),
        "m1":  metric_1_stability_rate(all_logs, matches),
        "m2":  metric_2_match_coverage(log),
        "m3":  metric_3_capacity_utilization(matches, mentors),
        "m4":  metric_4_gini_coefficient(matches, mentors),
        "m5":  metric_5_score_floor(matches),
        "m6":  metric_6_keyword_precision(matches, mentors, mentees),
        "m7":  metric_7_domain_overlap(log),
        "m8":  metric_8_mentee_preferred_rate(matches, m_prefs),
        "m9":  metric_9_mentor_preferred_rate(matches, mn_prefs, len(mentees)),
        "m10": metric_10_throughput(log),
        "m11": metric_11_latency(log),
        "m12": metric_12_score_distribution(matches),
    }
    return results, scores


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fortis Nexus thesis metrics reporter")
    parser.add_argument("--save",      metavar="FILE", help="Save results as JSON to this path")
    parser.add_argument("--log-id",    metavar="UUID", help="Use a specific algorithm_logs entry by ID")
    parser.add_argument("--json",      action="store_true", help="Output JSON only (no formatted report)")
    parser.add_argument("--no-charts", action="store_true", help="Skip chart generation")
    args = parser.parse_args()

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    supabase          = get_supabase()
    results, scores   = run_metrics(supabase, log_id=args.log_id)

    if args.json:
        out = {k: v for k, v in results.items() if k != "log"}
        print(json.dumps(out, indent=2))
    else:
        print_report(results, generated_at)
        save_log(results, generated_at)
        if not args.no_charts:
            plot_charts(results, scores)

    if args.save:
        out = {k: v for k, v in results.items() if k != "log"}
        out["log_snapshot"] = results["log"]
        with open(args.save, "w") as f:
            json.dump(out, f, indent=2)
        print(f"  Saved JSON -> {args.save}")
