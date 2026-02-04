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
  staffId?: string;
  email: string;
  previousTheses?: string[];
  publishedPapers?: string[];
  certifications?: string[];
  technicalExpertise?: string[];
  selfDescription?: string;
  researchTopics?: string[];
  availability?: {
    days: string[];
    timeSlots: string[];
    weeklyHours: number;
  };
  capacity?: number;
  assignedMentees?: number;
  expertise?: string;
  skills?: string[];
  description?: string;
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
      days: ["Monday", "Wednesday", "Friday"],
      timeSlots: ["9:00-11:00", "14:00-16:00"],
      weeklyHours: 10,
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
      timeSlots: ["10:00-12:00", "15:00-17:00"],
      weeklyHours: 8,
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
      days: ["Monday", "Tuesday", "Wednesday", "Thursday"],
      timeSlots: ["9:00-11:00", "13:00-15:00"],
      weeklyHours: 12,
    },
    capacity: 5,
    assignedMentees: 1,
  },
];

// Mentees
export const mockMentees: Mentee[] = [
  {
    id: "ME001",
    groupMembers: ["John Smith", "Jane Doe", "Bob Johnson"],
    researchTitle: "Mentor-Mentee Matching Using Gale-Shapley Algorithm",
    email: "johnsmith@student.feutech.edu.ph",
    preferences:
      "Looking for a mentor with expertise in algorithms, matching theory, and NLP",
  },
  {
    id: "ME002",
    groupMembers: ["Alice Brown", "Charlie Wilson"],
    researchTitle: "E-Commerce Platform with AI Recommendations",
    email: "alicebrown@student.feutech.edu.ph",
    preferences:
      "Need guidance in web development, machine learning, and system design",
  },
  {
    id: "ME003",
    groupMembers: ["David Lee", "Emma Garcia"],
    researchTitle: "Predictive Analytics for Student Performance",
    email: "davidlee@student.feutech.edu.ph",
    preferences:
      "Seeking mentor experienced in data science, statistics, and educational technology",
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
