"use server"

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getAllUserData() {
    const [{ data: mentors }, { data: mentee }] = await Promise.all([
        supabase
            .from("mentor")
            .select(`
                id, first_name, last_name, email, mentor_capacity,
                matches(
                    status, compatibility_score, matched_keywords,
                    mentee:matches_mentee_group_id_fkey(id, group_name, research_title)
                )
            `),
        supabase
            .from("MENTEE_GROUPS")
            .select(`
                id, group_name, email, research_title, group_members,
                matches(
                    status, compatibility_score,
                    mentor:matches_mentor_id_fkey(first_name, last_name)
                )
            `),
    ])

    return { success: true, data: { mentee, mentors } }
}

export async function getMentorDetail(id: string) {
    const { data, error } = await supabase
        .from("mentor")
        .select("technical_skills, forte, self_description")
        .eq("id", id)
        .maybeSingle()
    if (error) return { success: false as const, message: error.message }
    return { success: true as const, data }
}

export async function getMenteeDetail(id: string) {
    const { data, error } = await supabase
        .from("MENTEE_GROUPS")
        .select("research_description, mentor_preference, time_slot, available_days")
        .eq("id", id)
        .maybeSingle()
    if (error) return { success: false as const, message: error.message }
    return { success: true as const, data }
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

export async function adminCreateMentor(payload: {
    email: string
    password: string
    first_name: string
    last_name: string
}) {
    const { data, error: authError } = await supabase.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
    })
    if (authError || !data.user) return { success: false, message: authError?.message ?? "Failed to create auth user" }

    const { error } = await supabase.from("mentor").insert({
        id: data.user.id,
        email: payload.email,
        first_name: payload.first_name,
        last_name: payload.last_name,
        role: "mentor",
        profile_completed: false,
    })
    if (error) {
        await supabase.auth.admin.deleteUser(data.user.id)
        return { success: false, message: error.message }
    }
    return { success: true }
}

export async function adminCreateMentee(payload: {
    email: string
    password: string
    group_name: string
    research_title: string
    research_description: string
    mentor_preference: string
    group_members: string[]
}) {
    const { data, error: authError } = await supabase.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
    })
    if (authError || !data.user) return { success: false, message: authError?.message ?? "Failed to create auth user" }

    const { error } = await supabase.from("MENTEE_GROUPS").insert({
        id: data.user.id,
        email: payload.email,
        group_name: payload.group_name,
        research_title: payload.research_title,
        research_description: payload.research_description,
        mentor_preference: payload.mentor_preference,
        role: "mentee",
        available_days: [],
        time_slot: [],
        group_members: payload.group_members,
    })
    if (error) {
        await supabase.auth.admin.deleteUser(data.user.id)
        return { success: false, message: error.message }
    }
    return { success: true }
}

export async function cleanupOrphanedMentees() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (error || !users) return { success: false, deleted: 0 }

    const [{ data: menteeIds }, { data: mentorIds }, { data: adminIds }] = await Promise.all([
        supabase.from("MENTEE_GROUPS").select("id"),
        supabase.from("mentor").select("id"),
        supabase.from("admin").select("id"),
    ])

    const knownIds = new Set([
        ...(menteeIds ?? []).map(r => r.id),
        ...(mentorIds ?? []).map(r => r.id),
        ...(adminIds ?? []).map(r => r.id),
    ])

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const orphans = users.filter(u =>
        !knownIds.has(u.id) && new Date(u.created_at) < cutoff
    )

    await Promise.all(orphans.map(u => supabase.auth.admin.deleteUser(u.id)))

    return { success: true, deleted: orphans.length }
}

export async function getLatestAlgorithmLog() {
    const { data, error } = await supabase
        .from("algorithm_logs")
        .select("log_data, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

    if (error || !data) return { success: false, log: null }
    return { success: true, log: data.log_data }
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
