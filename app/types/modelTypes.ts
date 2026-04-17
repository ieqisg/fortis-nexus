import { Matches } from "./menteeTypes";
import type { Database } from "@/backend/models/Model";

//Mentee
export type MenteeGroup = Database["public"]["Tables"]["MENTEE_GROUPS"]["Row"];

export type MenteeGroupInsert =
    Database["public"]["Tables"]["MENTEE_GROUPS"]["Insert"];

export type MenteeGroupUpdate =
    Database["public"]["Tables"]["MENTEE_GROUPS"]["Update"];

export type MenteeGroupWithMatch = MenteeGroup & {
    matches: Matches | null
}

//Mentor
export type Mentor = Database["public"]["Tables"]["mentor"]["Row"]

export type MentorInsert = Database["public"]["Tables"]["mentor"]["Insert"]

export type MentorUpdate = Database["public"]["Tables"]["mentor"]["Update"]
