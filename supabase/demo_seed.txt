-- O(n) demo tables — mirror mock_ schema but with perfectly disjoint domain data.
-- 6 mentors (one per domain) × 6 mentee groups (one per domain).
-- Designed so each group's TF-IDF score is ~1.0 with one mentor and ~0 with all others.
-- Gale-Shapley completes in 1 round: every proposal is immediately accepted (no rejections).

CREATE TABLE IF NOT EXISTS demo_mentor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    technical_skills JSONB DEFAULT '[]'::jsonb,
    forte JSONB DEFAULT '[]'::jsonb,
    available_days JSONB DEFAULT '[]'::jsonb,
    time_slot JSONB DEFAULT '[]'::jsonb,
    communication_preference TEXT,
    meeting_frequency TEXT,
    experience INTEGER DEFAULT 0,
    mentor_capacity INTEGER DEFAULT 1,
    prior_mentees_count INTEGER DEFAULT 0,
    self_description TEXT,
    prev_mentored_thesis JSONB DEFAULT '[]'::jsonb,
    published_papers JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    is_admin BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS demo_mentee_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name TEXT,
    research_title TEXT,
    research_description TEXT,
    mentor_preference TEXT,
    available_days JSONB DEFAULT '[]'::jsonb,
    time_slot JSONB DEFAULT '[]'::jsonb,
    communication_preference TEXT,
    meeting_frequency TEXT,
    email TEXT,
    group_members JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS demo_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID REFERENCES demo_mentor(id) ON DELETE CASCADE,
    mentee_group_id UUID REFERENCES demo_mentee_groups(id) ON DELETE CASCADE,
    compatibility_score NUMERIC,
    matched_keywords JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active',
    algorithm TEXT,
    is_stable BOOLEAN DEFAULT true,
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mentee_group_id)
);

CREATE TABLE IF NOT EXISTS demo_algorithm_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    log_data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_mentee_preferences (
    mentee_group_id uuid PRIMARY KEY REFERENCES demo_mentee_groups(id) ON DELETE CASCADE,
    ranked_mentors  jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS demo_mentor_preferences (
    mentor_id      uuid PRIMARY KEY REFERENCES demo_mentor(id) ON DELETE CASCADE,
    ranked_mentees jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at     timestamptz DEFAULT now()
);

-- ── Seed demo_mentor (6 rows — one specialist per domain) ────────────────────
-- All share identical availability/communication/frequency so only research
-- keywords drive compatibility scores, guaranteeing disjoint first-choice rankings.

INSERT INTO demo_mentor (id, first_name, last_name, email, technical_skills, forte, available_days, time_slot, communication_preference, meeting_frequency, experience, mentor_capacity, prior_mentees_count, self_description, prev_mentored_thesis, published_papers, certifications) VALUES
(
    'e0000000-0000-0000-0000-000000000001',
    'Dr. Ana', 'Reyes', 'ana.reyes@demo.edu',
    '["machine learning", "neural networks", "deep learning", "model training", "artificial intelligence"]',
    '["machine learning", "artificial intelligence", "deep learning"]',
    '["Tuesday", "Friday"]',
    '["Tuesday:10:00-11:00", "Friday:10:00-11:00"]',
    'online', 'weekly', 10, 1, 8,
    'Specialist in machine learning, neural networks, deep learning, model training, and artificial intelligence research.',
    '["Machine Learning for Predictive Analytics", "Deep Learning in Medical Imaging"]',
    '[{"title": "Neural Networks for Large-scale Classification"}, {"title": "Model Training Strategies for Transfer Learning"}]',
    '["TensorFlow Developer Certificate"]'
),
(
    'e0000000-0000-0000-0000-000000000002',
    'Dr. Ben', 'Cruz', 'ben.cruz@demo.edu',
    '["cybersecurity", "network security", "cryptography", "penetration testing", "ethical hacking"]',
    '["cybersecurity", "network security", "cryptography"]',
    '["Tuesday", "Friday"]',
    '["Tuesday:10:00-11:00", "Friday:10:00-11:00"]',
    'online', 'weekly', 9, 1, 7,
    'Specialist in cybersecurity, network security, cryptography, penetration testing, and ethical hacking methodologies.',
    '["Cryptographic Protocol for IoT Security", "Network Intrusion Detection using ML"]',
    '[{"title": "Penetration Testing Frameworks for Enterprise Networks"}, {"title": "Cryptographic Key Exchange in Distributed Systems"}]',
    '["Certified Ethical Hacker (CEH)", "CompTIA Security+"]'
),
(
    'e0000000-0000-0000-0000-000000000003',
    'Dr. Carla', 'Tan', 'carla.tan@demo.edu',
    '["user interface design", "UX research", "usability testing", "accessibility", "interaction design"]',
    '["human-computer interaction", "UX design", "usability testing"]',
    '["Tuesday", "Friday"]',
    '["Tuesday:10:00-11:00", "Friday:10:00-11:00"]',
    'online', 'weekly', 8, 1, 6,
    'Specialist in user interface design, UX research, usability testing, accessibility, and interaction design for inclusive software.',
    '["Usability Testing for Accessibility in Educational Apps", "UX Research Methods in Mobile Design"]',
    '[{"title": "Accessibility Guidelines for Web Interface Design"}, {"title": "Interaction Design Patterns for Elderly Users"}]',
    '["UX Design Certificate — Nielsen Norman Group"]'
),
(
    'e0000000-0000-0000-0000-000000000004',
    'Dr. David', 'Lim', 'david.lim@demo.edu',
    '["database design", "SQL optimization", "data modeling", "NoSQL", "query performance tuning"]',
    '["database systems", "data modeling", "SQL optimization"]',
    '["Tuesday", "Friday"]',
    '["Tuesday:10:00-11:00", "Friday:10:00-11:00"]',
    'online', 'weekly', 11, 1, 9,
    'Specialist in database design, SQL optimization, data modeling, NoSQL systems, and query performance tuning at scale.',
    '["SQL Optimization for Healthcare Record Systems", "NoSQL Design for Real-time Applications"]',
    '[{"title": "Query Performance Tuning in PostgreSQL"}, {"title": "Data Modeling Patterns for Distributed NoSQL"}]',
    '["Oracle Database Administrator", "Databricks Certified"]'
),
(
    'e0000000-0000-0000-0000-000000000005',
    'Dr. Eva', 'Park', 'eva.park@demo.edu',
    '["image processing", "object detection", "feature extraction", "convolutional neural networks", "visual recognition"]',
    '["computer vision", "image processing", "object detection"]',
    '["Tuesday", "Friday"]',
    '["Tuesday:10:00-11:00", "Friday:10:00-11:00"]',
    'online', 'weekly', 8, 1, 5,
    'Specialist in image processing, object detection, feature extraction, convolutional neural networks, and visual recognition systems.',
    '["Object Detection for Traffic Monitoring", "Visual Recognition in Industrial Inspection"]',
    '[{"title": "Convolutional Neural Networks for Feature Extraction"}, {"title": "Image Processing Pipelines for Real-time Detection"}]',
    '["NVIDIA Deep Learning Institute — Computer Vision"]'
),
(
    'e0000000-0000-0000-0000-000000000006',
    'Dr. Felix', 'Gomez', 'felix.gomez@demo.edu',
    '["software architecture", "agile methodology", "design patterns", "continuous integration", "DevOps"]',
    '["software engineering", "agile methodology", "design patterns"]',
    '["Tuesday", "Friday"]',
    '["Tuesday:10:00-11:00", "Friday:10:00-11:00"]',
    'online', 'weekly', 10, 1, 8,
    'Specialist in software architecture, agile methodology, design patterns, continuous integration, and DevOps practices.',
    '["Agile Software Architecture for Enterprise Systems", "DevOps Pipeline Design for CI/CD"]',
    '[{"title": "Design Patterns for Scalable Software Architecture"}, {"title": "Continuous Integration Strategies in Agile Teams"}]',
    '["AWS DevOps Professional", "Scrum Master Certified"]'
)
ON CONFLICT (id) DO NOTHING;

-- ── Seed demo_mentee_groups (6 rows — one per domain, matching one mentor each) ──

INSERT INTO demo_mentee_groups (id, group_name, research_title, research_description, mentor_preference, available_days, time_slot, communication_preference, meeting_frequency, email, group_members) VALUES
(
    'f0000000-0000-0000-0000-000000000001',
    'Group Alpha',
    'Machine Learning Pipeline for Academic Performance Prediction',
    'This study applies machine learning and deep learning methods — specifically neural networks and model training pipelines — to predict academic outcomes from student data. Artificial intelligence techniques are used for feature extraction and classification. The research evaluates multiple model training strategies and benchmarks them across standardized datasets.',
    'machine learning, deep learning, neural networks, artificial intelligence',
    '["Tuesday", "Friday"]', '["Tuesday:10:00-11:00", "Friday:10:00-11:00"]', 'online', 'weekly', '', '[]'
),
(
    'f0000000-0000-0000-0000-000000000002',
    'Group Beta',
    'Cryptographic Protocol for Secure Network Communication',
    'Designing a cybersecurity framework using cryptography to protect network security communications from interception and tampering. Penetration testing and ethical hacking techniques validate the protocol under simulated attack scenarios. The study focuses on network security resilience and cryptographic key management.',
    'cybersecurity, network security, cryptography, penetration testing',
    '["Tuesday", "Friday"]', '["Tuesday:10:00-11:00", "Friday:10:00-11:00"]', 'online', 'weekly', '', '[]'
),
(
    'f0000000-0000-0000-0000-000000000003',
    'Group Gamma',
    'Usability Testing Framework for Accessibility in Educational Interfaces',
    'Evaluating user interface design through systematic UX research and usability testing for learners with disabilities. The study examines accessibility standards and interaction design guidelines to produce inclusive educational software. Findings are validated through user studies applying established UX research protocols.',
    'user interface design, usability testing, accessibility, UX research',
    '["Tuesday", "Friday"]', '["Tuesday:10:00-11:00", "Friday:10:00-11:00"]', 'online', 'weekly', '', '[]'
),
(
    'f0000000-0000-0000-0000-000000000004',
    'Group Delta',
    'SQL Query Optimization for Large-scale Data Modeling',
    'Investigating database design and SQL optimization techniques for complex data modeling scenarios in enterprise environments. NoSQL alternatives are compared against relational approaches, and query performance tuning strategies are benchmarked across workloads. The study contributes guidelines for choosing appropriate database design patterns.',
    'database design, SQL optimization, data modeling, NoSQL',
    '["Tuesday", "Friday"]', '["Tuesday:10:00-11:00", "Friday:10:00-11:00"]', 'online', 'weekly', '', '[]'
),
(
    'f0000000-0000-0000-0000-000000000005',
    'Group Epsilon',
    'Object Detection using Convolutional Neural Networks for Medical Imaging',
    'Applying computer vision and image processing techniques with convolutional neural networks for object detection in medical scan data. Feature extraction pipelines are designed to support visual recognition of anomalies across imaging modalities. The study evaluates detection accuracy and inference speed on clinical datasets.',
    'computer vision, image processing, object detection, convolutional neural networks',
    '["Tuesday", "Friday"]', '["Tuesday:10:00-11:00", "Friday:10:00-11:00"]', 'online', 'weekly', '', '[]'
),
(
    'f0000000-0000-0000-0000-000000000006',
    'Group Zeta',
    'Agile Methodology for Software Architecture Design in Enterprise Systems',
    'Evaluating software architecture patterns using agile methodology and design patterns for large-scale enterprise software engineering. Continuous integration pipelines and DevOps practices are integrated throughout the development lifecycle. The study produces a framework linking agile methodology decisions to software architecture outcomes.',
    'software architecture, agile methodology, design patterns, DevOps',
    '["Tuesday", "Friday"]', '["Tuesday:10:00-11:00", "Friday:10:00-11:00"]', 'online', 'weekly', '', '[]'
)
ON CONFLICT (id) DO NOTHING;
