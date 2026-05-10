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
                group_name,
                available_days,
                time_slot
            )
        `)
        .eq("mentor_id", user.id)
        .order("created_at", { ascending: true })

    if (error) return { success: false, data: null }
    return { success: true, data }
}

export async function setRecurringMeeting(payload: {
    mentee_group_id: string
    title: string
    description: string
    recurrence_day: string
    recurrence_time: string
}) {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: "Not authenticated" }

    // check if recurring meeting already exists for this mentee
    const { data: existing } = await supabase
        .from("meetings")
        .select("id")
        .eq("mentor_id", user.id)
        .eq("mentee_group_id", payload.mentee_group_id)
        .eq("is_recurring", true)
        .single()

    if (existing) {
        const { data, error } = await supabase
            .from("meetings")
            .update({
                title: payload.title,
                description: payload.description,
                recurrence_day: payload.recurrence_day,
                recurrence_time: payload.recurrence_time,
            })
            .eq("id", existing.id)
            .select()
            .single()

        if (error) return { success: false, message: error.message }
        return { success: true, meeting: data }
    }

    const { data, error } = await supabase
        .from("meetings")
        .insert({
            mentor_id: user.id,
            mentee_group_id: payload.mentee_group_id,
            title: payload.title,
            description: payload.description,
            recurrence_day: payload.recurrence_day,
            recurrence_time: payload.recurrence_time,
            is_recurring: true,
            status: "scheduled",
            date: new Date().toISOString().split("T")[0],
            time: payload.recurrence_time,
        })
        .select()
        .single()

    if (error) return { success: false, message: error.message }
    return { success: true, meeting: data }
}

export async function setRecurringMeetingForAll(payload: {
    mentee_group_ids: string[]
    title: string
    description: string
    recurrence_day: string
    recurrence_time: string
}) {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: "Not authenticated" }

    const results: { id: string; ok: boolean; meeting?: Record<string, unknown> | null }[] = []

    for (const mentee_group_id of payload.mentee_group_ids) {
        // check if a recurring meeting already exists for this mentee
        const { data: existing } = await supabase
            .from("meetings")
            .select("id")
            .eq("mentor_id", user.id)
            .eq("mentee_group_id", mentee_group_id)
            .eq("is_recurring", true)
            .single()

        if (existing) {
            const { data, error } = await supabase
                .from("meetings")
                .update({
                    title: payload.title,
                    description: payload.description,
                    recurrence_day: payload.recurrence_day,
                    recurrence_time: payload.recurrence_time,
                    time: payload.recurrence_time,
                })
                .eq("id", existing.id)
                .select()
                .single()
            results.push({ id: mentee_group_id, ok: !error, meeting: data })
        } else {
            const { data, error } = await supabase
                .from("meetings")
                .insert({
                    mentor_id: user.id,
                    mentee_group_id,
                    title: payload.title,
                    description: payload.description,
                    recurrence_day: payload.recurrence_day,
                    recurrence_time: payload.recurrence_time,
                    is_recurring: true,
                    status: "scheduled",
                    date: new Date().toISOString().split("T")[0],
                    time: payload.recurrence_time,
                })
                .select()
                .single()
            results.push({ id: mentee_group_id, ok: !error, meeting: data })
        }
    }

    const allOk = results.every(r => r.ok)
    return { success: allOk, results }
}

export async function getMeetingForMentee() {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, data: null }

    const { data, error } = await supabase
        .from("meetings")
        .select(`
            *,
            mentor:mentor_id (
                id,
                first_name,
                last_name,
                email
            )
        `)
        .eq("mentee_group_id", user.id)
        .eq("is_recurring", true)
        .maybeSingle()

    if (error) return { success: false, data: null }
    return { success: true, data }
}

export async function updateMeetingStatus(
    meetingId: string,
    status: "scheduled" | "completed" | "cancelled"
) {
    const supabase = await getSupabaseClient()
    const { error } = await supabase
        .from("meetings")
        .update({ status })
        .eq("id", meetingId)

    if (error) return { success: false }
    return { success: true }
}

export async function updateMeetingNotes(meetingId: string, notes: string) {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: "Not authenticated" }

    const { error } = await supabase
        .from("meetings")
        .update({ notes })
        .eq("id", meetingId)
        .eq("mentor_id", user.id)

    if (error) return { success: false, message: error.message }
    return { success: true }
}
