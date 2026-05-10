// lib/actions/menteeActions.ts
"use server"
import { getSupabaseClient } from "@/app/config/getSupabaseClient"
import { createClient } from "@supabase/supabase-js"
import { MentorInsert, MentorUpdate } from "@/types/modelTypes"

export async function createMentorProfile(payload: Omit<MentorInsert, 'id' | 'profile_completed'>) {
    const supabase = await getSupabaseClient()


    const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: "Not authenticated" }

    const { error } = await supabase
        .from("mentor")
        .update({
            ...payload,
            profile_completed: true,
        })
        .eq("id", user.id)

    if (error) {

        return { success: false, message: "Failed to create profile, signup has been rolled back." }
    }

    return { success: true }
}

export async function editMentorProfile(payload: MentorUpdate) {
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

    const { error } = await supabase
        .from("mentor")
        .update(cleanPayload)
        .eq("id", user.id)
        .select()
    if (error) {
        console.error("Supabase update error:", error.message);
        return { success: false, message: error.message };
    }

    return { success: true }
}

export async function getMentorData() {
    const supabase = await getSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: "Not authenticated", data: null }

    const { data: mentor, error } = await supabase
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
                    email,
                    group_name,
                    group_members,
                    research_title,
                    research_description,
                    mentor_preference,
                    available_days,
                    time_slot,
                    communication_preference
                )
            )
        `)
        .eq("id", user.id)
        .single()
    if (error) return { success: false, message: error.message, data: null }
    return { success: true, data: mentor }
}

export async function getMentorPreferences(mentorId: string) {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
        .from("mentor_preferences")
        .select("ranked_mentees, created_at")
        .eq("mentor_id", mentorId)
        .single()
    if (error) return { success: false, data: null }
    return { success: true, data: data.ranked_mentees as RankedMentee[] }
}

export type RankedMentee = {
    rank: number
    mentee_group_id: string
    group_name: string
    research_title: string
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
