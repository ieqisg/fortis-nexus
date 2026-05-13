// app/lib/actions/authActions.ts
"use server"

import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies, headers } from "next/headers"
import { rateLimit } from "@/lib/rateLimit"

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
        supabase.from("mentor").select("role, is_admin").eq("id", userId).maybeSingle(),
        supabase.from("admin").select("role").eq("id", userId).maybeSingle()
    ])

    const role = menteeData?.role || mentorData?.role || adminData?.role
    const is_admin = mentorData?.is_admin === true
    return { role, is_admin }
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

// ─── Rate-limit helpers ───────────────────────────────────────────────────────

function getClientIp(headersList: Awaited<ReturnType<typeof headers>>): string {
    return (
        headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
        headersList.get("x-real-ip") ??
        "unknown"
    )
}

/**
 * Login: 5 attempts per 5 minutes per IP.
 * Returns { allowed, message } — call before every sign-in attempt.
 */
export async function checkLoginRateLimit() {
    const ip = getClientIp(await headers())
    const result = rateLimit(`login:${ip}`, 5, 5 * 60 * 1000)
    if (!result.allowed) {
        const mins = Math.ceil(result.retryAfterMs / 60000)
        return {
            allowed: false,
            message: `Too many login attempts. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`,
        }
    }
    return { allowed: true, message: "" }
}

/**
 * Forgot password: 3 requests per hour per IP.
 * Returns { allowed, message } — call before every reset-email send.
 */
export async function checkResetRateLimit() {
    const ip = getClientIp(await headers())
    const result = rateLimit(`reset:${ip}`, 3, 60 * 60 * 1000)
    if (!result.allowed) {
        const mins = Math.ceil(result.retryAfterMs / 60000)
        return {
            allowed: false,
            message: `Too many reset requests. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`,
        }
    }
    return { allowed: true, message: "" }
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
