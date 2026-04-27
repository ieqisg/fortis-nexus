

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
