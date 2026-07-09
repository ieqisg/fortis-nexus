import { beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "fs"
import path from "path"
import { createMentorProfile } from "@/lib/actions/mentorActions"

const mocks = vi.hoisted(() => ({
    deleteCookie: vi.fn(),
    getSupabaseClient: vi.fn(),
}))

vi.mock("@/app/config/getSupabaseClient", () => ({
    getSupabaseClient: mocks.getSupabaseClient,
}))

vi.mock("next/headers", () => ({
    cookies: vi.fn(async () => ({ delete: mocks.deleteCookie })),
}))

const basePayload = {
    first_name: "Ada",
    last_name: "Lovelace",
    technical_skills: ["Python"],
    self_description: "Research mentor for computing systems.",
    forte: ["Machine Learning"],
    mentor_capacity: 2,
    available_days: ["Tuesday"],
    time_slot: ["Tuesday:7:00-8:00"],
    role: "mentor",
    dpa_consent_accepted: true,
} satisfies Parameters<typeof createMentorProfile>[0]

function makeSupabaseMock(options: {
    user?: { id: string } | null
    updateError?: { message: string } | null
} = {}) {
    const update = vi.fn(() => ({ eq }))
    const eq = vi.fn(async () => ({ error: options.updateError ?? null }))
    const from = vi.fn(() => ({ update }))
    const supabase = {
        auth: {
            getUser: vi.fn(async () => ({
                data: { user: options.user === undefined ? { id: "mentor-1" } : options.user },
            })),
        },
        from,
    }

    mocks.getSupabaseClient.mockResolvedValue(supabase)

    return { supabase, from, update, eq }
}

describe("createMentorProfile DPA consent", () => {
    beforeEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    it("returns an authentication error when there is no signed-in mentor", async () => {
        const { from } = makeSupabaseMock({ user: null })

        const result = await createMentorProfile(basePayload)

        expect(result).toEqual({ success: false, message: "Not authenticated" })
        expect(from).not.toHaveBeenCalled()
        expect(mocks.deleteCookie).not.toHaveBeenCalled()
    })

    it("rejects profile completion when DPA consent is missing", async () => {
        const { from } = makeSupabaseMock()
        const payload = { ...basePayload, dpa_consent_accepted: undefined }

        const result = await createMentorProfile(payload)

        expect(result.success).toBe(false)
        expect(result.message).toContain("DPA consent is required")
        expect(from).not.toHaveBeenCalled()
        expect(mocks.deleteCookie).not.toHaveBeenCalled()
    })

    it("rejects profile completion when DPA consent is false", async () => {
        const { from } = makeSupabaseMock()

        const result = await createMentorProfile({
            ...basePayload,
            dpa_consent_accepted: false,
        })

        expect(result.success).toBe(false)
        expect(result.message).toContain("DPA consent is required")
        expect(from).not.toHaveBeenCalled()
        expect(mocks.deleteCookie).not.toHaveBeenCalled()
    })

    it("stores accepted consent, timestamp, profile completion, and inferred communication preference", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-06-29T01:02:03.000Z"))
        const { from, update, eq } = makeSupabaseMock()

        const result = await createMentorProfile(basePayload)

        expect(result).toEqual({ success: true })
        expect(from).toHaveBeenCalledWith("mentor")
        expect(update).toHaveBeenCalledWith(
            expect.objectContaining({
                dpa_consent_accepted: true,
                dpa_consent_at: "2026-06-29T01:02:03.000Z",
                profile_completed: true,
                communication_preference: "ONLINE_MEETING",
            })
        )
        expect(eq).toHaveBeenCalledWith("id", "mentor-1")
        expect(mocks.deleteCookie).toHaveBeenCalledWith("x-role-cache")
    })

    it("returns a failure message when the mentor update fails", async () => {
        makeSupabaseMock({ updateError: { message: "database error" } })

        const result = await createMentorProfile(basePayload)

        expect(result).toEqual({
            success: false,
            message: "Failed to create profile, signup has been rolled back.",
        })
        expect(mocks.deleteCookie).not.toHaveBeenCalled()
    })
})

describe("mentor DPA consent migration", () => {
    it("adds consent acceptance and timestamp columns to mentor", () => {
        const migration = readFileSync(
            path.join(process.cwd(), "supabase/migrations/20260628_mentor_dpa_consent.sql"),
            "utf8"
        )

        expect(migration).toContain("ADD COLUMN IF NOT EXISTS dpa_consent_accepted boolean NOT NULL DEFAULT false")
        expect(migration).toContain("ADD COLUMN IF NOT EXISTS dpa_consent_at timestamptz")
    })
})
