// lib/actions/menteeActions.ts
"use server"
import { getSupabaseClient } from "@/app/config/getSupabaseClient"
import { createClient } from "@supabase/supabase-js"
import { MentorInsert } from "@/types/modelTypes"

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
                    group_name,
                    group_members,
                    research_title,
                    research_description,
                    mentor_preference,
                    time_slot,
                    available_days
                )
            )
        `)
        .eq("id", user.id)
        .single()
    if (error) return { success: false, message: error.message, data: null }
    return { success: true, data: mentor }
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
