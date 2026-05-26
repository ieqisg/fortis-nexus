"use server"

import { createClient } from "@supabase/supabase-js"
import type { PublishedPaper, PrevMentoredThesis } from "@/types/mentorTypes"

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

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getAllUserData() {
    const [{ data: mentors }, { data: mentee }] = await Promise.all([
        supabase
            .from("mentor")
            .select(`
                id, first_name, last_name, email, mentor_capacity, is_admin,
                matches(
                    status, compatibility_score, matched_keywords,
                    mentee:matches_mentee_group_id_fkey(id, group_name, research_title)
                )
            `),
        supabase
            .from("MENTEE_GROUPS")
            .select(`
                id, group_name, email, research_title, group_members,
                matches(
                    status, compatibility_score,
                    mentor:matches_mentor_id_fkey(first_name, last_name)
                )
            `),
    ])

    return { success: true, data: { mentee, mentors } }
}

export async function getMentorDetail(id: string) {
    const { data, error } = await supabase
        .from("mentor")
        .select("technical_skills, forte, self_description, published_papers, experience, available_days, time_slot, communication_preference, prev_mentored_thesis, profile_completed, orcid, ieee_id")
        .eq("id", id)
        .maybeSingle()

    if (error) {
        console.error("[getMentorDetail] query failed:", error.message)
        return { success: false as const, message: error.message }
    }

    return { success: true as const, data }
}

export async function getMenteeDetail(id: string) {
    const { data, error } = await supabase
        .from("MENTEE_GROUPS")
        .select("research_description, mentor_preference, time_slot, available_days, communication_preference, group_members")
        .eq("id", id)
        .maybeSingle()
    if (error) return { success: false as const, message: error.message }
    return { success: true as const, data }
}

export async function overrideMentorCapacity(mentorId: string, newCapacity: number) {
    const { error } = await supabase
        .from("mentor")
        .update({ mentor_capacity: newCapacity })
        .eq("id", mentorId)

    if (error) return { success: false, message: error.message }
    return { success: true }
}

export async function getMenteeCount() {
    const { count, error } = await supabase
        .from("MENTEE_GROUPS")
        .select("id", { count: "exact", head: true })

    if (error) return { success: false, count: 0 }
    return { success: true, count: count ?? 0 }
}

export async function adminEditMentor(mentorId: string, payload: {
    first_name?: string
    last_name?: string
    email?: string
    mentor_capacity?: number
    experience?: number
    self_description?: string
    technical_skills?: string[]
    forte?: string[]
    available_days?: string[]
    time_slot?: string[]
    prev_mentored_thesis?: PrevMentoredThesis[]
    published_papers?: PublishedPaper[]
    profile_completed?: boolean
    orcid?: string | null
    ieee_id?: string | null
}) {
    const { orcid, ieee_id, ...rest } = payload
    const finalPayload: Record<string, unknown> = {
        ...rest,
        orcid: orcid ?? null,
        ieee_id: ieee_id ?? null,
    }
    if (payload.available_days?.length) {
        finalPayload.communication_preference = inferCommunicationPreference(payload.available_days);
    }
    const { error } = await supabase.from("mentor").update(finalPayload).eq("id", mentorId)
    if (error) return { success: false, message: error.message }
    return { success: true }
}

export async function adminEditMentee(menteeId: string, payload: {
    group_name?: string
    research_title?: string
    email?: string
    research_description?: string
    mentor_preference?: string
    available_days?: string[]
    time_slot?: string[]
    group_members?: string[]
}) {
    const finalPayload: Record<string, unknown> = { ...payload }
    if (payload.available_days?.length) {
        finalPayload.communication_preference = inferCommunicationPreference(payload.available_days);
    }
    const { error } = await supabase.from("MENTEE_GROUPS").update(finalPayload).eq("id", menteeId)
    if (error) return { success: false, message: error.message }
    return { success: true }
}

export async function adminDeleteUser(userId: string, userType: "mentor" | "mentee") {
    const table = userType === "mentor" ? "mentor" : "MENTEE_GROUPS"
    const { error } = await supabase.from(table).delete().eq("id", userId)
    if (error) return { success: false, message: error.message }
    return { success: true }
}

export async function adminUpdateMentorPassword(mentorId: string, newPassword: string) {
    const { error } = await supabase.auth.admin.updateUserById(mentorId, { password: newPassword })
    if (error) return { success: false, message: error.message }
    return { success: true }
}

export async function adminUpdateMentorEmail(mentorId: string, newEmail: string) {
    const { error } = await supabase.auth.admin.updateUserById(mentorId, {
        email: newEmail,
        email_confirm: true,
    })
    if (error && !error.message.toLowerCase().includes("user not found")) {
        return { success: false, message: error.message }
    }
    return { success: true }
}

export async function setMentorAdminRole(mentorId: string, isAdmin: boolean) {
    const { error } = await supabase.from("mentor").update({ is_admin: isAdmin }).eq("id", mentorId)
    if (error) return { success: false, message: error.message }
    return { success: true }
}

export async function rollbackMatches() {
    const { error } = await supabase.from("matches").delete().not("id", "is", null)
    if (error) return { success: false, message: error.message }
    const { error: logsError } = await supabase.from("algorithm_logs").delete().not("id", "is", null)
    if (logsError) return { success: false, message: logsError.message }
    return { success: true }
}

export async function adminCreateMentor(payload: {
    email: string
    password: string
    first_name: string
    last_name: string
}) {
    const { data, error: authError } = await supabase.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
    })
    if (authError || !data.user) return { success: false, message: authError?.message ?? "Failed to create auth user" }

    const { error } = await supabase.from("mentor").insert({
        id: data.user.id,
        email: payload.email,
        first_name: payload.first_name,
        last_name: payload.last_name,
        role: "mentor",
        profile_completed: false,
    })
    if (error) {
        await supabase.auth.admin.deleteUser(data.user.id)
        return { success: false, message: error.message }
    }
    return { success: true }
}

export async function adminCreateMentee(payload: {
    email: string
    password: string
    group_name: string
    research_title: string
    research_description: string
    mentor_preference: string
    group_members: string[]
}) {
    const { data, error: authError } = await supabase.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
    })
    if (authError || !data.user) return { success: false, message: authError?.message ?? "Failed to create auth user" }

    const { error } = await supabase.from("MENTEE_GROUPS").insert({
        id: data.user.id,
        email: payload.email,
        group_name: payload.group_name,
        research_title: payload.research_title,
        research_description: payload.research_description,
        mentor_preference: payload.mentor_preference,
        role: "mentee",
        available_days: [],
        time_slot: [],
        group_members: payload.group_members,
    })
    if (error) {
        await supabase.auth.admin.deleteUser(data.user.id)
        return { success: false, message: error.message }
    }
    return { success: true }
}

export async function cleanupOrphanedMentees() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (error || !users) return { success: false, deleted: 0 }

    const [{ data: menteeIds }, { data: mentorIds }, { data: adminIds }] = await Promise.all([
        supabase.from("MENTEE_GROUPS").select("id"),
        supabase.from("mentor").select("id"),
        supabase.from("admin").select("id"),
    ])

    const knownIds = new Set([
        ...(menteeIds ?? []).map(r => r.id),
        ...(mentorIds ?? []).map(r => r.id),
        ...(adminIds ?? []).map(r => r.id),
    ])

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const orphans = users.filter(u =>
        !knownIds.has(u.id) && new Date(u.created_at) < cutoff
    )

    await Promise.all(orphans.map(u => supabase.auth.admin.deleteUser(u.id)))

    return { success: true, deleted: orphans.length }
}

export async function getLatestAlgorithmLog() {
    const { data, error } = await supabase
        .from("algorithm_logs")
        .select("log_data, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

    if (error || !data) return { success: false, log: null }
    return { success: true, log: data.log_data }
}

export async function getMentorCapacityStats() {
    const { data, error } = await supabase
        .from("mentor")
        .select("mentor_capacity")

    if (error) return { success: false, totalMentors: 0, mentorsWithCapacity: 0, totalCapacitySet: 0 }

    const totalMentors = data.length
    const withCapacity = data.filter(m => m.mentor_capacity !== null && m.mentor_capacity > 0)
    const totalCapacitySet = withCapacity.reduce((sum, m) => sum + (m.mentor_capacity ?? 0), 0)

    return {
        success: true,
        totalMentors,
        mentorsWithCapacity: withCapacity.length,
        totalCapacitySet,
    }
}

export async function fetchPapersByORCID(orcid: string) {
    const orcidRes = await fetch(`https://pub.orcid.org/v3.0/${orcid}/works`, {
        headers: { Accept: "application/json" },
    })
    if (!orcidRes.ok) return { success: false as const, message: "ORCID profile not found or inaccessible" }

    const orcidData = await orcidRes.json()
    const groups: any[] = orcidData.group ?? []
    const papers: PublishedPaper[] = []

    for (const group of groups) {
        const summary = group["work-summary"]?.[0]
        if (!summary) continue

        const title: string = summary.title?.title?.value
        const year: string = summary["publication-date"]?.year?.value
        const doi: string | undefined = (summary["external-ids"]?.["external-id"] ?? [])
            .find((id: any) => id["external-id-type"] === "doi")?.["external-id-value"]

        if (!title || !year) continue

        const url = doi ? `https://doi.org/${doi}` : undefined
        let authors: string[] | undefined

        if (doi) {
            try {
                const crRes = await fetch(
                    `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
                    { headers: { "User-Agent": "FortisNexus/1.0 (mailto:admin@fortisnexus.app)" } }
                )
                if (crRes.ok) {
                    const crData = await crRes.json()
                    const authorList = (crData.message?.author ?? []).map((a: any) =>
                        [a.given, a.family].filter(Boolean).join(" ")
                    )
                    if (authorList.length > 0) authors = authorList
                }
            } catch { /* skip CrossRef if unavailable */ }
        }

        papers.push({ title, year, url, authors })
    }

    return { success: true as const, papers }
}

export async function fetchPapersByIEEE(ieeeInput: string) {
    // Accept either a full URL (https://ieeexplore.ieee.org/author/12345) or just the numeric ID
    const match = ieeeInput.match(/(\d+)\s*$/)
    if (!match) return { success: false as const, message: "Invalid IEEE Author ID or URL" }
    const ieeeId = match[1]

    let res: Response
    try {
        res = await fetch("https://ieeexplore.ieee.org/rest/search", {
            method: "POST",
            // cache: no-store bypasses Next.js's extended fetch caching layer
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                // sec-fetch-mode: cors is what IEEE Xplore checks to verify the request
                // looks like a legitimate browser CORS call
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "sec-fetch-dest": "empty",
                Referer: `https://ieeexplore.ieee.org/author/${ieeeId}`,
                Origin: "https://ieeexplore.ieee.org",
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            body: JSON.stringify({
                newsearch: true,
                queryText: `("Author Ids":${ieeeId})`,
                highlight: true,
                returnFacets: ["ALL"],
                returnType: "SEARCH",
                matchPubs: true,
            }),
        })
    } catch (err: any) {
        return { success: false as const, message: `Could not reach IEEE Xplore: ${err?.message ?? "network error"}` }
    }

    if (!res.ok) return { success: false as const, message: `IEEE Xplore returned ${res.status} — author not found or access denied` }

    let body: any
    try { body = await res.json() } catch {
        return { success: false as const, message: "Unexpected response from IEEE Xplore" }
    }

    const records: any[] = body.records ?? []
    if (records.length === 0) return { success: false as const, message: "No papers found for this IEEE Author ID" }

    const papers: PublishedPaper[] = records.map((a: any) => {
        const doi = a.doi
        const url = doi
            ? `https://doi.org/${doi}`
            : a.htmlLink
                ? `https://ieeexplore.ieee.org${a.htmlLink}`
                : undefined
        const authors = Array.isArray(a.authors)
            ? a.authors.map((au: any) => au.preferredName ?? au.normalizedName).filter(Boolean)
            : undefined
        return {
            title: a.articleTitle ?? "Untitled",
            year: String(a.publicationYear ?? ""),
            url,
            authors,
        }
    })

    return { success: true as const, papers }
}
