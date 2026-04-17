import { MentorFormProfile } from "./mentorTypes";

// menteeTypes.ts
export type Matches = {
    matched_at: string | null
    status: string | null
    compatiblity_score: number | null
    matched_keywords: string[] | null
    mentor: {
        id: string
        first_name: string
        last_name: string
        technical_skills: string[]
        forte: string[]
        email: string
        self_description: string
    } | null
}

export type GroupMembers = {
    name: string;
    student_number: string | "";
}
export interface MenteeFormProfile {

    group_name: string;
    group_members: GroupMembers[];
    role: "mentee";
    thesis_title: string;
    research_description: string;
    mentor_preferences: string;
    available_days: string[];
    time_slot: string[];
    matches: Matches | null

}
