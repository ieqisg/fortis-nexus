export type GroupMembers = {
    name: string;
    student_number: string | "";
  }
export interface MenteeFormProfile  {
    email: string;
    password: string;
    group_name: string;
    group_members: GroupMembers[];
    role: string;
    thesis_title: string;
    research_description: string;
    mentor_preferences: string;
    thesis_file: File | null;
    available_days: string[];
    time_slot: string[];
    
}