import type { Database } from "@/backend/models/menteeModel";


export type MenteeGroup = Database["public"]["Tables"]["MENTEE_GROUPS"]["Row"];

export type MenteeGroupInsert =
    Database["public"]["Tables"]["MENTEE_GROUPS"]["Insert"];

export type MenteeGroupUpdate =
    Database["public"]["Tables"]["MENTEE_GROUPS"]["Update"];
