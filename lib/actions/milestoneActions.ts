"use server"

import { createClient } from "@supabase/supabase-js"
import { getSupabaseClient } from "@/app/config/getSupabaseClient"
import type { Milestone } from "@/types/mentorTypes"

const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getMilestones(menteeGroupId: string) {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, data: [] as Milestone[] }

    const { data, error } = await adminSupabase
        .from("milestones")
        .select("*")
        .eq("mentor_id", user.id)
        .eq("mentee_group_id", menteeGroupId)
        .order("created_at", { ascending: true })

    if (error) return { success: false, data: [] as Milestone[] }
    return { success: true, data: data as Milestone[] }
}

export async function getMilestonesForCurrentMentee() {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, data: [] as Milestone[] }

    const { data, error } = await adminSupabase
        .from("milestones")
        .select("*")
        .eq("mentee_group_id", user.id)
        .order("created_at", { ascending: true })

    if (error) return { success: false, data: [] as Milestone[] }
    return { success: true, data: data as Milestone[] }
}

export async function createMilestone(payload: {
    menteeGroupId: string
    title: string
    description?: string
    dueDate?: string
}) {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: "Not authenticated" }

    const { data, error } = await adminSupabase
        .from("milestones")
        .insert({
            mentor_id: user.id,
            mentee_group_id: payload.menteeGroupId,
            title: payload.title.trim(),
            description: payload.description?.trim() || null,
            due_date: payload.dueDate || null,
        })
        .select()
        .single()

    if (error) return { success: false, message: error.message }
    return { success: true, milestone: data as Milestone }
}

export async function toggleMilestone(milestoneId: string, completed: boolean) {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: "Not authenticated" }

    const { error } = await adminSupabase
        .from("milestones")
        .update({
            completed,
            completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", milestoneId)
        .eq("mentor_id", user.id)

    if (error) return { success: false, message: error.message }
    return { success: true }
}

export async function deleteMilestone(milestoneId: string) {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: "Not authenticated" }

    const { error } = await adminSupabase
        .from("milestones")
        .delete()
        .eq("id", milestoneId)
        .eq("mentor_id", user.id)

    if (error) return { success: false, message: error.message }
    return { success: true }
}
