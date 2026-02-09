// Mock data for the Mentor-Mentee Management System

export interface StudentMember {
  name: string;
  studentNumber: string;
}

export interface MenteeGroup {
  id: string;
  groupName: string;
  members: StudentMember[];
  representativeEmail: string;
  thesisTitle: string;
  thesisDocument: string;
  researchDescription: string;
  preferredExpertise: string[];
  availability: {
    days: string[];
    timeSlots: string[];
    weeklyHours: number;
  };
  status: "matched" | "unmatched" | "pending";
  assignedMentor?: string;
}

export interface Mentor {
  id: string;
  name: string;
  staffId: string;
  email: string;

  previousTheses: string[];
  publishedPapers: string[];
  certifications: string[];
  technicalExpertise: string[];
  selfDescription: string;
  researchTopics: string[];
  availability: {
    days: string[];
    timeSlots: string[];
    weeklyHours: number;
  };

  capacity: number; // ✅ REQUIRED
  assignedMentees: number; // ✅ REQUIRED
}

export interface Mentee {
  id: string;
  groupMembers: string[];
  researchTitle: string;
  email: string;
  preferences: string;
}

export interface Match {
  menteeId: string;
  mentorId: string;
  score: number;
  keywords: string[];
}

export interface Paper {
  id: string;
  menteeId: string;
  title: string;
  fileName: string;
  submittedAt: string;
  comments: Comment[];
}

export interface Comment {
  id: string;
  mentorName: string;
  text: string;
  createdAt: string;
}

export interface AlgorithmLog {
  phase: number;
  phaseName: string;
  timestamp: string;
  entries: {
    action: string;
    details: string;
    status: "success" | "pending" | "failed";
  }[];
}

// ---------------- MOCK DATA ----------------

export const mockMentors: Mentor[] = [
  {
    id: "M001",
    name: "Dr. Sarah Chen",
    staffId: "CS-2019-001",
    email: "sarah.chen@university.edu",
    previousTheses: [
      "Machine Learning Applications in Healthcare",
      "Deep Learning for Image Recognition",
      "Neural Network Optimization Techniques",
    ],
    publishedPapers: [
      "Advances in Convolutional Neural Networks (IEEE 2022)",
      "Healthcare AI: A Comprehensive Review (Nature 2021)",
    ],
    certifications: [
      "AWS Machine Learning Specialty",
      "Google Cloud ML Engineer",
    ],
    technicalExpertise: [
      "Machine Learning",
      "Deep Learning",
      "Python",
      "TensorFlow",
    ],
    selfDescription:
      "Passionate about applying AI to solve real-world healthcare problems. 10+ years of research experience in neural networks and computer vision.",
    researchTopics: ["Healthcare AI", "Computer Vision", "Neural Networks"],
    availability: {
      days: ["Monday", "Wednesday"],
      timeSlots: ["09:00-10:00", "10:00-11:00", "14:00-15:00"],
      weeklyHours: 3,
    },
    capacity: 4,
    assignedMentees: 2,
  },
  {
    id: "M002",
    name: "Prof. James Rodriguez",
    staffId: "CS-2015-042",
    email: "james.rodriguez@university.edu",
    previousTheses: [
      "Blockchain Security Protocols",
      "Distributed Systems Architecture",
    ],
    publishedPapers: [
      "Secure Smart Contracts: Best Practices (ACM 2023)",
      "Scalable Blockchain Solutions (IEEE 2022)",
    ],
    certifications: ["Certified Blockchain Developer", "CISSP"],
    technicalExpertise: [
      "Blockchain",
      "Cryptography",
      "Distributed Systems",
      "Solidity",
    ],
    selfDescription:
      "Expert in blockchain technology and cybersecurity with focus on developing secure decentralized applications.",
    researchTopics: ["Blockchain", "Cybersecurity", "Distributed Computing"],
    availability: {
      days: ["Tuesday", "Thursday"],
      timeSlots: ["10:00-11:00", "11:00-12:00", "15:00-16:00"],
      weeklyHours: 3,
    },
    capacity: 3,
    assignedMentees: 3,
  },
  {
    id: "M003",
    name: "Dr. Emily Watson",
    staffId: "CS-2018-015",
    email: "emily.watson@university.edu",
    previousTheses: [
      "Natural Language Processing for Sentiment Analysis",
      "Chatbot Development using Transformers",
    ],
    publishedPapers: ["BERT Applications in Academic Research (NeurIPS 2023)"],
    certifications: ["NLP Specialist Certification"],
    technicalExpertise: ["NLP", "Transformers", "Python", "PyTorch", "BERT"],
    selfDescription:
      "Focused on advancing natural language understanding and generation. Experienced in building production-ready NLP systems.",
    researchTopics: [
      "Natural Language Processing",
      "Conversational AI",
      "Text Mining",
    ],
    availability: {
      days: ["Monday", "Thursday"],
      timeSlots: ["09:00-10:00", "13:00-14:00", "14:00-15:00"],
      weeklyHours: 3,
    },
    capacity: 5,
    assignedMentees: 1,
  },
];

// Mentees
export const mockMentees: MenteeGroup[] = [
  {
    id: "ME001",
    groupName: "Fortis Programmatores",
    groupMembers: ["John Smith", "Jane Doe", "Bob Johnson"],
    studentNumbers: ["202300001", "202300002", "202300003"],
    researchTitle: "Mentor-Mentee Matching Using Gale-Shapley Algorithm",
    researchDescription:
      "This study proposes an automated mentor–mentee matching system using a modified Gale–Shapley algorithm. The system analyzes mentor expertise and mentee research interests to produce stable, fair, and capacity-aware matches, improving the efficiency and quality of academic mentorship allocation.",
    email: "johnsmith@student.feutech.edu.ph",
    status: "matched",
    assignedMentor: "Dr. Sarah Chen",
    preferences:
      "Looking for a mentor with expertise in algorithms, matching theory, and NLP",
    availability: {
      days: ["Monday", "Wednesday"],
      timeSlots: ["10:00-11:00", "14:00-15:00"],
    },
  },
  {
    id: "ME002",
    groupName: "AI Innovators",
    groupMembers: ["Alice Brown", "Charlie Wilson"],
    studentNumbers: ["202300004", "202300005"],
    researchTitle: "E-Commerce Platform with AI Recommendations",
    researchDescription:
      "This research focuses on developing an e-commerce platform enhanced with artificial intelligence–driven recommendation systems. The study explores collaborative filtering and content-based approaches to improve product discovery, personalization, and overall user engagement.",
    email: "alicebrown@student.feutech.edu.ph",
    status: "pending",
    assignedMentor: "Prof. James Rodriguez",
    preferences:
      "Need guidance in web development, machine learning, and system design",
    availability: {
      days: ["Tuesday", "Thursday"],
      timeSlots: ["09:00-10:00", "15:00-16:00"],
    },
  },
  {
    id: "ME003",
    groupName: "Data Analystss",
    groupMembers: ["David Lee", "Emma Garcia"],
    studentNumbers: ["202300006", "202300007"],
    researchTitle: "Predictive Analytics for Student Performance",
    researchDescription:
      "This study applies predictive analytics and machine learning techniques to analyze academic data and forecast student performance. The goal is to identify at-risk students early and support data-driven interventions to improve educational outcomes.",
    email: "davidlee@student.feutech.edu.ph",
    assignedMentor: "Dr. Emily Watson",
    status: "unmatched",
    preferences:
      "Seeking mentor experienced in data science, statistics, and educational technology",
    availability: {
      days: ["Monday", "Friday"],
      timeSlots: ["13:00-14:00", "16:00-17:00"],
    },
  },
];

// Matches
export const mockMatches: Match[] = [
  {
    menteeId: "ME001",
    mentorId: "M001",
    score: 0.87,
    keywords: ["NLP", "Algorithm", "Machine Learning", "Research", "Python"],
  },
  {
    menteeId: "ME002",
    mentorId: "M002",
    score: 0.92,
    keywords: [
      "Web Development",
      "JavaScript",
      "React",
      "System Design",
      "Software Engineering",
    ],
  },
  {
    menteeId: "ME003",
    mentorId: "M003",
    score: 0.85,
    keywords: [
      "Data Science",
      "Statistics",
      "Python",
      "Analytics",
      "Predictive Modeling",
    ],
  },
];

// Papers
export const mockPapers: Paper[] = [
  {
    id: "P001",
    menteeId: "ME001",
    title: "Chapter 1: Introduction",
    fileName: "chapter1_introduction.pdf",
    submittedAt: "2026-01-20",
    comments: [
      {
        id: "C001",
        mentorName: "Dr. Maria Santos",
        text: "Good start! Please expand the background section with more recent studies from 2024-2025.",
        createdAt: "2026-01-22",
      },
    ],
  },
  {
    id: "P002",
    menteeId: "ME002",
    title: "System Architecture Document",
    fileName: "system_architecture.pdf",
    submittedAt: "2026-01-25",
    comments: [],
  },
];

// ---------------- UTILITY OPTIONS ----------------

export const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const timeSlotOptions = [
  "8:00-9:00",
  "9:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "12:00-13:00",
  "13:00-14:00",
  "14:00-15:00",
  "15:00-16:00",
];

export const mockAlgorithmLogs: AlgorithmLog[] = [
  {
    phase: 1,
    phaseName: "Mentee Proposals",
    timestamp: "2024-01-15 10:30:00",
    entries: [
      {
        action: "Group G001 proposed to Dr. Sarah Chen",
        details: "Expertise match: 95%",
        status: "success",
      },
      {
        action: "Group G002 proposed to Prof. James Rodriguez",
        details: "Expertise match: 92%",
        status: "success",
      },
      {
        action: "Group G003 proposed to Dr. Emily Watson",
        details: "Expertise match: 98%",
        status: "success",
      },
      {
        action: "Group G004 proposed to Prof. Michael Park",
        details: "Expertise match: 75%",
        status: "pending",
      },
      {
        action: "Group G005 proposed to Prof. Michael Park",
        details: "Expertise match: 88%",
        status: "pending",
      },
    ],
  },
  {
    phase: 2,
    phaseName: "Mentor Proposals",
    timestamp: "2024-01-15 10:35:00",
    entries: [
      {
        action: "Dr. Sarah Chen accepted G001",
        details: "Capacity: 2/4 slots filled",
        status: "success",
      },
      {
        action: "Prof. James Rodriguez accepted G002",
        details: "Capacity: 3/3 slots filled",
        status: "success",
      },
      {
        action: "Dr. Emily Watson accepted G003",
        details: "Capacity: 1/5 slots filled",
        status: "success",
      },
      {
        action: "Prof. Michael Park reviewing G004 and G005",
        details: "Capacity: 0/2 slots available",
        status: "pending",
      },
    ],
  },
  {
    phase: 3,
    phaseName: "Unmatched Assignment",
    timestamp: "2024-01-15 10:40:00",
    entries: [
      {
        action: "Attempting to assign G004",
        details: "Searching for available mentors...",
        status: "pending",
      },
      {
        action: "G004 remains unmatched",
        details: "No mentor with matching expertise and availability",
        status: "failed",
      },
      {
        action: "G005 assigned to Prof. Michael Park",
        details: "Best available match found",
        status: "pending",
      },
    ],
  },
];

export const mockMenteeGroups: MenteeGroup[] = [
  {
    id: "G001",
    groupName: "AI Healthcare Innovators",
    members: [
      { name: "Alice Johnson", studentNumber: "2021-CS-001" },
      { name: "Bob Smith", studentNumber: "2021-CS-002" },
      { name: "Carol Davis", studentNumber: "2021-CS-003" },
    ],
    representativeEmail: "alice.johnson@student.university.edu",
    thesisTitle: "AI-Powered Diagnostic Tool for Early Disease Detection",
    thesisDocument: "thesis_proposal_g001.pdf",
    researchDescription:
      "Developing a machine learning model to analyze medical imaging data for early detection of various diseases, focusing on accuracy and interpretability.",
    preferredExpertise: ["Machine Learning", "Healthcare AI", "Deep Learning"],
    availability: {
      days: ["Monday", "Wednesday", "Friday"],
      timeSlots: ["9:00-11:00", "14:00-16:00"],
      weeklyHours: 15,
    },
    status: "matched",
    assignedMentor: "Dr. Sarah Chen",
  },
  {
    id: "G002",
    groupName: "Blockchain Pioneers",
    members: [
      { name: "David Lee", studentNumber: "2021-CS-015" },
      { name: "Emma Wilson", studentNumber: "2021-CS-016" },
    ],
    representativeEmail: "david.lee@student.university.edu",
    thesisTitle: "Decentralized Voting System using Blockchain",
    thesisDocument: "thesis_proposal_g002.pdf",
    researchDescription:
      "Creating a secure, transparent, and tamper-proof electronic voting system leveraging blockchain technology and smart contracts.",
    preferredExpertise: ["Blockchain", "Cryptography", "Smart Contracts"],
    availability: {
      days: ["Tuesday", "Thursday"],
      timeSlots: ["10:00-12:00", "15:00-17:00"],
      weeklyHours: 12,
    },
    status: "matched",
    assignedMentor: "Prof. James Rodriguez",
  },
  {
    id: "G003",
    groupName: "NLP Explorers",
    members: [
      { name: "Frank Brown", studentNumber: "2021-CS-022" },
      { name: "Grace Kim", studentNumber: "2021-CS-023" },
      { name: "Henry Zhang", studentNumber: "2021-CS-024" },
      { name: "Ivy Chen", studentNumber: "2021-CS-025" },
    ],
    representativeEmail: "frank.brown@student.university.edu",
    thesisTitle: "Multilingual Chatbot for Academic Support",
    thesisDocument: "thesis_proposal_g003.pdf",
    researchDescription:
      "Building an intelligent chatbot capable of understanding and responding in multiple languages to assist students with academic queries.",
    preferredExpertise: ["NLP", "Chatbots", "Transformers"],
    availability: {
      days: ["Monday", "Tuesday", "Thursday"],
      timeSlots: ["9:00-11:00", "13:00-15:00"],
      weeklyHours: 18,
    },
    status: "matched",
    assignedMentor: "Dr. Emily Watson",
  },
  {
    id: "G004",
    groupName: "Data Visualizers",
    members: [
      { name: "Jack Miller", studentNumber: "2021-CS-030" },
      { name: "Kate Anderson", studentNumber: "2021-CS-031" },
    ],
    representativeEmail: "jack.miller@student.university.edu",
    thesisTitle: "Interactive Dashboard for University Analytics",
    thesisDocument: "thesis_proposal_g004.pdf",
    researchDescription:
      "Developing a comprehensive analytics dashboard to visualize university data including enrollment trends, course performance, and resource utilization.",
    preferredExpertise: ["Data Visualization", "Web Development", "Analytics"],
    availability: {
      days: ["Monday", "Wednesday", "Friday"],
      timeSlots: ["11:00-13:00", "14:00-16:00"],
      weeklyHours: 10,
    },
    status: "unmatched",
    assignedMentor: undefined,
  },
  {
    id: "G005",
    groupName: "Security Squad",
    members: [
      { name: "Leo Thompson", studentNumber: "2021-CS-040" },
      { name: "Mia Garcia", studentNumber: "2021-CS-041" },
      { name: "Noah Martinez", studentNumber: "2021-CS-042" },
    ],
    representativeEmail: "leo.thompson@student.university.edu",
    thesisTitle: "Automated Vulnerability Scanner for Web Applications",
    thesisDocument: "thesis_proposal_g005.pdf",
    researchDescription:
      "Creating an automated tool to scan web applications for common security vulnerabilities and generate detailed reports with remediation suggestions.",
    preferredExpertise: ["Web Security", "Penetration Testing", "Automation"],
    availability: {
      days: ["Tuesday", "Wednesday", "Thursday"],
      timeSlots: ["10:00-12:00", "14:00-16:00"],
      weeklyHours: 14,
    },
    status: "pending",
    assignedMentor: undefined,
  },
];

// ---------------- HELPER FUNCTIONS ----------------

export function getMentorById(id: string): Mentor | undefined {
  return mockMentors.find((m) => m.id === id);
}

export function getMenteeById(id: string): Mentee | undefined {
  return mockMentees.find((m) => m.id === id);
}

export function getMatchByMenteeId(menteeId: string): Match | undefined {
  return mockMatches.find((m) => m.menteeId === menteeId);
}

export function getMatchesByMentorId(mentorId: string): Match[] {
  return mockMatches.filter((m) => m.mentorId === mentorId);
}

export function getPapersByMenteeId(menteeId: string): Paper[] {
  return mockPapers.filter((p) => p.menteeId === menteeId);
}
