"""
Insert 3 mock mentors designed to cover:
  - NovaSoft + Fusion Logic   → Dr. Maria Santos (software testing, AST, compiler design)
  - Binary Beasts + Kerb      → Dr. Jose Reyes   (ML, recommendation systems, OCR, CV)
  - Invicti Fortes + Fortis   → Dr. Ana Cruz     (algorithms, HCI, educational tech)
"""

import json
import os
import sys
import urllib.request
import urllib.parse

SUPABASE_URL = "https://arztiouvmvuhdtclodoo.supabase.co"
SERVICE_KEY  = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenRpb3V2bXZ1"
    "aGR0Y2xvZG9vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwNTYzNCwiZXhwIjoyMDg3NTgx"
    "NjM0fQ.tGqWp5vuGzEzp7sqLnPi7dcY7dSbcVWalIO7TLA9BXU"
)

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


def req(method: str, path: str, body=None):
    url = SUPABASE_URL + path
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


MENTORS = [
    {
        "email": "msantos_mock@feutech.edu.ph",
        "password": "MockPass2026!",
        "first_name": "Maria",
        "last_name": "Santos",
        "experience": 8,
        "mentor_capacity": 5,
        "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "time_slot": [
            "Monday:9:00-10:00", "Monday:14:00-15:00",
            "Tuesday:9:00-10:00", "Tuesday:14:00-15:00",
            "Wednesday:10:00-11:00", "Wednesday:15:00-16:00",
            "Thursday:9:00-10:00", "Thursday:14:00-15:00",
            "Friday:9:00-10:00", "Friday:13:00-14:00",
        ],
        "self_description": (
            "Software engineering and testing expert specializing in mutation testing, software "
            "quality assurance, static code analysis, and compiler design. Has extensive experience "
            "in program analysis, abstract syntax tree processing, code clone detection, and "
            "refactoring techniques. Research interests include intelligent mutation operator "
            "selection, code quality improvement, and automated debugging. Proficient in developing "
            "scalable testing frameworks for open-source software and applying formal methods to "
            "improve fault detection in large-scale development environments."
        ),
        "forte": [
            "Software Testing and Quality Assurance",
            "Software Engineering",
            "Compiler Design and Program Analysis",
            "Static Code Analysis and AST Processing",
            "Mutation Testing and Fault Detection",
        ],
        "technical_skills": [
            "Java", "Python", "C++",
            "Mutation Testing (PIT, Major)",
            "AST Analysis (ANTLR, Tree-sitter)",
            "JUnit", "PyTest",
            "Static Analysis Tools",
            "SonarQube",
            "GitHub CI/CD",
        ],
        "prev_mentored_thesis": [
            {
                "title_no": "2021",
                "title": "Automated Test Suite Generation Using Genetic Algorithms for Java Applications",
                "mentor": "Dr. Maria Santos",
                "year": "2022",
            },
            {
                "title_no": "2024",
                "title": "Cost-Efficient Mutation Operator Selection Using Machine Learning for Python Codebases",
                "mentor": "Dr. Maria Santos",
                "year": "2024",
            },
        ],
        "published_papers": [
            {
                "title": "Intelligent Mutation Operator Prioritization in Open-Source Java Projects",
                "authors": ["Maria Santos", "R. Dizon"],
                "year": "2023",
                "url": "",
            }
        ],
    },
    {
        "email": "jreyes_mock@feutech.edu.ph",
        "password": "MockPass2026!",
        "first_name": "Jose",
        "last_name": "Reyes",
        "experience": 7,
        "mentor_capacity": 5,
        "available_days": ["Monday", "Tuesday", "Wednesday", "Friday", "Saturday"],
        "time_slot": [
            "Monday:9:00-10:00", "Monday:13:00-14:00",
            "Tuesday:10:00-11:00", "Tuesday:14:00-15:00",
            "Wednesday:9:00-10:00", "Wednesday:15:00-16:00",
            "Friday:9:00-10:00", "Friday:14:00-15:00",
            "Saturday:9:00-10:00", "Saturday:10:00-11:00",
        ],
        "self_description": (
            "Data scientist and machine learning researcher with expertise in recommendation "
            "systems, computer vision, and intelligent document processing. Has developed "
            "collaborative filtering and matrix factorization models for e-commerce platforms and "
            "built OCR-based financial data extraction systems. Research interests include adaptive "
            "classification, neural network architectures, and trust-centered AI design. "
            "Experienced in deploying scalable ML solutions for financial technology, image "
            "processing pipelines, and personalized recommendation engines."
        ),
        "forte": [
            "Machine Learning and Data Science",
            "Recommendation Systems and Collaborative Filtering",
            "Computer Vision and Optical Character Recognition",
            "Financial Technology and Document Intelligence",
            "Data Mining and Predictive Analytics",
        ],
        "technical_skills": [
            "Python", "JavaScript", "TypeScript",
            "TensorFlow", "PyTorch", "scikit-learn",
            "OpenCV", "Tesseract OCR",
            "Collaborative Filtering", "Matrix Factorization",
            "PostgreSQL", "MongoDB",
        ],
        "prev_mentored_thesis": [
            {
                "title_no": "2019",
                "title": "Hybrid Recommendation Engine Using Collaborative Filtering and Content-Based Approaches for Online Retail",
                "mentor": "Dr. Jose Reyes",
                "year": "2023",
            },
            {
                "title_no": "2022",
                "title": "OCR-Based Automated Financial Document Parser with Adaptive Classification",
                "mentor": "Dr. Jose Reyes",
                "year": "2024",
            },
        ],
        "published_papers": [
            {
                "title": "Addressing Cold-Start in E-Commerce Recommenders via Hybrid Matrix Factorization",
                "authors": ["Jose Reyes", "L. Mendoza", "P. Garcia"],
                "year": "2022",
                "url": "",
            }
        ],
    },
    {
        "email": "acruz_mock@feutech.edu.ph",
        "password": "MockPass2026!",
        "first_name": "Ana",
        "last_name": "Cruz",
        "experience": 9,
        "mentor_capacity": 5,
        "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "time_slot": [
            "Monday:10:00-11:00", "Monday:14:00-15:00",
            "Tuesday:9:00-10:00", "Tuesday:15:00-16:00",
            "Wednesday:9:00-10:00", "Wednesday:14:00-15:00",
            "Thursday:10:00-11:00", "Thursday:15:00-16:00",
            "Friday:9:00-10:00", "Friday:14:00-15:00",
        ],
        "self_description": (
            "Algorithm design and human-computer interaction expert specializing in graph "
            "algorithms, stable matching systems, and educational technology. Has extensive "
            "experience implementing Floyd-Warshall, Gale-Shapley, and other optimization "
            "algorithms in web-based platforms. Research interests include navigation optimization, "
            "cognitive load reduction, and usability engineering in educational applications. "
            "Proficient in full-stack web development, database design, system analysis, and "
            "designing user-centered interfaces for academic and decision-support systems."
        ),
        "forte": [
            "Algorithm Design and Graph Algorithms",
            "Human-Computer Interaction and UX Design",
            "Educational Technology and E-Learning Systems",
            "Stable Matching and Optimization Algorithms",
            "System Analysis and Web Application Development",
        ],
        "technical_skills": [
            "Python", "JavaScript", "TypeScript",
            "React", "Next.js", "Node.js",
            "PostgreSQL", "Firebase",
            "Graph Algorithms (Floyd-Warshall, Gale-Shapley)",
            "Figma", "Usability Testing",
        ],
        "prev_mentored_thesis": [
            {
                "title_no": "2020",
                "title": "Graph-Based Navigation Optimization for Mobile Learning Applications",
                "mentor": "Dr. Ana Cruz",
                "year": "2023",
            },
            {
                "title_no": "2025",
                "title": "Stable Matching Algorithm for Academic Resource Allocation in University Systems",
                "mentor": "Dr. Ana Cruz",
                "year": "2024",
            },
        ],
        "published_papers": [
            {
                "title": "Reducing Cognitive Load in Educational Apps via Shortest-Path Navigation Optimization",
                "authors": ["Ana Cruz", "M. Villanueva"],
                "year": "2023",
                "url": "",
            }
        ],
    },
]


def create_auth_user(email: str, password: str) -> str | None:
    status, body = req(
        "POST",
        "/auth/v1/admin/users",
        {"email": email, "password": password, "email_confirm": True},
    )
    if status in (200, 201):
        uid = body.get("id")
        print(f"  Auth user created: {uid}")
        return uid
    if status == 422 and "already" in str(body).lower():
        # User exists — fetch their id
        status2, existing = req("GET", f"/auth/v1/admin/users?email={urllib.parse.quote(email)}")
        if status2 == 200 and existing.get("users"):
            uid = existing["users"][0]["id"]
            print(f"  Auth user already exists: {uid}")
            return uid
    print(f"  ERROR creating auth user: {status} {body}")
    return None


def upsert_mentor(uid: str, m: dict):
    payload = {
        "id": uid,
        "email": m["email"],
        "first_name": m["first_name"],
        "last_name": m["last_name"],
        "experience": m["experience"],
        "mentor_capacity": m["mentor_capacity"],
        "available_days": m["available_days"],
        "time_slot": m["time_slot"],
        "self_description": m["self_description"],
        "forte": m["forte"],
        "technical_skills": m["technical_skills"],
        "prev_mentored_thesis": m["prev_mentored_thesis"],
        "published_papers": m["published_papers"],
        "role": "mentor",
        "profile_completed": True,
        "is_admin": False,
    }
    status, body = req("POST", "/rest/v1/mentor", payload)
    if status in (200, 201):
        print(f"  Mentor record inserted.")
        return True
    if status == 409 or (isinstance(body, dict) and "duplicate" in str(body).lower()):
        # Already exists, patch instead
        status2, body2 = req(
            "PATCH",
            f"/rest/v1/mentor?id=eq.{uid}",
            {k: v for k, v in payload.items() if k != "id"},
        )
        if status2 in (200, 204):
            print(f"  Mentor record updated (already existed).")
            return True
        print(f"  ERROR updating mentor: {status2} {body2}")
        return False
    print(f"  ERROR inserting mentor: {status} {body}")
    return False


def main():
    for m in MENTORS:
        name = f"Dr. {m['first_name']} {m['last_name']}"
        print(f"\n--- {name} ({m['email']}) ---")
        uid = create_auth_user(m["email"], m["password"])
        if not uid:
            print(f"  SKIPPED (no auth user id)")
            continue
        upsert_mentor(uid, m)
    print("\nDone.")


if __name__ == "__main__":
    main()
