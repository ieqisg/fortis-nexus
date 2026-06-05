-- Edit real mentor profiles so TF-IDF keyword overlap routes each mentee group
-- to its best-fit mentor. Touches only: technical_skills, forte, self_description,
-- available_days, time_slot, communication_preference.
-- Does NOT touch: prev_mentored_thesis, published_papers, experience, mentor_capacity.

-- ─── 1. Test Mentor → Fortis Programmatores ────────────────────────────────
-- All fields were null. Filled with stable matching / software engineering /
-- web development keywords to guarantee top TF-IDF match for Fortis Programmatores.
-- Saturday added → FACE_TO_FACE (matches Fortis Programmatores preference).
UPDATE mentor SET
  technical_skills = '["Python", "JavaScript", "TypeScript", "SQL", "PostgreSQL", "React", "Next.js", "Node.js", "Git"]'::jsonb,
  forte = '["Algorithm Design and Stable Matching Systems", "Software Engineering and System Analysis and Design", "Web Application Development and Full-Stack Systems", "Database Management and Query Optimization", "Research Methods in Computer Science and Information Technology"]'::jsonb,
  available_days = '["Monday", "Wednesday", "Saturday"]'::jsonb,
  time_slot = '["Monday:11:00-12:00", "Monday:13:00-14:00", "Wednesday:11:00-12:00", "Wednesday:16:00-17:00", "Saturday:10:00-11:00"]'::jsonb,
  communication_preference = 'FACE_TO_FACE',
  self_description = 'A researcher and faculty member specializing in algorithm design, stable matching algorithms, and software engineering for academic and institutional systems. My work focuses on developing web-based decision-support platforms, database management systems, and full-stack applications for educational environments. I have research experience implementing and analyzing stable matching algorithms — including the Gale-Shapley algorithm and its hospital-resident variant — as well as mentor-mentee matching systems, software architecture, and system analysis and design. I also have expertise in web application development, database design, query optimization, and research methodology in Computer Science and Information Technology.'
WHERE id = '20984d39-c50b-4fe2-83c6-5c741a1c4acf';

-- ─── 2. Angelo Arguson → InsomniCode + Invicti Fortes + Data Pioneers ──────
-- Added: Floyd-Warshall/graph algorithms (Invicti Fortes), gamification/
-- behavioral analytics (InsomniCode), data mining/learning analytics (Data Pioneers).
-- Saturday added → FACE_TO_FACE (all 3 target groups prefer FACE_TO_FACE).
UPDATE mentor SET
  technical_skills = '["Python", "C", "C++", "C#", "JavaScript", "TypeScript", "scikit-learn", "TensorFlow", "Unity"]'::jsonb,
  forte = '["Intelligent Tutoring Systems (ITS) and Adaptive Learning", "Educational Technology and E-Learning Systems", "Machine Learning, Data Mining, and Predictive Analytics", "Decision Tree, Bayesian Network, and Graph Algorithm Applications", "Gamification, Game Development, and Behavioral Analytics Systems", "Floyd-Warshall and A* Algorithm for Pathfinding and Navigation Optimization", "Educational Data Mining and Learning Analytics"]'::jsonb,
  available_days = '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]'::jsonb,
  time_slot = '["Monday:9:00-10:00", "Monday:14:00-15:00", "Monday:15:00-16:00", "Monday:16:00-17:00", "Tuesday:14:00-15:00", "Wednesday:17:00-18:00", "Thursday:14:00-15:00", "Thursday:15:00-16:00", "Friday:9:00-10:00", "Friday:10:00-11:00", "Friday:11:00-12:00", "Saturday:10:00-11:00", "Saturday:13:00-14:00"]'::jsonb,
  communication_preference = 'FACE_TO_FACE',
  self_description = 'A researcher and mentor specializing in intelligent tutoring systems, educational technology, machine learning, and AI-driven adaptive learning environments. My work focuses on gamification-based behavioral analytics platforms, educational data mining, predictive analytics for student performance, and intelligent tutoring systems for programming and computational thinking. I apply graph algorithms — including Floyd-Warshall and A* pathfinding — to optimize navigation structures and reduce cognitive load in educational applications. My research spans data mining and learning analytics for student outcome prediction, gamified model-tracing systems for C# and programming education, and decision support systems built on Bayesian networks and decision trees. I have supervised studies involving deep learning, hidden Markov models, and adaptive AI systems for programming, communication, and geometry learning.'
WHERE id = '57031fa4-2991-49c3-ad13-fc79593bbf46';

-- ─── 3. Anthony Aquino → Visionary Bytes + Crazy Dave + Optima ─────────────
-- Added: YOLO/Faster R-CNN (Visionary Bytes), fatigue detection/eye tracking
-- (Crazy Dave), retinal imaging/transfer learning (Optima). Thursday added.
UPDATE mentor SET
  technical_skills = '["Python", "C", "C++", "PyTorch", "TensorFlow", "OpenCV", "YOLO", "MediaPipe", "Dlib", "Keras"]'::jsonb,
  forte = '["Computer Vision and Real-Time Object Detection Systems", "Deep Learning for Medical Imaging and Retinal Diagnostics", "Convolutional Neural Networks and Transfer Learning", "Facial Feature Detection, Eye Tracking, and Fatigue Monitoring", "Audio and Speech Signal Classification", "Machine Learning for Health and Road Safety Applications"]'::jsonb,
  available_days = '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]'::jsonb,
  time_slot = '["Monday:15:00-16:00", "Tuesday:13:00-14:00", "Tuesday:16:00-17:00", "Wednesday:12:00-13:00", "Wednesday:17:00-18:00", "Thursday:11:00-12:00", "Thursday:16:00-17:00", "Friday:13:00-14:00", "Friday:14:00-15:00", "Saturday:13:00-14:00", "Saturday:16:00-17:00"]'::jsonb,
  communication_preference = 'FACE_TO_FACE',
  self_description = 'A professor specializing in applied artificial intelligence, computer vision, and deep learning for real-world problem solving. My research covers real-time object detection using YOLO, Faster R-CNN, and convolutional neural networks for road safety and intelligent transportation systems. I work on deep learning models for medical imaging — including automated detection of diabetic retinopathy stages in retinal fundus images using convolutional neural networks and transfer learning architectures such as ResNet and EfficientNet. I also develop real-time fatigue detection systems using traditional image processing and facial feature detection — analyzing eye tracking, blinking rate, head position, and yawning patterns via OpenCV and MediaPipe. Additional work includes audio and speech signal classification, healthcare AI applications, and mobile intelligent systems integrating predictive analytics and optimization.'
WHERE id = '4984d9ab-72c1-4354-b17b-14b950282b85';

-- ─── 4. Reginald Cheng → Quadrant + CS Trivago ─────────────────────────────
-- Existing MILP forte covers Quadrant. Added IoT/blockchain framing for CS Trivago.
-- Availability unchanged (Mon, Wed, Thu, Sat) — already covers both groups.
UPDATE mentor SET
  technical_skills = '["Python", "Linux", "C", "Java", "Flutter", "Dart", "Arduino", "Raspberry Pi", "MQTT", "Solidity"]'::jsonb,
  forte = '["Mixed-Integer Linear Programming (MILP) and Combinatorial Optimization for Health Applications", "IoT Systems Integration, Sensor Monitoring, and Smart Device Automation", "Blockchain Architecture, Smart Contracts, and Decentralized Application Systems", "Chatbot Systems and Rule-Based Expert Systems", "Fuzzy Logic and Adaptive Control Systems", "Assistive Technologies and Human-Computer Interaction"]'::jsonb,
  available_days = '["Monday", "Wednesday", "Thursday", "Saturday"]'::jsonb,
  time_slot = '["Monday:11:00-12:00", "Monday:13:00-14:00", "Monday:14:00-15:00", "Wednesday:8:00-9:00", "Wednesday:13:00-14:00", "Thursday:14:00-15:00", "Thursday:17:00-18:00", "Saturday:13:00-14:00", "Saturday:14:00-15:00", "Saturday:17:00-18:00"]'::jsonb,
  communication_preference = 'FACE_TO_FACE',
  self_description = 'A researcher and developer specializing in optimization algorithms, IoT integration, blockchain architectures, and intelligent automation systems. My work in mixed-integer linear programming (MILP) and constraint-based optimization supports health informatics applications — including meal planning systems for dietary management and personalized health recommendation under nutritional and resource constraints. I design and implement IoT-integrated monitoring platforms using Arduino, Raspberry Pi, MQTT protocols, and real-time sensor systems for smart energy management and home automation. My blockchain expertise covers Ethereum-based decentralized applications, Solidity smart contracts, and secure incentive mechanisms for energy transaction management. I also develop conversational AI, rule-based expert systems, fuzzy logic controllers, and assistive technology applications.'
WHERE id = '45d1baee-f46d-4d0e-8d70-8a69d4e22c63';

-- ─── 5. Abraham Magpantay → Kerb + AxiomX ──────────────────────────────────
-- OCR/receipt processing forte matches Kerb. Skin classification / recommendation
-- framing added for AxiomX. Availability unchanged (Mon-Sat).
UPDATE mentor SET
  technical_skills = '["Python", "Matlab", "OpenCV", "Tesseract OCR", "PyTorch", "TensorFlow", "scikit-learn", "Keras"]'::jsonb,
  forte = '["Optical Character Recognition (OCR) and Intelligent Document Processing", "Receipt Recognition and Financial Data Extraction Systems", "Skin Classification and Personalized Skincare Recommendation Systems", "Computer Vision and Image Processing Applications", "Remote Sensing and Geospatial Image Classification", "Machine Learning for Healthcare and Consumer Applications"]'::jsonb,
  available_days = '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]'::jsonb,
  time_slot = '["Monday:13:00-14:00", "Monday:14:00-15:00", "Tuesday:16:00-17:00", "Tuesday:17:00-18:00", "Wednesday:16:00-17:00", "Wednesday:17:00-18:00", "Thursday:10:00-11:00", "Friday:11:00-12:00", "Friday:14:00-15:00", "Saturday:8:00-9:00"]'::jsonb,
  communication_preference = 'FACE_TO_FACE',
  self_description = 'A researcher specializing in optical character recognition, intelligent document processing, computer vision, and machine learning for image-based analysis systems. My OCR and document processing work includes building receipt recognition and financial data extraction platforms that automate parsing of physical and digital receipts — extracting item names, prices, dates, and merchant data using Tesseract and OpenCV for adaptive expense classification. I also develop image-based skin classification and personalized recommendation systems — applying convolutional neural networks and machine learning to classify acne-prone skin types, generate skincare product recommendations, and analyze user profiles for personalized routine suggestions. Additional work spans remote sensing and geospatial image classification, medical image analysis, augmented and virtual reality systems, and computer vision applications for healthcare and environmental monitoring.'
WHERE id = 'ede69af5-4ecc-437c-b489-ad82c843be7d';

-- ─── 6. Jeneffer Sabonsolin → Fusion Logic + NovaSoft ───────────────────────
-- NLP expertise covers Fusion Logic (NLP for code clone detection, AST analysis).
-- AI-for-software-quality framing covers NovaSoft (intelligent mutation testing).
-- Monday added to availability to cover both groups' Monday slots.
UPDATE mentor SET
  technical_skills = '["Python", "Java", "Linux", "scikit-learn", "TensorFlow", "Natural Language Processing", "Text Mining", "Sentiment Analysis"]'::jsonb,
  forte = '["Natural Language Processing and Language Modeling", "Source Code Analysis and Code Clone Detection Using NLP", "Intelligent Mutation Testing and Automated Program Analysis", "Sentiment Analysis, POS Tagging, and Affective Computing", "AI-Driven Software Quality Assurance and Intelligent Testing Systems", "Fuzzy Logic-Based Monitoring and Intelligent Security Systems"]'::jsonb,
  available_days = '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]'::jsonb,
  time_slot = '["Monday:11:00-12:00", "Monday:15:00-16:00", "Tuesday:8:00-9:00", "Tuesday:9:00-10:00", "Tuesday:15:00-16:00", "Wednesday:11:00-12:00", "Wednesday:13:00-14:00", "Wednesday:14:00-15:00", "Thursday:13:00-14:00", "Thursday:16:00-17:00", "Thursday:17:00-18:00", "Friday:17:00-18:00", "Saturday:10:00-11:00", "Saturday:17:00-18:00"]'::jsonb,
  communication_preference = 'FACE_TO_FACE',
  self_description = 'A researcher and developer specializing in artificial intelligence, natural language processing, and intelligent software analysis. My NLP work extends into source code intelligence — applying language modeling, tokenization, and NLP techniques to code clone detection and structural code similarity analysis through hybrid token-based and AST-based parsing. I also develop intelligent software quality assurance systems that use AI-driven mutation testing approaches, including intelligent mutation operator prioritization and selection to improve fault detection efficiency and reduce computational overhead in software testing. Additional research areas include sentiment analysis, language modeling, POS tagging, neural language modeling, facial recognition, intrusion detection, AI-powered recommendation systems, and intelligent data governance platforms integrating machine learning with real-world deployment needs.'
WHERE id = '507767eb-103a-4d15-941a-5a0a7ca94bc5';
