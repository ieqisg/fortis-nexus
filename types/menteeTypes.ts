import type { MenteeData } from "./profile_types"
// menteeTypes.ts
export type Matches = {
    matched_at: string | null
    status: string | null
    compatibility_score: number | null
    matched_keywords: string[] | null
    mentor: {
        id: string
        first_name: string
        last_name: string
        technical_skills: string[]
        forte: string[]
        email: string
        self_description: string
        experience: number
        available_days: string[]
        time_slot: string[]
        prev_mentored_thesis: import("./mentorTypes").PrevMentoredThesis[]
    } | null
    mentee: {
        email: string
        id: string
        group_name: string
        group_members: string[]
        research_title: string
        research_description: string
        mentor_preference: string
        time_slot: string[]
        available_days: string[]
    } | null
}

export type GroupMembers = {
    name: string;
    student_number: string | "";
}
export type CommunicationPreference = "FACE_TO_FACE" | "ONLINE_CHAT" | "ONLINE_CALL";

export interface MenteeFormProfile {
    email: string
    group_name: string;
    group_members: GroupMembers[];
    role: "mentee";
    thesis_title: string;
    research_description: string;
    mentor_preferences: string;
    available_days: string[];
    time_slot: string[];
    communication_preference: CommunicationPreference | "";
}


export type MenteeMeeting = {
    id: string
    title: string
    description: string
    recurrence_day: string
    recurrence_time: string
    is_recurring: boolean
    notes?: string
    mentor: {
        id: string
        first_name: string
        last_name: string
        email: string
    } | null
} | null

export type MenteeContextType = {
    mentee: MenteeData | null
    loading: boolean
    refetch: () => Promise<void>
    meeting: MenteeMeeting
    meetingLoading: boolean
    papers: import("./mentorTypes").Paper[]
    papersLoading: boolean
    setPapers: React.Dispatch<React.SetStateAction<import("./mentorTypes").Paper[]>>
}

export type MenteeEditForm = {
    group_name: string
    research_title: string,
    research_description: string,
    mentor_preference: string,
    available_days: string[],
    time_slot: string[],
    communication_preference: CommunicationPreference | "",
};
