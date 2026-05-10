import type { MentorData } from "./profile_types";

export type PrevMentoredThesis = {
    title_no: string
    title: string
    mentor: string
    year: string
}

export type CommunicationPreference = "FACE_TO_FACE" | "ONLINE_CHAT" | "ONLINE_CALL";

export interface MentorFormProfile {
    first_name: string;
    last_name: string;
    technical_skills: string[];
    self_description: string;
    forte: string[];
    mentor_capacity: number;
    available_days: string[];
    time_slot: string[];
    role: "mentor";
    profile_completed: boolean;
    email: string | null;
    experience: number;
    communication_preference: CommunicationPreference | "";
    prev_mentored_thesis?: PrevMentoredThesis[];
}

export type MentorProfileUpdate = Omit<MentorFormProfile, 'profile_completed'>

export type MeetingRecord = {
    id: string
    mentor_id: string
    mentee_group_id: string
    title: string
    description: string
    date: string
    time: string
    status: "scheduled" | "completed" | "cancelled"
    is_recurring: boolean
    recurrence_day?: string
    recurrence_time?: string
    mentee_group?: {
        id: string
        group_name: string
        available_days?: string[]
        time_slot?: string[]
    }
}

export type PaperComment = {
    id: string
    paper_id: string
    mentor_id: string
    comment: string
    created_at: string
}

export type Paper = {
    id: string
    mentee_group_id: string
    mentor_id: string
    title: string
    file_name: string | null
    file_path: string | null
    status: "pending" | "reviewed"
    submitted_at: string
    paper_comments?: PaperComment[]
    mentee_group?: { group_name: string }
}

export type MentorContextType = {
    mentor: MentorData | null
    loading: boolean
    refetch: () => Promise<void>
    meetings: MeetingRecord[]
    meetingsLoading: boolean
    setMeetings: React.Dispatch<React.SetStateAction<MeetingRecord[]>>
    papers: Paper[]
    papersLoading: boolean
    setPapers: React.Dispatch<React.SetStateAction<Paper[]>>
}

export type MentorEditForm = {
    available_days: string[];
    email: string;
    experience: number;
    first_name: string;
    forte: string[];
    last_name: string;
    mentor_capacity: number;
    self_description: string;
    technical_skills: string[];
    time_slot: string[];
    prev_mentored_thesis: PrevMentoredThesis[];
};
