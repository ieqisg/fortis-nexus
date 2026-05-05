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

}

export interface MenteeEditProfile {

}

export type MenteeContextType = {
    mentee: MenteeData | null
    loading: boolean
    refetch: () => Promise<void>
}
