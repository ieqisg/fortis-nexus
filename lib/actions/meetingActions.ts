// lib/actions/meetingActions.ts
"use server"
import { getSupabaseClient } from "@/app/config/getSupabaseClient"

export async function getMeetings() {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, data: null }

    const { data, error } = await supabase
        .from("meetings")
        .select(`
            *,
            mentee_group:mentee_group_id (
                id,
                group_name
            )
        `)
        .eq("mentor_id", user.id)
        .order("date", { ascending: true })

    if (error) return { success: false, data: null }
    return { success: true, data }
}

export async function createMeeting(payload: {
    mentee_group_id: string
    title: string
    description: string
    date: string
    time: string
}) {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false }

    const { error } = await supabase
        .from("meetings")
        .insert({ ...payload, mentor_id: user.id })

    if (error) return { success: false, message: error.message }
    return { success: true }
}

export async function updateMeetingStatus(meetingId: string, status: "scheduled" | "completed" | "cancelled") {
    const supabase = await getSupabaseClient()
    const { error } = await supabase
        .from("meetings")
        .update({ status })
        .eq("id", meetingId)

    if (error) return { success: false }
    return { success: true }
}
