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
  capacity: number;
  assignedMentees: number;
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
    publishedPapers: [
      "BERT Applications in Academic Research (NeurIPS 2023)",
      "Multilingual NLP Systems (ACL 2022)",
    ],
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
  {
    id: "M004",
    name: "Prof. Michael Park",
    staffId: "CS-2012-008",
    email: "michael.park@university.edu",
    previousTheses: ["Web Application Security Testing", "API Design Patterns"],
    publishedPapers: ["Modern Web Security Frameworks (IEEE S&P 2021)"],
    certifications: ["OWASP Certified", "CEH"],
    technicalExpertise: [
      "Web Development",
      "Security",
      "React",
      "Node.js",
      "REST APIs",
    ],
    selfDescription:
      "Full-stack developer turned security researcher. Passionate about building secure and scalable web applications.",
    researchTopics: ["Web Security", "Software Engineering", "API Design"],
    availability: {
      days: ["Wednesday", "Friday"],
      timeSlots: ["11:00-13:00", "14:00-16:00"],
      weeklyHours: 6,
    },
    capacity: 2,
    assignedMentees: 0,
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

export const expertiseOptions = [
  "Machine Learning",
  "Deep Learning",
  "Natural Language Processing",
  "Computer Vision",
  "Blockchain",
  "Cryptography",
  "Web Development",
  "Mobile Development",
  "Data Science",
  "Cloud Computing",
  "Cybersecurity",
  "IoT",
  "Robotics",
  "Game Development",
  "Database Systems",
  "Distributed Systems",
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

export const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
