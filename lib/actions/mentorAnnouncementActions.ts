"use server"

import { createClient } from "@supabase/supabase-js"
import { getSupabaseClient } from "@/app/config/getSupabaseClient"
import type { MentorAnnouncement } from "@/types/mentorTypes"

const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createMentorAnnouncement(title: string, body: string) {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: "Not authenticated" }

    const { data, error } = await adminSupabase
        .from("mentor_announcements")
        .insert({ mentor_id: user.id, title: title.trim(), body: body.trim() })
        .select()
        .single()

    if (error) return { success: false, message: error.message }
    return { success: true, announcement: data as MentorAnnouncement }
}

export async function getMyMentorAnnouncements() {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, data: [] as MentorAnnouncement[] }

    const { data, error } = await adminSupabase
        .from("mentor_announcements")
        .select("*")
        .eq("mentor_id", user.id)
        .order("created_at", { ascending: false })

    if (error) return { success: false, data: [] as MentorAnnouncement[] }
    return { success: true, data: data as MentorAnnouncement[] }
}

export async function getMentorAnnouncements() {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, data: [] as MentorAnnouncement[] }

    // Find the mentee's matched mentor
    const { data: match } = await supabase
        .from("matches")
        .select("mentor_id")
        .eq("mentee_group_id", user.id)
        .maybeSingle()

    if (!match?.mentor_id) return { success: true, data: [] as MentorAnnouncement[] }

    const { data, error } = await adminSupabase
        .from("mentor_announcements")
        .select("*")
        .eq("mentor_id", match.mentor_id)
        .order("created_at", { ascending: false })

    if (error) return { success: false, data: [] as MentorAnnouncement[] }
    return { success: true, data: data as MentorAnnouncement[] }
}

export async function deleteMentorAnnouncement(id: string) {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: "Not authenticated" }

    const { error } = await adminSupabase
        .from("mentor_announcements")
        .delete()
        .eq("id", id)
        .eq("mentor_id", user.id)

    if (error) return { success: false, message: error.message }
    return { success: true }
}
