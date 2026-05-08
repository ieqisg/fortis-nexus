// app/lib/actions/authActions.ts
"use server"

import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getUserRole(userId: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    )

    const [{ data: menteeData }, { data: mentorData }, { data: adminData }] = await Promise.all([
        supabase.from("MENTEE_GROUPS").select("role").eq("id", userId).maybeSingle(),
        supabase.from("mentor").select("role").eq("id", userId).maybeSingle(),
        supabase.from("admin").select("role").eq("id", userId).maybeSingle()
    ])

    const role = menteeData?.role || mentorData?.role || adminData?.role
    return { role }
}

export async function checkEmailAvailable(email: string) {
    const [{ data: menteeData }, { data: mentorData }] = await Promise.all([
        adminSupabase.from("MENTEE_GROUPS").select("id").ilike("email", email.trim()).maybeSingle(),
        adminSupabase.from("mentor").select("id").ilike("email", email.trim()).maybeSingle(),
    ])
    if (menteeData || mentorData) return { available: false, message: "An account with this email already exists." }
    return { available: true }
}

export async function checkGroupNameAvailable(groupName: string) {
    const { data } = await adminSupabase
        .from("MENTEE_GROUPS")
        .select("id")
        .ilike("group_name", groupName.trim())
        .maybeSingle()
    if (data) return { available: false, message: "A group with this name already exists." }
    return { available: true }
}

export async function getEmailByGroupName(groupName: string) {
    const { data, error } = await adminSupabase
        .from("MENTEE_GROUPS")
        .select("email")
        .ilike("group_name", groupName.trim())
        .maybeSingle()

    if (error || !data?.email) return { success: false, message: "Group not found. Check your group name and try again." }

    return { success: true, email: data.email }
}
