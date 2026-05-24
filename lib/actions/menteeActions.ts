// lib/actions/menteeActions.ts
"use server"

import { createClient } from "@supabase/supabase-js"
import { MenteeGroupInsert } from "@/types/modelTypes"
import { MenteeGroupUpdate } from "@/types/modelTypes"
import { getSupabaseClient } from "@/app/config/getSupabaseClient"

const ONLINE_DAYS = new Set(["Tuesday", "Friday"]);
function inferCommunicationPreference(days: string[]): "FACE_TO_FACE" | "ONLINE_MEETING" | null {
    if (!days || days.length === 0) return null;
    return days.some((d) => ONLINE_DAYS.has(d)) ? "ONLINE_MEETING" : "FACE_TO_FACE";
}

export async function createMenteeProfile(payload: MenteeGroupInsert) {
    const supabase = await getSupabaseClient()

    const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
        .from("MENTEE_GROUPS")
        .insert({ ...payload, communication_preference: inferCommunicationPreference(payload.available_days ?? []) })

    if (error) {
        await adminSupabase.auth.admin.deleteUser(payload.id)
        return { success: false, message: "Failed to create profile, signup has been rolled back." }
    }

    return { success: true }
}

export async function registerMentee(
    email: string,
    password: string,
    payload: Omit<MenteeGroupInsert, "id">
) {
    const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let userId: string

    const { data: createData, error: createError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    })

    if (createError) {
        if (!createError.message.toLowerCase().includes("already registered")) {
            return { success: false as const, message: createError.message }
        }

        // Orphan check: auth user exists but may have no MENTEE_GROUPS row
        const { data: existing } = await adminSupabase.auth.admin.listUsers()
        const orphan = existing?.users.find(u => u.email === email)
        if (!orphan) return { success: false as const, message: "Email already registered." }

        const { data: existingGroup } = await adminSupabase
            .from("MENTEE_GROUPS")
            .select("id")
            .eq("email", email)
            .maybeSingle()

        if (existingGroup) return { success: false as const, message: "Email already registered." }

        // Genuine orphan — delete and recreate
        await adminSupabase.auth.admin.deleteUser(orphan.id)

        const { data: retryData, error: retryError } = await adminSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        })
        if (retryError || !retryData.user) {
            return { success: false as const, message: retryError?.message ?? "Failed to create account." }
        }
        userId = retryData.user.id
    } else {
        if (!createData.user) return { success: false as const, message: "Failed to create account." }
        userId = createData.user.id
    }

    const { error: insertError } = await adminSupabase
        .from("MENTEE_GROUPS")
        .insert({ ...payload, id: userId, communication_preference: inferCommunicationPreference(payload.available_days ?? []) })

    if (insertError) {
        await adminSupabase.auth.admin.deleteUser(userId)
        return { success: false as const, message: "Failed to save profile. Please try again." }
    }

    return { success: true as const }
}

export async function editMenteeProfile(payload: MenteeGroupUpdate) {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Not authenticated", data: null }

    const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([_, value]) => {
            if (value === null || value === undefined || value === "") return false;
            if (Array.isArray(value) && value.length === 0) return false;
            return true;
        })
    );

    if (cleanPayload.available_days) {
        cleanPayload.communication_preference = inferCommunicationPreference(cleanPayload.available_days as string[]);
    }

    const { error } = await supabase
        .from("MENTEE_GROUPS")
        .update(cleanPayload)
        .eq("id", user.id)
        .select()
    if (error) {
        return { success: false, message: error.message };
    }

    return { success: true }
}

export async function getMenteeData() {
    const supabase = await getSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: "Not authenticated", data: null };

    const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch mentee profile
    const { data: mentee, error: menteeError } = await adminSupabase
        .from("MENTEE_GROUPS")
        .select("*")
        .eq("id", user.id)
        .single()
    if (menteeError || !mentee) return { success: false, message: menteeError?.message ?? "Not found", data: null }

    // Fetch matches with mentor data in a direct query to avoid nested-join issues.
    // Admin client bypasses RLS so the mentor rows are always returned.
    const { data: matchRows } = await adminSupabase
        .from("matches")
        .select(`
            status,
            matched_at,
            compatibility_score,
            matched_keywords,
            mentor:mentor_id (
                id,
                first_name,
                last_name,
                technical_skills,
                forte,
                email,
                self_description,
                experience,
                available_days,
                time_slot,
                communication_preference,
                prev_mentored_thesis
            )
        `)
        .eq("mentee_group_id", user.id)

    return { success: true, data: { ...mentee, matches: matchRows ?? [] } }

}

export async function getMenteePreferences() {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, data: null }
    const { data, error } = await supabase
        .from("mentee_preferences")
        .select("ranked_mentors, created_at")
        .eq("mentee_group_id", user.id)
        .single()
    if (error) return { success: false, data: null }
    return { success: true, data: data.ranked_mentors as RankedMentor[] }
}

export type RankedMentor = {
    rank: number
    mentor_id: string
    name: string
    score: number
    matched_keywords: string[]
}

export async function changeDefaultPassword(newPassword: string) {
    const supabase = await getSupabaseClient()

    const { error } = await supabase.auth.updateUser({
        password: newPassword
    })
    if (error) {
        return { success: false, error: error.message }
    }
    return { success: true }
}

export async function verifyCurrentPassword(currentPassword: string) {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return { success: false, message: "Not authenticated" }

    const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
    })

    if (error) return { success: false, message: "Current password is incorrect." }
    return { success: true }
}


