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

}
