// lib/actions/mentorActions.ts
"use server"
import { getSupabaseClient } from "@/app/config/getSupabaseClient"
import { cookies } from "next/headers"
import { MentorInsert, MentorUpdate } from "@/types/modelTypes"

const ONLINE_DAYS  = new Set(["Tuesday", "Friday"]);
const F2F_DAYS     = new Set(["Monday", "Wednesday", "Thursday", "Saturday"]);
function inferCommunicationPreference(days: string[]): "FACE_TO_FACE" | "ONLINE_MEETING" | "FLEXIBLE" | null {
    if (!days || days.length === 0) return null;
    const hasOnline = days.some((d) => ONLINE_DAYS.has(d));
    const hasF2F    = days.some((d) => F2F_DAYS.has(d));
    if (hasOnline && hasF2F) return "FLEXIBLE";
    if (hasOnline) return "ONLINE_MEETING";
    return "FACE_TO_FACE";
}

export async function createMentorProfile(payload: Omit<MentorInsert, 'id' | 'profile_completed'>) {
    const supabase = await getSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: "Not authenticated" }
    if (!payload.dpa_consent_accepted) {
        return { success: false, message: "DPA consent is required to complete your mentor profile." }
    }

    const { error } = await supabase
        .from("mentor")
        .update({
            ...payload,
            communication_preference: inferCommunicationPreference(payload.available_days ?? []),
            dpa_consent_accepted: true,
            dpa_consent_at: new Date().toISOString(),
            profile_completed: true,
        })
        .eq("id", user.id)

    if (error) {
        return { success: false, message: "Failed to create profile, signup has been rolled back." }
    }

    // Invalidate the middleware role cache so the next request re-reads profile_completed=true
    ;(await cookies()).delete("x-role-cache")

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

    if (cleanPayload.available_days) {
        cleanPayload.communication_preference = inferCommunicationPreference(cleanPayload.available_days as string[]);
    }

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
