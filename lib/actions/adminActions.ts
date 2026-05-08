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

export async function overrideMentorCapacity(mentorId: string, newCapacity: number) {
    const { error } = await supabase
        .from("mentor")
        .update({ mentor_capacity: newCapacity })
        .eq("id", mentorId)

    if (error) return { success: false, message: error.message }
    return { success: true }
}

export async function getMenteeCount() {
    const { count, error } = await supabase
        .from("MENTEE_GROUPS")
        .select("id", { count: "exact", head: true })

    if (error) return { success: false, count: 0 }
    return { success: true, count: count ?? 0 }
}

export async function adminEditMentor(mentorId: string, payload: {
    first_name?: string
    last_name?: string
    email?: string
    mentor_capacity?: number
}) {
    const clean = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== "" && v !== undefined)
    )
    const { error } = await supabase.from("mentor").update(clean).eq("id", mentorId)
    if (error) return { success: false, message: error.message }
    return { success: true }
}

export async function adminEditMentee(menteeId: string, payload: {
    group_name?: string
    research_title?: string
    email?: string
}) {
    const clean = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== "" && v !== undefined)
    )
    const { error } = await supabase.from("MENTEE_GROUPS").update(clean).eq("id", menteeId)
    if (error) return { success: false, message: error.message }
    return { success: true }
}

export async function adminDeleteUser(userId: string, userType: "mentor" | "mentee") {
    const table = userType === "mentor" ? "mentor" : "MENTEE_GROUPS"
    const { error } = await supabase.from(table).delete().eq("id", userId)
    if (error) return { success: false, message: error.message }
    return { success: true }
}

export async function rollbackMatches() {
    const { error } = await supabase.from("matches").delete().not("id", "is", null)
    if (error) return { success: false, message: error.message }
    return { success: true }
}

export async function getMentorCapacityStats() {
    const { data, error } = await supabase
        .from("mentor")
        .select("mentor_capacity")

    if (error) return { success: false, totalMentors: 0, mentorsWithCapacity: 0, totalCapacitySet: 0 }

    const totalMentors = data.length
    const withCapacity = data.filter(m => m.mentor_capacity !== null && m.mentor_capacity > 0)
    const totalCapacitySet = withCapacity.reduce((sum, m) => sum + (m.mentor_capacity ?? 0), 0)

    return {
        success: true,
        totalMentors,
        mentorsWithCapacity: withCapacity.length,
        totalCapacitySet,
    }
}
