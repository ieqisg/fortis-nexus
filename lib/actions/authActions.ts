// app/lib/actions/authActions.ts
"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

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
