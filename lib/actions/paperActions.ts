"use server"

import { createClient } from "@supabase/supabase-js"
import { getSupabaseClient } from "@/app/config/getSupabaseClient"
import type { Paper, PaperComment } from "@/types/mentorTypes"

const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function submitPaper(formData: FormData) {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: "Not authenticated" }

    const title = formData.get("title") as string
    const file = formData.get("file") as File | null

    if (!title?.trim()) return { success: false, message: "Title is required" }

    // Get mentor_id from matches
    const { data: match } = await supabase
        .from("matches")
        .select("mentor_id")
        .eq("mentee_group_id", user.id)
        .maybeSingle()

    if (!match?.mentor_id) return { success: false, message: "No mentor assigned yet" }

    // Enforce single-paper-at-a-time: block if a pending paper exists
    const { data: existing } = await supabase
        .from("papers")
        .select("id, status, file_path")
        .eq("mentee_group_id", user.id)
        .order("submitted_at", { ascending: false })

    const pendingPaper = existing?.find(p => p.status === "pending")
    if (pendingPaper) {
        return { success: false, message: "You have a paper awaiting review. Submit a new one after your mentor reviews it." }
    }

    // Delete previously reviewed paper(s) before inserting the new one
    const reviewedPapers = existing?.filter(p => p.status === "reviewed") ?? []
    await Promise.all(reviewedPapers.map(old => Promise.all([
        old.file_path ? adminSupabase.storage.from("papers").remove([old.file_path]) : Promise.resolve(),
        supabase.from("papers").delete().eq("id", old.id),
    ])))

    let file_path: string | null = null
    let file_name: string | null = null

    if (file && file.size > 0) {
        const ext = file.name.split(".").pop()
        const storagePath = `${user.id}/${Date.now()}.${ext}`
        const arrayBuffer = await file.arrayBuffer()
        const { error: uploadError } = await adminSupabase.storage
            .from("papers")
            .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

        if (uploadError) return { success: false, message: uploadError.message }
        file_path = storagePath
        file_name = file.name
    }

    const { data, error } = await supabase
        .from("papers")
        .insert({
            mentee_group_id: user.id,
            mentor_id: match.mentor_id,
            title: title.trim(),
            file_name,
            file_path,
            status: "pending",
        })
        .select()
        .single()

    if (error) return { success: false, message: error.message }
    return { success: true, paper: data as Paper }
}

export async function getMyPapers() {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, data: [] }

    const { data, error } = await supabase
        .from("papers")
        .select(`
            id, title, status, submitted_at, file_name, file_path, mentee_group_id, mentor_id,
            paper_comments(id, comment, created_at, paper_id, mentor_id)
        `)
        .eq("mentee_group_id", user.id)
        .order("submitted_at", { ascending: false })

    if (error) return { success: false, data: [] }
    return { success: true, data: data as Paper[] }
}

export async function getMenteesPapers() {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, data: [] }

    const { data, error } = await supabase
        .from("papers")
        .select(`
            id, title, status, submitted_at, file_name, file_path, mentee_group_id, mentor_id,
            paper_comments(id, comment, created_at, paper_id, mentor_id),
            mentee_group:mentee_group_id (group_name)
        `)
        .eq("mentor_id", user.id)
        .order("submitted_at", { ascending: false })

    if (error) {
        console.error("getMenteesPapers error:", error.message)
        return { success: false, data: [] }
    }
    return { success: true, data: data as unknown as Paper[] }
}

export async function addComment(paperId: string, comment: string) {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: "Not authenticated" }

    const { data: commentData, error: commentError } = await supabase
        .from("paper_comments")
        .insert({ paper_id: paperId, mentor_id: user.id, comment })
        .select()
        .single()

    if (commentError) return { success: false, message: commentError.message }

    const { error: statusError } = await supabase
        .from("papers")
        .update({ status: "reviewed" })
        .eq("id", paperId)

    if (statusError) return { success: false, message: statusError.message }

    return { success: true, comment: commentData as PaperComment }
}

export async function getPaperDownloadUrl(filePath: string) {
    const { data, error } = await adminSupabase.storage
        .from("papers")
        .createSignedUrl(filePath, 3600)

    if (error || !data) return { success: false, url: null }
    return { success: true, url: data.signedUrl }
}
