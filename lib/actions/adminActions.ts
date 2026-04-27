"use server"

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getAllUserData() {
    const [{ data: mentors }, { data: mentee }] = await Promise.all([supabase
        .from("mentor")
        .select(
            `*,
        matches(
            status, 
            matched_at,
            compatibility_score,
            matched_keywords,
            mentee:matches_mentee_group_id_fkey (
                id,
                group_name,
                group_members,
                research_title,
                research_description,
                mentor_preference,
                time_slot,
                available_days
            )
        )
            
    `), supabase
        .from("MENTEE_GROUPS")
        .select(`*, 
        matches(
            status,
            matched_at,
            compatibility_score,
            matched_keywords,
            mentor:matches_mentor_id_fkey (
                id, 
                first_name, 
                last_name, 
                technical_skills, 
                forte, 
                email, 
                self_description
                
            )
        )
    `)

    ])

    return { success: true, data: { mentee, mentors } }
}
