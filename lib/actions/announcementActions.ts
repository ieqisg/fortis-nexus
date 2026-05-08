"use server"

import { createClient } from "@supabase/supabase-js"
import { getSupabaseClient } from "@/app/config/getSupabaseClient"

const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type Announcement = {
    id: string
    title: string
    body: string
    target: "all" | "mentor" | "mentee"
    created_at: string
}

export async function getAnnouncements(role: "mentor" | "mentee") {
    const { data, error } = await adminSupabase
        .from("announcements")
        .select("*")
        .in("target", ["all", role])
        .order("created_at", { ascending: false })

    if (error) return { success: false, data: [] as Announcement[] }
    return { success: true, data: (data ?? []) as Announcement[] }
}

export async function createAnnouncement(
    title: string,
    body: string,
    target: "all" | "mentor" | "mentee"
) {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: "Not authenticated" }

    const { data: adminRow } = await adminSupabase
        .from("admin")
        .select("id")
        .eq("id", user.id)
        .maybeSingle()
    if (!adminRow) return { success: false, message: "Not authorized" }

    const { data, error } = await adminSupabase
        .from("announcements")
        .insert({ title: title.trim(), body: body.trim(), target })
        .select()
        .single()

    if (error) return { success: false, message: error.message }
    return { success: true, data: data as Announcement }
}

export async function deleteAnnouncement(id: string) {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: "Not authenticated" }

    const { data: adminRow } = await adminSupabase
        .from("admin")
        .select("id")
        .eq("id", user.id)
        .maybeSingle()
    if (!adminRow) return { success: false, message: "Not authorized" }

    const { error } = await adminSupabase
        .from("announcements")
        .delete()
        .eq("id", id)

    if (error) return { success: false, message: error.message }
    return { success: true }
}
