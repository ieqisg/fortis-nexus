import type { MentorData } from "./profile_types";

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
}

export type MentorProfileUpdate = Omit<MentorFormProfile, 'profile_completed'>

export type MentorContextType = {
    mentor: MentorData | null
    loading: boolean
    refetch: () => Promise<void>
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
};
