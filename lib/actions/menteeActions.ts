// lib/actions/menteeActions.ts
"use server"

import { createClient } from "@supabase/supabase-js"
import { MenteeGroupInsert } from "@/types/modelTypes"
import { MenteeGroupUpdate } from "@/types/modelTypes"
import { getSupabaseClient } from "@/app/config/getSupabaseClient"
import Page from "@/app/admin/page"

export async function createMenteeProfile(payload: MenteeGroupInsert) {
    const supabase = await getSupabaseClient()

    const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
        .from("MENTEE_GROUPS")
        .insert(payload)

    if (error) {
        await adminSupabase.auth.admin.deleteUser(payload.id)
        return { success: false, message: "Failed to create profile, signup has been rolled back." }
    }

    return { success: true }
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

    const { data: mentee, error } = await supabase
        .from("MENTEE_GROUPS")
        .select(`
        *,
        matches (
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
                self_description,
                prev_mentored_thesis
            )
        )
    `)
        .eq("id", user.id)
        .single()
    if (error) return { success: false, message: error.message, data: null }

    return { success: true, data: mentee }

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


