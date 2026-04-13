// lib/actions/menteeActions.ts
"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { MenteeGroupInsert } from "@/app/types/modelTypes"

export async function createMenteeProfile(payload: MenteeGroupInsert) {
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
