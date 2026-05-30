-- Mock tables for demo matching runs.
-- These mirror the real tables (mentor, MENTEE_GROUPS, matches, algorithm_logs)
-- but have no auth FK constraints so they can hold synthetic data.

CREATE TABLE IF NOT EXISTS mock_mentor (
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

CREATE TABLE IF NOT EXISTS mock_mentee_groups (
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

CREATE TABLE IF NOT EXISTS mock_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID REFERENCES mock_mentor(id) ON DELETE CASCADE,
    mentee_group_id UUID REFERENCES mock_mentee_groups(id) ON DELETE CASCADE,
    compatibility_score NUMERIC,
    matched_keywords JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active',
    algorithm TEXT,
    is_stable BOOLEAN DEFAULT true,
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mentee_group_id)
);

CREATE TABLE IF NOT EXISTS mock_algorithm_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    log_data JSONB NOT NULL
);

-- ── Seed mock_mentor (6 rows with fixed UUIDs) ───────────────────────────────

INSERT INTO mock_mentor (id, first_name, last_name, email, technical_skills, forte, available_days, time_slot, communication_preference, meeting_frequency, experience, mentor_capacity, prior_mentees_count, self_description, prev_mentored_thesis, published_papers, certifications) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'Ana', 'Reyes', 'ana.reyes@demo.edu',
    '["Python", "TensorFlow", "scikit-learn", "deep learning", "neural networks", "machine learning"]',
    '["machine learning", "artificial intelligence", "data science", "neural networks"]',
    '["Monday", "Wednesday", "Friday"]',
    '["Monday:9:00-10:00", "Monday:10:00-11:00", "Wednesday:9:00-10:00", "Friday:14:00-15:00"]',
    'hybrid', 'weekly', 8, 4, 6,
    'I specialize in machine learning and deep learning, with research in neural network architectures and AI-driven data science applications.',
    '["Machine Learning for Predictive Student Analytics", "Deep Learning Approaches to Medical Imaging"]',
    '[{"title": "Transfer Learning in Healthcare Diagnosis using TensorFlow"}, {"title": "Scikit-learn Pipelines for Large-scale Machine Learning"}]',
    '["TensorFlow Developer Certificate", "AWS Machine Learning Specialty"]'
),
(
    'a0000000-0000-0000-0000-000000000002',
    'Ben', 'Santos', 'ben.santos@demo.edu',
    '["JavaScript", "React", "Node.js", "TypeScript", "software architecture", "agile"]',
    '["web development", "software engineering", "full-stack development", "agile methodology"]',
    '["Tuesday", "Thursday", "Friday"]',
    '["Tuesday:14:00-15:00", "Thursday:14:00-15:00", "Thursday:15:00-16:00", "Friday:17:00-18:00"]',
    'online', 'biweekly', 6, 4, 5,
    'I focus on software engineering and full-stack web development using React, Node.js, and TypeScript with agile practices.',
    '["Agile Software Development for SMEs", "Full-stack Web Application for Campus Events"]',
    '[{"title": "Component-Driven Architecture in React Applications"}, {"title": "Node.js Scalability Patterns for REST APIs"}]',
    '["AWS Certified Developer", "Scrum Master Certified"]'
),
(
    'a0000000-0000-0000-0000-000000000003',
    'Clara', 'Mendoza', 'clara.mendoza@demo.edu',
    '["penetration testing", "network security", "cryptography", "Python", "Linux", "Kali Linux", "ethical hacking"]',
    '["cybersecurity", "information security", "network protocols", "ethical hacking"]',
    '["Monday", "Wednesday", "Thursday"]',
    '["Monday:8:00-9:00", "Monday:9:00-10:00", "Wednesday:8:00-9:00", "Thursday:8:00-9:00"]',
    'face-to-face', 'weekly', 10, 3, 8,
    'I specialize in cybersecurity, ethical hacking, and network security research with deep expertise in cryptographic protocols and Linux-based penetration testing.',
    '["Network Intrusion Detection using Machine Learning", "Cryptographic Protocols for IoT Security"]',
    '[{"title": "Penetration Testing Methodology for Web Applications"}, {"title": "Kali Linux Tools for Network Vulnerability Assessment"}]',
    '["Certified Ethical Hacker (CEH)", "OSCP", "CompTIA Security+"]'
),
(
    'a0000000-0000-0000-0000-000000000004',
    'David', 'Lim', 'david.lim@demo.edu',
    '["SQL", "PostgreSQL", "MongoDB", "Apache Spark", "data warehousing", "ETL", "data engineering"]',
    '["database systems", "big data", "data engineering", "data analytics"]',
    '["Tuesday", "Wednesday", "Friday"]',
    '["Tuesday:9:00-10:00", "Tuesday:10:00-11:00", "Wednesday:9:00-10:00", "Friday:9:00-10:00"]',
    'hybrid', 'biweekly', 12, 4, 10,
    'I have extensive experience in database systems, big data engineering, and ETL pipeline design using PostgreSQL, MongoDB, and Apache Spark.',
    '["Big Data Processing for E-commerce Analytics", "Distributed PostgreSQL for Healthcare Records"]',
    '[{"title": "Apache Spark Optimization for Large-scale ETL"}, {"title": "PostgreSQL vs MongoDB: A Comparative Study in Data Warehousing"}]',
    '["Oracle Database Administrator", "Databricks Certified Associate Developer"]'
),
(
    'a0000000-0000-0000-0000-000000000005',
    'Elena', 'Cruz', 'elena.cruz@demo.edu',
    '["OpenCV", "PyTorch", "image processing", "object detection", "Python", "YOLO", "convolutional neural networks"]',
    '["computer vision", "image recognition", "deep learning", "object detection"]',
    '["Monday", "Wednesday", "Friday"]',
    '["Monday:14:00-15:00", "Monday:15:00-16:00", "Wednesday:14:00-15:00", "Friday:15:00-16:00"]',
    'online', 'weekly', 7, 3, 4,
    'My research focuses on computer vision, object detection, and image recognition using PyTorch, OpenCV, and YOLO architectures.',
    '["Real-time Object Detection for Traffic Monitoring", "Facial Recognition using Convolutional Neural Networks"]',
    '[{"title": "YOLO-based Object Detection in Surveillance Systems"}, {"title": "OpenCV and PyTorch for Industrial Image Inspection"}]',
    '["NVIDIA Deep Learning Institute — Computer Vision", "PyTorch Developer Certified"]'
),
(
    'a0000000-0000-0000-0000-000000000006',
    'Felix', 'Tan', 'felix.tan@demo.edu',
    '["Flutter", "Android", "iOS", "IoT", "embedded systems", "Dart", "mobile development"]',
    '["mobile development", "internet of things", "embedded systems", "cross-platform development"]',
    '["Monday", "Thursday"]',
    '["Monday:8:00-9:00", "Monday:18:00-19:00", "Thursday:8:00-9:00", "Thursday:18:00-19:00"]',
    'face-to-face', 'monthly', 9, 4, 7,
    'I specialize in mobile development using Flutter and Dart for Android and iOS, with research interests in IoT systems and embedded hardware integration.',
    '["Flutter-based Smart Campus Mobile Application", "IoT Sensor Network for Environmental Monitoring"]',
    '[{"title": "Cross-platform Mobile Development with Flutter and Dart"}, {"title": "Embedded Systems Design for IoT Health Monitoring"}]',
    '["Google Associate Android Developer", "Flutter Certified Application Developer"]'
)
ON CONFLICT (id) DO NOTHING;

-- ── Seed mock_mentee_groups (20 rows with fixed UUIDs) ───────────────────────

INSERT INTO mock_mentee_groups (id, group_name, research_title, research_description, mentor_preference, available_days, time_slot, communication_preference, meeting_frequency, email, group_members) VALUES
-- Machine Learning / AI → Dr. Ana Reyes
(
    'b0000000-0000-0000-0000-000000000001',
    'Group Prometheus',
    'Predicting Student Academic Performance using Machine Learning',
    'This study applies machine learning algorithms — specifically scikit-learn and TensorFlow — to predict academic outcomes from historical student data. Neural networks are used for feature extraction and classification, with Python as the primary language.',
    'machine learning, data science, artificial intelligence',
    '["Monday", "Wednesday"]', '["Monday:9:00-10:00", "Wednesday:9:00-10:00"]', 'hybrid', 'weekly', '', '[]'
),
(
    'b0000000-0000-0000-0000-000000000002',
    'Neural Architects',
    'Deep Learning for Medical Image Diagnosis',
    'Applying deep learning and neural networks using TensorFlow to classify medical images for early disease detection. The study focuses on convolutional neural networks trained on clinical datasets using Python and scikit-learn for preprocessing.',
    'deep learning, neural networks, TensorFlow',
    '["Wednesday", "Friday"]', '["Wednesday:9:00-10:00", "Friday:14:00-15:00"]', 'hybrid', 'weekly', '', '[]'
),
(
    'b0000000-0000-0000-0000-000000000003',
    'Data Forge',
    'Sentiment Analysis using Machine Learning and Natural Language Processing',
    'This research uses scikit-learn and Python to build a machine learning model for sentiment classification of social media text. Artificial intelligence and data science techniques are applied for text preprocessing and model evaluation.',
    'machine learning, Python, artificial intelligence',
    '["Monday", "Friday"]', '["Monday:10:00-11:00", "Friday:14:00-15:00"]', 'online', 'weekly', '', '[]'
),
(
    'b0000000-0000-0000-0000-000000000004',
    'Algorithm X',
    'Reinforcement Learning for Autonomous Decision Making',
    'Implementing reinforcement learning using TensorFlow and Python to train agents for autonomous decision-making in simulated environments. Deep learning and neural networks are applied for state representation and reward optimization.',
    'reinforcement learning, deep learning, machine learning',
    '["Monday", "Wednesday"]', '["Monday:9:00-10:00", "Wednesday:9:00-10:00"]', 'online', 'biweekly', '', '[]'
),
-- Software Engineering / Web → Prof. Ben Santos
(
    'b0000000-0000-0000-0000-000000000005',
    'Code Collective',
    'Full-stack Web Application for University Event Management using React and Node.js',
    'Building a full-stack web application using React for the frontend and Node.js for the backend API layer. The project follows agile software engineering methodology and applies software architecture principles including RESTful design.',
    'web development, React, Node.js, agile',
    '["Tuesday", "Thursday"]', '["Tuesday:14:00-15:00", "Thursday:14:00-15:00"]', 'online', 'biweekly', '', '[]'
),
(
    'b0000000-0000-0000-0000-000000000006',
    'DevStack',
    'Progressive Web Application for Course Scheduling using TypeScript and React',
    'Developing a progressive web application using TypeScript and React following agile methodology. The backend uses Node.js with software architecture patterns emphasizing full-stack development and clean code practices.',
    'TypeScript, React, software engineering',
    '["Thursday", "Friday"]', '["Thursday:15:00-16:00", "Friday:17:00-18:00"]', 'online', 'biweekly', '', '[]'
),
(
    'b0000000-0000-0000-0000-000000000007',
    'WebForge',
    'Software Architecture Design for a Scalable E-Commerce Platform',
    'Designing and implementing scalable software architecture for e-commerce using React, Node.js, and TypeScript. Agile development practices are applied throughout the full-stack development lifecycle including modular component design.',
    'software architecture, full-stack development, agile',
    '["Tuesday", "Friday"]', '["Tuesday:14:00-15:00", "Friday:17:00-18:00"]', 'online', 'biweekly', '', '[]'
),
(
    'b0000000-0000-0000-0000-000000000008',
    'System Builders',
    'Agile Development of a Real-time Collaboration Tool using JavaScript',
    'Using agile software engineering methodology to develop a real-time collaboration platform with JavaScript, React, and Node.js. The study explores web development design patterns and software architecture for collaborative systems.',
    'JavaScript, agile methodology, web development',
    '["Tuesday", "Thursday"]', '["Tuesday:14:00-15:00", "Thursday:14:00-15:00"]', 'hybrid', 'weekly', '', '[]'
),
-- Cybersecurity → Dr. Clara Mendoza
(
    'b0000000-0000-0000-0000-000000000009',
    'CipherForce',
    'Penetration Testing Framework for Web Application Security',
    'Developing a penetration testing methodology for identifying vulnerabilities in web applications. Using Python, Kali Linux, and ethical hacking techniques to assess network security and information security posture of target systems.',
    'cybersecurity, penetration testing, ethical hacking',
    '["Monday", "Wednesday"]', '["Monday:8:00-9:00", "Wednesday:8:00-9:00"]', 'face-to-face', 'weekly', '', '[]'
),
(
    'b0000000-0000-0000-0000-000000000010',
    'SecureGuard',
    'Cryptographic Protocol for Secure Data Transmission in Network Systems',
    'Designing a cryptography-based protocol for securing network communications against eavesdropping and tampering. Using Python to implement information security mechanisms and network protocols with penetration testing for validation.',
    'cryptography, network security, information security',
    '["Monday", "Thursday"]', '["Monday:9:00-10:00", "Thursday:8:00-9:00"]', 'face-to-face', 'weekly', '', '[]'
),
(
    'b0000000-0000-0000-0000-000000000011',
    'NetShield',
    'Network Intrusion Detection System using Cybersecurity and Python',
    'Building a network security intrusion detection system using cybersecurity techniques and Python on Linux. The system uses ethical hacking principles and network protocol analysis with Kali Linux tools to detect and classify threats.',
    'network security, Linux, cybersecurity',
    '["Wednesday", "Thursday"]', '["Wednesday:8:00-9:00", "Thursday:8:00-9:00"]', 'face-to-face', 'weekly', '', '[]'
),
-- Database / Big Data → Prof. David Lim
(
    'b0000000-0000-0000-0000-000000000012',
    'DataVault',
    'Distributed Database System for Healthcare Records Management',
    'Designing a distributed database system using PostgreSQL and MongoDB for managing large-scale healthcare records. The study applies big data principles with ETL pipelines and data warehousing strategies for efficient analytics.',
    'database systems, PostgreSQL, big data',
    '["Tuesday", "Wednesday"]', '["Tuesday:9:00-10:00", "Wednesday:9:00-10:00"]', 'hybrid', 'biweekly', '', '[]'
),
(
    'b0000000-0000-0000-0000-000000000013',
    'QueryPros',
    'Big Data Analytics Platform using Apache Spark and SQL',
    'Implementing a big data analytics platform using Apache Spark and SQL for processing large-scale datasets. Data engineering techniques including ETL and data warehousing are applied for business intelligence and reporting.',
    'Apache Spark, big data, data engineering',
    '["Wednesday", "Friday"]', '["Wednesday:9:00-10:00", "Friday:9:00-10:00"]', 'hybrid', 'biweekly', '', '[]'
),
(
    'b0000000-0000-0000-0000-000000000014',
    'SchemaBuilders',
    'PostgreSQL Performance Optimization for Large-scale Data Engineering',
    'Investigating performance optimization strategies for PostgreSQL in data engineering workflows. The study covers SQL query tuning, indexing design, and integration with Apache Spark for big data processing and ETL pipelines.',
    'PostgreSQL, SQL, data warehousing',
    '["Tuesday", "Friday"]', '["Tuesday:10:00-11:00", "Friday:9:00-10:00"]', 'online', 'biweekly', '', '[]'
),
-- Computer Vision → Dr. Elena Cruz
(
    'b0000000-0000-0000-0000-000000000015',
    'VisionLab',
    'Real-time Object Detection using YOLO and PyTorch',
    'Implementing a real-time object detection system using YOLO and PyTorch for surveillance and traffic monitoring. Computer vision and image processing techniques are applied using OpenCV for video stream analysis and bounding box prediction.',
    'computer vision, object detection, YOLO',
    '["Monday", "Wednesday"]', '["Monday:14:00-15:00", "Wednesday:14:00-15:00"]', 'online', 'weekly', '', '[]'
),
(
    'b0000000-0000-0000-0000-000000000016',
    'PixelMinds',
    'Facial Recognition System using Convolutional Neural Networks and OpenCV',
    'Developing a facial recognition system using convolutional neural networks implemented in PyTorch with OpenCV for preprocessing. Deep learning and image recognition techniques are combined for biometric identity verification.',
    'image recognition, convolutional neural networks, OpenCV',
    '["Wednesday", "Friday"]', '["Wednesday:14:00-15:00", "Friday:15:00-16:00"]', 'online', 'weekly', '', '[]'
),
(
    'b0000000-0000-0000-0000-000000000017',
    'SightTech',
    'Image Processing for Automated Quality Control using Computer Vision',
    'Applying computer vision and image processing using OpenCV and PyTorch for automated quality inspection in manufacturing. Object detection and deep learning identify defects, while image recognition validates product conformity.',
    'image processing, computer vision, PyTorch',
    '["Monday", "Friday"]', '["Monday:15:00-16:00", "Friday:15:00-16:00"]', 'online', 'weekly', '', '[]'
),
-- Mobile / IoT → Prof. Felix Tan
(
    'b0000000-0000-0000-0000-000000000018',
    'MobileHub',
    'Cross-platform Flutter Application for Smart Home IoT Control',
    'Building a cross-platform mobile application using Flutter and Dart for controlling IoT smart home devices on Android and iOS. The system integrates with embedded sensors and actuators for real-time smart home automation.',
    'Flutter, mobile development, IoT',
    '["Monday", "Thursday"]', '["Monday:8:00-9:00", "Thursday:8:00-9:00"]', 'face-to-face', 'monthly', '', '[]'
),
(
    'b0000000-0000-0000-0000-000000000019',
    'IoTLink',
    'IoT-based Environmental Monitoring System with Android Mobile Dashboard',
    'Developing an IoT environmental monitoring system with an Android mobile dashboard built in Flutter. Embedded systems and sensors transmit sensor data to the mobile application for real-time display and alerting on both Android and iOS.',
    'IoT, Android, embedded systems',
    '["Monday", "Thursday"]', '["Monday:8:00-9:00", "Thursday:18:00-19:00"]', 'face-to-face', 'monthly', '', '[]'
),
(
    'b0000000-0000-0000-0000-000000000020',
    'EmbedDev',
    'Flutter Health Monitoring App with Wearable IoT Device Integration',
    'Creating a Flutter mobile application for real-time health monitoring using IoT wearable devices on Android and iOS platforms. Embedded systems hardware continuously collects biometric data, which the cross-platform mobile app visualizes.',
    'Flutter, IoT, mobile development, embedded systems',
    '["Thursday"]', '["Thursday:18:00-19:00"]', 'hybrid', 'monthly', '', '[]'
)
ON CONFLICT (id) DO NOTHING;

-- ── Mock proposal tables ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mock_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentee_group_id UUID REFERENCES mock_mentee_groups(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES mock_mentor(id) ON DELETE CASCADE,
    title TEXT,
    file_name TEXT,
    file_path TEXT,
    status TEXT DEFAULT 'pending',
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mock_paper_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID REFERENCES mock_papers(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES mock_mentor(id) ON DELETE CASCADE,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Seed mock_papers (12 rows — 6 reviewed, 6 pending) ───────────────────────

INSERT INTO mock_papers (id, mentee_group_id, mentor_id, title, file_name, file_path, status, submitted_at) VALUES
-- Ana Reyes groups
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
 'Predicting Student Academic Performance using Machine Learning', NULL, NULL, 'reviewed',
 NOW() - INTERVAL '12 days'),
('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
 'Deep Learning for Medical Image Diagnosis', NULL, NULL, 'pending',
 NOW() - INTERVAL '2 days'),
-- Ben Santos groups
('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002',
 'Full-stack Web Application for University Event Management using React and Node.js', NULL, NULL, 'reviewed',
 NOW() - INTERVAL '10 days'),
('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002',
 'Progressive Web Application for Course Scheduling using TypeScript and React', NULL, NULL, 'pending',
 NOW() - INTERVAL '1 day'),
-- Clara Mendoza groups
('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003',
 'Penetration Testing Framework for Web Application Security', NULL, NULL, 'reviewed',
 NOW() - INTERVAL '14 days'),
('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000003',
 'Network Intrusion Detection System using Cybersecurity and Python', NULL, NULL, 'pending',
 NOW() - INTERVAL '3 days'),
-- David Lim groups
('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000004',
 'Distributed Database System for Healthcare Records Management', NULL, NULL, 'reviewed',
 NOW() - INTERVAL '9 days'),
('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000004',
 'Big Data Analytics Platform using Apache Spark and SQL', NULL, NULL, 'pending',
 NOW() - INTERVAL '2 days'),
-- Elena Cruz groups
('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000005',
 'Real-time Object Detection using YOLO and PyTorch', NULL, NULL, 'reviewed',
 NOW() - INTERVAL '11 days'),
('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000005',
 'Facial Recognition System using Convolutional Neural Networks and OpenCV', NULL, NULL, 'pending',
 NOW() - INTERVAL '1 day'),
-- Felix Tan groups
('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000006',
 'Cross-platform Flutter Application for Smart Home IoT Control', NULL, NULL, 'reviewed',
 NOW() - INTERVAL '7 days'),
('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000006',
 'IoT-based Environmental Monitoring System with Android Mobile Dashboard', NULL, NULL, 'pending',
 NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- ── Seed mock_paper_comments (6 rows — one per reviewed paper) ───────────────

INSERT INTO mock_paper_comments (id, paper_id, mentor_id, comment, created_at) VALUES
('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
 'Strong methodology overall. The use of scikit-learn pipelines is well-suited for this dataset size. I recommend adding a cross-validation section to strengthen the evaluation — consider k-fold with stratified splits given the class imbalance you described.',
 NOW() - INTERVAL '10 days'),
('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002',
 'Good structure and the React component breakdown is clean. The API layer needs more detail — clarify how you handle session state between the Node.js backend and the React frontend. Also expand the error-handling section for failed event submissions.',
 NOW() - INTERVAL '8 days'),
('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003',
 'Solid threat modeling section. The penetration testing scope is clearly defined. For the next revision, include a CVSS scoring table for each identified vulnerability and add a remediation timeline. The Kali Linux toolchain selection is appropriate for the target environment.',
 NOW() - INTERVAL '12 days'),
('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000004',
 'The schema design is well thought out for the OLTP workload. Revise the ETL pipeline diagram — it currently shows the transformation step before extraction, which is misleading. Also benchmark the PostgreSQL partitioning strategy against a baseline before finalizing.',
 NOW() - INTERVAL '7 days'),
('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000005',
 'YOLO v8 is a good choice for the real-time constraint. The mAP results look promising but the paper needs an ablation study comparing anchor-based vs anchor-free detection heads. Also clarify the frame rate benchmarks — are those measured on GPU or CPU inference?',
 NOW() - INTERVAL '9 days'),
('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000006',
 'Flutter integration with the MQTT broker is well-implemented. Add a section on offline resilience — what happens when the IoT gateway loses connectivity? The embedded sensor calibration process also needs more documentation for reproducibility.',
 NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;


-- ── Mock preference tables (mirroring real mentee_preferences / mentor_preferences) ──

CREATE TABLE IF NOT EXISTS mock_mentee_preferences (
    mentee_group_id uuid PRIMARY KEY REFERENCES mock_mentee_groups(id) ON DELETE CASCADE,
    ranked_mentors  jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mock_mentor_preferences (
    mentor_id      uuid PRIMARY KEY REFERENCES mock_mentor(id) ON DELETE CASCADE,
    ranked_mentees jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at     timestamptz DEFAULT now()
);
